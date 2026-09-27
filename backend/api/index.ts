import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

const app = express();

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Health is registered before the GraphQL layer loads, so it keeps answering
// (and reports why) even if startup fails.
let startupError: string | null = null;

app.get('/api/health', async (_req, res) => {
  let database = 'not checked';
  try {
    const { prisma } = await import('../src/lib/prisma');
    await prisma.$queryRawUnsafe('SELECT 1');
    database = 'ok';
  } catch (e: any) {
    database = `error: ${e?.message?.split('\n').filter(Boolean).slice(-1)[0] || e}`;
  }
  const healthy = !startupError && database === 'ok' && !!process.env.JWT_SECRET;
  res.status(healthy ? 200 : 500).json({
    status: healthy ? 'ok' : 'error',
    startupError,
    database,
    config: { DATABASE_URL: !!process.env.DATABASE_URL, JWT_SECRET: !!process.env.JWT_SECRET },
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  try {
    const { typeDefs } = await import('../src/graphql/typeDefs');
    const { resolvers } = await import('../src/graphql/resolvers');
    const { buildContext } = await import('../src/lib/context');
    const apollo = new ApolloServer({ typeDefs, resolvers, introspection: true });
    await apollo.start();
    app.use('/api/graphql', expressMiddleware(apollo, {
      context: async ({ req }) => buildContext(req.headers.authorization),
    }));
  } catch (e: any) {
    startupError = e?.stack || String(e);
    console.error('GraphQL startup failed:', e);
    app.use('/api/graphql', (_req, res) => {
      res.status(500).json({ errors: [{ message: `Server startup failed: ${e?.message || e}`, extensions: { code: 'STARTUP_FAILED' } }] });
    });
  }
}

// Start once per cold start; concurrent invocations share the same promise.
const serverPromise = startServer();

export default async function handler(req: any, res: any) {
  await serverPromise;
  app(req, res);
}
