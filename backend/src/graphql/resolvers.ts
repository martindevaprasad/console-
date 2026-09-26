import { mergeResolvers } from '@graphql-tools/merge';
import { modules } from './typeDefs';

export const resolvers = mergeResolvers(modules.map((m) => m.resolvers as any));
