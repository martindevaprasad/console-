import { gql } from 'graphql-tag';
import { prisma } from '../../lib/prisma';
import { Ctx, requirePerm, fail, audit } from '../../lib/context';

export const typeDefs = gql`
  type Customer {
    id: ID!
    name: String!
    phone: String
    email: String
    birthday: DateTime
    notes: String
    tags: [String!]!
    loyaltyPoints: Int!
    totalSpent: Float!
    visitCount: Int!
    lastVisitAt: DateTime
    houseAccount: Boolean!
    balance: Float!
    isActive: Boolean!
    createdAt: DateTime!
    recentOrders: [Order!]!
  }

  type CustomerPage { items: [Customer!]! total: Int! }

  input CustomerInput {
    name: String phone: String email: String birthday: DateTime notes: String tags: [String!] houseAccount: Boolean isActive: Boolean
  }

  type Query {
    customers(search: String, limit: Int, offset: Int): CustomerPage!
    customer(id: ID!): Customer
  }

  type Mutation {
    createCustomer(input: CustomerInput!): Customer!
    updateCustomer(id: ID!, input: CustomerInput!): Customer!
    adjustLoyalty(customerId: ID!, points: Int!, reason: String!): Customer!
  }
`;

const clean = (o: any) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== undefined));

export const resolvers = {
  Query: {
    customers: async (_: any, { search, limit, offset }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'customers.view', 'pos.access');
      const where: any = {
        organizationId: auth.orgId,
        isActive: true,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.customer.findMany({ where, orderBy: [{ lastVisitAt: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }], take: Math.min(limit || 50, 200), skip: offset || 0 }),
        prisma.customer.count({ where }),
      ]);
      return { items, total };
    },

    customer: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'customers.view', 'pos.access');
      return prisma.customer.findFirst({ where: { id, organizationId: auth.orgId } });
    },
  },

  Mutation: {
    createCustomer: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'customers.manage', 'pos.access');
      if (!input.name) fail('Customer name is required');
      if (input.phone) {
        const dupe = await prisma.customer.findFirst({ where: { organizationId: auth.orgId, phone: input.phone, isActive: true } });
        if (dupe) fail(`A customer with this phone already exists (${dupe.name})`);
      }
      const c = await prisma.customer.create({ data: { ...clean(input), name: input.name, organizationId: auth.orgId } as any });
      await audit(auth, 'CREATE', 'Customer', c.id, { name: c.name });
      return c;
    },

    updateCustomer: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'customers.manage');
      const c = await prisma.customer.findFirst({ where: { id, organizationId: auth.orgId } });
      if (!c) fail('Customer not found', 'NOT_FOUND');
      return prisma.customer.update({ where: { id }, data: clean(input) as any });
    },

    adjustLoyalty: async (_: any, { customerId, points, reason }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'customers.manage');
      const c = await prisma.customer.findFirst({ where: { id: customerId, organizationId: auth.orgId } });
      if (!c) fail('Customer not found', 'NOT_FOUND');
      if (c!.loyaltyPoints + points < 0) fail('Points balance cannot go negative');
      const updated = await prisma.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { increment: points } } });
      await audit(auth, 'LOYALTY_ADJUST', 'Customer', customerId, { points, reason });
      return updated;
    },
  },

  Customer: {
    recentOrders: (c: any) => prisma.order.findMany({ where: { customerId: c.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
  },
};
