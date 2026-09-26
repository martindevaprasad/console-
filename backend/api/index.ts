import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from '../src/graphql/typeDefs';
import { resolvers } from '../src/graphql/resolvers';
import { buildContext } from '../src/lib/context';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allows all origins during cross-domain API calls
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

let serverStarted = false;
let serverPromise: Promise<void> | null = null;

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});

async function startServer() {
  if (!serverStarted) {
    await apolloServer.start();
    app.use(
      '/api/graphql',
      expressMiddleware(apolloServer, {
        context: async ({ req }) => buildContext(req.headers.authorization),
      })
    );
    app.get('/api/health', (_, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    serverStarted = true;
  }
}

// Ensure server starts only once (handles concurrent cold-start invocations)
serverPromise = startServer();

export default async function handler(req: any, res: any) {
  await serverPromise;
  app(req, res);
}
