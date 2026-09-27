import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Resolved per call (not at import) so a missing secret surfaces as a clear API
// error instead of crashing the whole serverless function on cold start.
const getSecret = (): string => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Server misconfigured: JWT_SECRET environment variable is not set');
  }
  return 'nexuspos-secret';
};

export interface JWTPayload {
  userId: string;
  organizationId: string;
  role: string;
  locationId?: string;
  departmentId?: string;
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, getSecret(), { expiresIn: '12h' });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, getSecret()) as JWTPayload;
  } catch {
    return null;
  }
};

export const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      (req as any).user = payload;
    }
  }
  next();
};
