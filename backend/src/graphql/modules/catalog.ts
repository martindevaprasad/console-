import { gql } from 'graphql-tag';
import { prisma } from '../../lib/prisma';
import { Ctx, requireAuth, requirePerm, fail, audit } from '../../lib/context';

export const typeDefs = gql`
  type TaxRate { id: ID! name: String! rate: Float! isDefault: Boolean! isActive: Boolean! }

  type Category {
    id: ID!
    name: String!
    description: String
    color: String
    icon: String
    sortOrder: Int!
    isActive: Boolean!
    productCount: Int!
  }

  type Modifier { id: ID! name: String! price: Float! isDefault: Boolean! isActive: Boolean! sortOrder: Int! groupId: String! }

  type ModifierGroup {
    id: ID!
    name: String!
    minSelect: Int!
    maxSelect: Int!
    isActive: Boolean!
    modifiers: [Modifier!]!
    productIds: [String!]!
  }

  type RecipeLine { id: ID! quantity: Float! stockItemId: String! stockItem: StockItem }

  type Inventory {
    id: ID!
    quantity: Int!
    minStock: Int!
    maxStock: Int
    unit: String
    productId: String!
    locationId: String!
    product: Product
    location: Location
  }

  type Product {
    id: ID!
    name: String!
    description: String
    sku: String
    barcode: String
    price: Float!
    cost: Float
    imageUrl: String
    color: String
    isActive: Boolean!
    trackStock: Boolean!
    isOpenPrice: Boolean!
    prepMinutes: Int
    dietary: [String!]!
    channels: [String!]!
    priceOverrides: JSON!
    sortOrder: Int!
    categoryId: String
    taxRateId: String
    stationId: String
    createdAt: DateTime!
    category: Category
    tax: TaxRate
    station: KitchenStation
    modifierGroups: [ModifierGroup!]!
    recipe: [RecipeLine!]!
    inventory: [Inventory!]!
    recipeCost: Float
  }

  type Discount {
    id: ID!
    name: String!
    code: String
    type: DiscountType!
    scope: DiscountScope!
    value: Float!
    minOrderAmount: Float
    maxDiscount: Float
    categoryId: String
    requiresApproval: Boolean!
    autoApply: Boolean!
    startsAt: DateTime
    endsAt: DateTime
    daysOfWeek: [Int!]!
    startTime: String
    endTime: String
    usageCount: Int!
    isActive: Boolean!
    isCurrentlyValid: Boolean!
  }

  input CategoryInput { name: String description: String color: String icon: String sortOrder: Int isActive: Boolean }

  input ProductInput {
    name: String description: String sku: String barcode: String price: Float cost: Float imageUrl: String color: String
    isActive: Boolean trackStock: Boolean isOpenPrice: Boolean prepMinutes: Int dietary: [String!] channels: [String!]
    priceOverrides: JSON sortOrder: Int categoryId: ID taxRateId: ID stationId: ID modifierGroupIds: [ID!]
  }

  input ModifierInput { id: ID name: String! price: Float isDefault: Boolean isActive: Boolean }
  input ModifierGroupInput { name: String minSelect: Int maxSelect: Int isActive: Boolean modifiers: [ModifierInput!] productIds: [ID!] }

  input TaxRateInput { name: String rate: Float isDefault: Boolean isActive: Boolean }

  input DiscountRuleInput {
    name: String code: String type: DiscountType scope: DiscountScope value: Float minOrderAmount: Float maxDiscount: Float
    categoryId: ID requiresApproval: Boolean autoApply: Boolean startsAt: DateTime endsAt: DateTime daysOfWeek: [Int!]
    startTime: String endTime: String isActive: Boolean
  }

  type Query {
    categories(includeInactive: Boolean): [Category!]!
    products(categoryId: ID, search: String, isActive: Boolean, channel: String): [Product!]!
    product(id: ID!): Product
    modifierGroups: [ModifierGroup!]!
    taxRates: [TaxRate!]!
    discounts(activeOnly: Boolean): [Discount!]!
  }

  type Mutation {
    createCategory(input: CategoryInput!): Category!
    updateCategory(id: ID!, input: CategoryInput!): Category!
    deleteCategory(id: ID!): Boolean!

    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductInput!): Product!
    deleteProduct(id: ID!): Boolean!

    createModifierGroup(input: ModifierGroupInput!): ModifierGroup!
    updateModifierGroup(id: ID!, input: ModifierGroupInput!): ModifierGroup!
    deleteModifierGroup(id: ID!): Boolean!

    createTaxRate(input: TaxRateInput!): TaxRate!
    updateTaxRate(id: ID!, input: TaxRateInput!): TaxRate!
    deleteTaxRate(id: ID!): Boolean!

    createDiscount(input: DiscountRuleInput!): Discount!
    updateDiscount(id: ID!, input: DiscountRuleInput!): Discount!
    deleteDiscount(id: ID!): Boolean!
  }
`;

