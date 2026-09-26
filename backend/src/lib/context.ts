import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import { prisma } from './prisma';
import { verifyToken } from '../middleware/auth';
import { ALL_PERMISSIONS, permissionsFor } from './permissions';
import { resolveSettings, OrgSettings } from './templates';

export interface AuthInfo {
  userId: string;
  orgId: string;
  role: string;
  name: string;
  locationId?: string | null;
  permissions: Set<string>;
}

export interface Ctx {
  token: string | null;
  _auth?: Promise<AuthInfo | null>;
}

export const buildContext = (authHeader?: string): Ctx => ({
  token: authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null,
});

export const fail = (message: string, code = 'BAD_REQUEST'): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

async function loadAuth(ctx: Ctx): Promise<AuthInfo | null> {
  if (!ctx.token) return null;
  const payload = verifyToken(ctx.token);
  if (!payload) return null;
  // Re-read the user on every request so deactivation / role changes apply immediately.
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { customRole: true },
  });
  if (!user || !user.isActive) return null;
  const perms = user.role === 'OWNER'
    ? ALL_PERMISSIONS
    : permissionsFor(user.role, user.customRole?.permissions);
  return {
    userId: user.id,
    orgId: user.organizationId,
    role: user.role,
    name: user.name,
    locationId: user.locationId,
    permissions: new Set(perms),
  };
}

export async function requireAuth(ctx: Ctx): Promise<AuthInfo> {
  if (!ctx._auth) ctx._auth = loadAuth(ctx);
  const auth = await ctx._auth;
  if (!auth) fail('Authentication required', 'UNAUTHENTICATED');
  return auth as AuthInfo;
}

export async function requirePerm(ctx: Ctx, ...perms: string[]): Promise<AuthInfo> {
  const auth = await requireAuth(ctx);
  if (!perms.some((p) => auth.permissions.has(p))) {
    fail(`You do not have permission to perform this action (${perms.join(' / ')})`, 'FORBIDDEN');
  }
  return auth;
}

export const can = (auth: AuthInfo, perm: string) => auth.permissions.has(perm);

/**
 * Manager override: when the current user lacks `perm`, a manager can approve
 * by entering their PIN on the terminal.
 */
export async function requirePermOrApproval(ctx: Ctx, perm: string, approverPin?: string | null): Promise<{ auth: AuthInfo; approvedBy?: string }> {
  const auth = await requireAuth(ctx);
  if (auth.permissions.has(perm)) return { auth };
  if (!approverPin) fail(`Manager approval required (${perm})`, 'APPROVAL_REQUIRED');
  const approver = await findUserByPin(auth.orgId, approverPin as string);
  if (!approver) fail('Invalid approval PIN', 'FORBIDDEN');
  const perms = approver!.role === 'OWNER' ? ALL_PERMISSIONS : permissionsFor(approver!.role, approver!.customRole?.permissions);
  if (!perms.includes(perm)) fail('Approver lacks the required permission', 'FORBIDDEN');
  return { auth, approvedBy: approver!.name };
}

export async function findUserByPin(orgId: string, pin: string) {
  const users = await prisma.user.findMany({
    where: { organizationId: orgId, isActive: true, pinHash: { not: null } },
    include: { customRole: true },
  });
  for (const u of users) {
    if (u.pinHash && (await bcrypt.compare(pin, u.pinHash))) return u;
  }
  return null;
}

/** Ensures a location belongs to the caller's organization. */
export async function assertLocation(auth: AuthInfo, locationId: string) {
  const loc = await prisma.location.findFirst({ where: { id: locationId, organizationId: auth.orgId } });
  if (!loc) fail('Location not found', 'NOT_FOUND');
  return loc!;
}

/** Resolves the effective location: explicit arg, else user's home location, else first active location. */
export async function resolveLocationId(auth: AuthInfo, locationId?: string | null): Promise<string> {
  if (locationId) {
    await assertLocation(auth, locationId);
    return locationId;
  }
  if (auth.locationId) return auth.locationId;
  const first = await prisma.location.findFirst({ where: { organizationId: auth.orgId, isActive: true }, orderBy: { createdAt: 'asc' } });
  if (!first) fail('No location configured. Add a location first.', 'NOT_FOUND');
  return first!.id;
}

export async function orgSettings(orgId: string): Promise<{ org: any; settings: OrgSettings }> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) fail('Organization not found', 'NOT_FOUND');
  return { org, settings: resolveSettings(org!.settings) };
}

export async function audit(auth: AuthInfo, action: string, entity: string, entityId?: string | null, meta?: any) {
  try {
    await prisma.auditLog.create({
      data: { organizationId: auth.orgId, userId: auth.userId, userName: auth.name, action, entity, entityId: entityId || null, meta: meta ?? undefined },
    });
  } catch {
    // Auditing must never break the business operation.
  }
}

/** Atomic counter (Postgres upsert) used for ticket / PO numbers. */
export async function nextSequence(key: string): Promise<number> {
  const seq = await prisma.sequence.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return seq.value;
}