const clean = (obj: any) => Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== undefined));

/** Whether a promotion is valid right now (date window, weekday, happy-hour window). */
export function discountValidNow(d: any, timezone = 'UTC', now = new Date()): boolean {
  if (!d.isActive) return false;
  if (d.startsAt && now < new Date(d.startsAt)) return false;
  if (d.endsAt && now > new Date(d.endsAt)) return false;
  // Weekday / happy-hour windows are evaluated in the business's own timezone.
  let weekday = now.getUTCDay();
  let hhmm = now.toISOString().slice(11, 16);
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
    weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    hhmm = `${get('hour')}:${get('minute')}`;
  } catch {
    // Unknown timezone → fall back to UTC.
  }
  if (d.daysOfWeek?.length && !d.daysOfWeek.includes(weekday)) return false;
  if (d.startTime && hhmm < d.startTime) return false;
  if (d.endTime && hhmm > d.endTime) return false;
  return true;
}

async function own(model: 'category' | 'product' | 'modifierGroup' | 'taxRate' | 'discount', id: string, orgId: string) {
  const row = await (prisma[model] as any).findFirst({ where: { id, organizationId: orgId } });
  if (!row) fail(`${model} not found`, 'NOT_FOUND');
  return row;
}

async function validateRefs(orgId: string, input: any) {
  if (input.categoryId) await own('category', input.categoryId, orgId);
  if (input.taxRateId) await own('taxRate', input.taxRateId, orgId);
  if (input.stationId) {
    const s = await prisma.kitchenStation.findFirst({ where: { id: input.stationId, location: { organizationId: orgId } } });
    if (!s) fail('Station not found', 'NOT_FOUND');
  }
  if (input.price !== undefined && input.price < 0) fail('Price cannot be negative');
}

async function syncProductGroups(productId: string, groupIds?: string[]) {
  if (!groupIds) return;
  await prisma.productModifierGroup.deleteMany({ where: { productId } });
  if (groupIds.length) {
    await prisma.productModifierGroup.createMany({ data: groupIds.map((groupId, i) => ({ productId, groupId, sortOrder: i })) });
  }
}

async function syncModifiers(groupId: string, modifiers?: any[]) {
  if (!modifiers) return;
  const keepIds = modifiers.filter((m) => m.id).map((m) => m.id);
  await prisma.modifier.deleteMany({ where: { groupId, id: { notIn: keepIds } } });
  for (const [i, m] of modifiers.entries()) {
    const data = { name: m.name, price: m.price ?? 0, isDefault: !!m.isDefault, isActive: m.isActive ?? true, sortOrder: i };
    if (m.id) await prisma.modifier.update({ where: { id: m.id }, data });
    else await prisma.modifier.create({ data: { ...data, groupId } });
  }
}

export const resolvers = {
  Query: {
    categories: async (_: any, { includeInactive }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      return prisma.category.findMany({
        where: { organizationId: auth.orgId, ...(includeInactive ? {} : { isActive: true }) },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    },

    products: async (_: any, { categoryId, search, isActive, channel }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      return prisma.product.findMany({
        where: {
          organizationId: auth.orgId,
          ...(categoryId ? { categoryId } : {}),
          ...(isActive !== undefined && isActive !== null ? { isActive } : {}),
          ...(channel ? { channels: { has: channel } } : {}),
          ...(search ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { barcode: search },
            ],
          } : {}),
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    },

    product: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      return prisma.product.findFirst({ where: { id, organizationId: auth.orgId } });
    },

    modifierGroups: async (_: any, __: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      return prisma.modifierGroup.findMany({ where: { organizationId: auth.orgId }, orderBy: { name: 'asc' } });
    },

    taxRates: async (_: any, __: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      return prisma.taxRate.findMany({ where: { organizationId: auth.orgId }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
    },

    discounts: async (_: any, { activeOnly }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      const [rows, org] = await Promise.all([
        prisma.discount.findMany({ where: { organizationId: auth.orgId }, orderBy: { name: 'asc' } }),
        prisma.organization.findUnique({ where: { id: auth.orgId } }),
      ]);
      return rows
        .map((d) => ({ ...d, _tz: org?.timezone }))
        .filter((d) => !activeOnly || discountValidNow(d, d._tz));
    },
  },

  Mutation: {
    createCategory: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage');
      if (!input.name) fail('Category name is required');
      const c = await prisma.category.create({ data: { ...clean(input), name: input.name, organizationId: auth.orgId } });
      await audit(auth, 'CREATE', 'Category', c.id, { name: c.name });
      return c;
    },
    updateCategory: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage');
      await own('category', id, auth.orgId);
      return prisma.category.update({ where: { id }, data: clean(input) });
    },
    deleteCategory: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage');
      await own('category', id, auth.orgId);
      await prisma.category.update({ where: { id }, data: { isActive: false } });
      await audit(auth, 'DEACTIVATE', 'Category', id);
      return true;
    },

    createProduct: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage');
      if (!input.name || input.price === undefined) fail('Name and price are required');
      await validateRefs(auth.orgId, input);
      const { modifierGroupIds, ...rest } = input;
      let taxRateId = rest.taxRateId;
      if (!taxRateId) {
        taxRateId = (await prisma.taxRate.findFirst({ where: { organizationId: auth.orgId, isDefault: true } }))?.id;
      }
      const product = await prisma.product.create({
        data: { ...clean(rest), name: input.name, price: input.price, taxRateId, organizationId: auth.orgId } as any,
      });
      await syncProductGroups(product.id, modifierGroupIds);
      if (product.trackStock) {
        const locations = await prisma.location.findMany({ where: { organizationId: auth.orgId } });
        await prisma.inventory.createMany({
          data: locations.map((l) => ({ productId: product.id, locationId: l.id, quantity: 0, minStock: 5 })),
          skipDuplicates: true,
        });
      }
      await audit(auth, 'CREATE', 'Product', product.id, { name: product.name, price: product.price });
      return product;
    },

    updateProduct: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage');
      const before = await own('product', id, auth.orgId);
      await validateRefs(auth.orgId, input);
      const { modifierGroupIds, ...rest } = input;
      const data: any = clean(rest);
      for (const k of ['categoryId', 'taxRateId', 'stationId']) if (rest[k] === null) data[k] = null;
      const product = await prisma.product.update({ where: { id }, data });
      await syncProductGroups(id, modifierGroupIds);
      if (product.trackStock) {
        const locations = await prisma.location.findMany({ where: { organizationId: auth.orgId } });
        await prisma.inventory.createMany({
          data: locations.map((l) => ({ productId: id, locationId: l.id, quantity: 0, minStock: 5 })),
          skipDuplicates: true,
        });
      }
      const priceChanged = input.price !== undefined && input.price !== before.price;
      await audit(auth, priceChanged ? 'PRICE_CHANGE' : 'UPDATE', 'Product', id, priceChanged ? { from: before.price, to: input.price } : data);
      return product;
    },

    deleteProduct: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage');
      await own('product', id, auth.orgId);
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      await audit(auth, 'DEACTIVATE', 'Product', id);
      return true;
    },

    createModifierGroup: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage');
      if (!input.name) fail('Group name is required');
      if ((input.minSelect ?? 0) > (input.maxSelect ?? 1)) fail('Min selections cannot exceed max');
      const g = await prisma.modifierGroup.create({
        data: { organizationId: auth.orgId, name: input.name, minSelect: input.minSelect ?? 0, maxSelect: input.maxSelect ?? 1, isActive: input.isActive ?? true },
      });
      await syncModifiers(g.id, input.modifiers || []);
      if (input.productIds) {
        await prisma.productModifierGroup.createMany({ data: input.productIds.map((productId: string) => ({ productId, groupId: g.id })), skipDuplicates: true });
      }
      return g;
    },

    updateModifierGroup: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage');
      await own('modifierGroup', id, auth.orgId);
      const g = await prisma.modifierGroup.update({
        where: { id },
        data: clean({ name: input.name, minSelect: input.minSelect, maxSelect: input.maxSelect, isActive: input.isActive }),
      });
      if (g.minSelect > g.maxSelect) fail('Min selections cannot exceed max');
      await syncModifiers(id, input.modifiers);
      if (input.productIds) {
        await prisma.productModifierGroup.deleteMany({ where: { groupId: id } });
        await prisma.productModifierGroup.createMany({ data: input.productIds.map((productId: string) => ({ productId, groupId: id })), skipDuplicates: true });
      }
      return g;
    },

    deleteModifierGroup: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage');
      await own('modifierGroup', id, auth.orgId);
      await prisma.modifierGroup.delete({ where: { id } });
      return true;
    },

    createTaxRate: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage', 'settings.manage');
      if (!input.name || input.rate === undefined) fail('Name and rate are required');
      if (input.isDefault) await prisma.taxRate.updateMany({ where: { organizationId: auth.orgId }, data: { isDefault: false } });
      const t = await prisma.taxRate.create({ data: { ...clean(input), name: input.name, rate: input.rate, organizationId: auth.orgId } });
      await audit(auth, 'CREATE', 'TaxRate', t.id, input);
      return t;
    },

    updateTaxRate: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage', 'settings.manage');
      await own('taxRate', id, auth.orgId);
      if (input.isDefault) await prisma.taxRate.updateMany({ where: { organizationId: auth.orgId }, data: { isDefault: false } });
      const t = await prisma.taxRate.update({ where: { id }, data: clean(input) });
      if (t.isDefault) await prisma.organization.update({ where: { id: auth.orgId }, data: { taxRate: t.rate } });
      await audit(auth, 'UPDATE', 'TaxRate', id, input);
      return t;
    },

    deleteTaxRate: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'menu.manage', 'settings.manage');
      await own('taxRate', id, auth.orgId);
      await prisma.product.updateMany({ where: { taxRateId: id }, data: { taxRateId: null } });
      await prisma.taxRate.delete({ where: { id } });
      return true;
    },

    createDiscount: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'promotions.manage');
      if (!input.name || input.value === undefined) fail('Name and value are required');
      if (input.type === 'PERCENT' && (input.value <= 0 || input.value > 100)) fail('Percent must be between 0 and 100');
      const d = await prisma.discount.create({ data: { ...clean(input), name: input.name, value: input.value, organizationId: auth.orgId } as any });
      await audit(auth, 'CREATE', 'Discount', d.id, input);
      return d;
    },

    updateDiscount: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'promotions.manage');
      await own('discount', id, auth.orgId);
      const d = await prisma.discount.update({ where: { id }, data: clean(input) as any });
      await audit(auth, 'UPDATE', 'Discount', id, input);
      return d;
    },

    deleteDiscount: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'promotions.manage');
      await own('discount', id, auth.orgId);
      await prisma.discount.delete({ where: { id } });
      return true;
    },
  },

  Category: {
    productCount: (c: any) => prisma.product.count({ where: { categoryId: c.id, isActive: true } }),
  },

  ModifierGroup: {
    modifiers: (g: any) => prisma.modifier.findMany({ where: { groupId: g.id }, orderBy: { sortOrder: 'asc' } }),
    productIds: async (g: any) => (await prisma.productModifierGroup.findMany({ where: { groupId: g.id } })).map((p) => p.productId),
  },

  RecipeLine: {
    stockItem: (r: any) => prisma.stockItem.findUnique({ where: { id: r.stockItemId } }),
  },

  Inventory: {
    product: (i: any) => prisma.product.findUnique({ where: { id: i.productId } }),
    location: (i: any) => prisma.location.findUnique({ where: { id: i.locationId } }),
  },

  Product: {
    category: (p: any) => (p.categoryId ? prisma.category.findUnique({ where: { id: p.categoryId } }) : null),
    tax: (p: any) => (p.taxRateId ? prisma.taxRate.findUnique({ where: { id: p.taxRateId } }) : null),
    station: (p: any) => (p.stationId ? prisma.kitchenStation.findUnique({ where: { id: p.stationId } }) : null),
    modifierGroups: async (p: any) => {
      const links = await prisma.productModifierGroup.findMany({
        where: { productId: p.id, group: { isActive: true } },
        include: { group: true },
        orderBy: { sortOrder: 'asc' },
      });
      return links.map((l) => l.group);
    },
    recipe: (p: any) => prisma.recipeLine.findMany({ where: { productId: p.id } }),
    inventory: (p: any) => prisma.inventory.findMany({ where: { productId: p.id } }),
    priceOverrides: (p: any) => p.priceOverrides || {},
    recipeCost: async (p: any) => {
      const lines = await prisma.recipeLine.findMany({ where: { productId: p.id }, include: { stockItem: true } });
      if (!lines.length) return null;
      return Math.round(lines.reduce((s, l) => s + l.quantity * l.stockItem.costPerUnit, 0) * 100) / 100;
    },
  },

  Discount: {
    isCurrentlyValid: (d: any) => discountValidNow(d, d._tz),
  },
};
