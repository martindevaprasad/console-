import { gql } from 'graphql-tag';
import { prisma } from '../../lib/prisma';
import { Ctx, AuthInfo, requirePerm, fail, audit, assertLocation, nextSequence } from '../../lib/context';
import { round2 } from '../../lib/pricing';

export const typeDefs = gql`
  type StockItem {
    id: ID!
    name: String!
    sku: String
    unit: String!
    category: String
    costPerUnit: Float!
    isActive: Boolean!
    supplierId: String
    supplier: Supplier
    level(locationId: ID!): StockLevel
    levels: [StockLevel!]!
  }

  type StockLevel { id: ID! quantity: Float! parLevel: Float! reorderPoint: Float! stockItemId: String! locationId: String! }

  type StockMovement {
    id: ID!
    type: StockMovementType!
    quantity: Float!
    unitCost: Float
    reason: String
    reference: String
    stockItemId: String!
    locationId: String!
    createdAt: DateTime!
    stockItem: StockItem
  }

  type Supplier {
    id: ID!
    name: String!
    contactName: String
    phone: String
    email: String
    address: String
    leadTimeDays: Int!
    paymentTerms: String
    isActive: Boolean!
  }

  type PurchaseOrderLine { id: ID! quantity: Float! receivedQty: Float! unitCost: Float! stockItemId: String! stockItem: StockItem }

  type PurchaseOrder {
    id: ID!
    number: String!
    status: PurchaseOrderStatus!
    total: Float!
    notes: String
    expectedAt: DateTime
    receivedAt: DateTime
    supplierId: String!
    locationId: String!
    createdAt: DateTime!
    supplier: Supplier
    location: Location
    lines: [PurchaseOrderLine!]!
  }

  input StockItemInput { name: String sku: String unit: String category: String costPerUnit: Float isActive: Boolean supplierId: ID }
  input StockAdjustInput { stockItemId: ID! locationId: ID! type: StockMovementType! quantity: Float! reason: String unitCost: Float }
  input StockLevelInput { stockItemId: ID! locationId: ID! parLevel: Float reorderPoint: Float }
  input RecipeLineInput { stockItemId: ID! quantity: Float! }
  input SupplierInput { name: String contactName: String phone: String email: String address: String leadTimeDays: Int paymentTerms: String isActive: Boolean }
  input POLineInput { stockItemId: ID! quantity: Float! unitCost: Float! }
  input PurchaseOrderInput { supplierId: ID! locationId: ID! expectedAt: DateTime notes: String lines: [POLineInput!]! }
  input ReceiveLineInput { lineId: ID! receivedQty: Float! }

  type Query {
    inventories(locationId: ID!): [Inventory!]!
    stockItems(includeInactive: Boolean): [StockItem!]!
    stockMovements(locationId: ID, stockItemId: ID, limit: Int): [StockMovement!]!
    lowStock(locationId: ID!): JSON!
    suppliers: [Supplier!]!
    purchaseOrders(status: PurchaseOrderStatus, locationId: ID): [PurchaseOrder!]!
  }

  type Mutation {
    updateInventory(productId: ID!, locationId: ID!, quantity: Int, minStock: Int, maxStock: Int, unit: String): Inventory!
    createStockItem(input: StockItemInput!): StockItem!
    updateStockItem(id: ID!, input: StockItemInput!): StockItem!
    adjustStock(input: StockAdjustInput!): StockLevel!
    setStockLevel(input: StockLevelInput!): StockLevel!
    setRecipe(productId: ID!, lines: [RecipeLineInput!]!): Product!
    createSupplier(input: SupplierInput!): Supplier!
    updateSupplier(id: ID!, input: SupplierInput!): Supplier!
    createPurchaseOrder(input: PurchaseOrderInput!): PurchaseOrder!
    updatePurchaseOrderStatus(id: ID!, status: PurchaseOrderStatus!): PurchaseOrder!
    receivePurchaseOrder(id: ID!, lines: [ReceiveLineInput!]!): PurchaseOrder!
  }
`;

const clean = (o: any) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== undefined));

async function ownStockItem(auth: AuthInfo, id: string) {
  const s = await prisma.stockItem.findFirst({ where: { id, organizationId: auth.orgId } });
  if (!s) fail('Stock item not found', 'NOT_FOUND');
  return s!;
}

// Movements that remove stock are stored as negative quantities.
const SIGN: Record<string, number> = { SALE: -1, WASTE: -1, TRANSFER_OUT: -1, PURCHASE: 1, TRANSFER_IN: 1, RETURN: 1, ADJUSTMENT: 1, COUNT: 0 };

export const resolvers = {
  Query: {
    inventories: async (_: any, { locationId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'inventory.view');
      await assertLocation(auth, locationId);
      return prisma.inventory.findMany({ where: { locationId, product: { isActive: true } }, orderBy: { product: { name: 'asc' } } });
    },

    stockItems: async (_: any, { includeInactive }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'inventory.view', 'menu.manage');
      return prisma.stockItem.findMany({ where: { organizationId: auth.orgId, ...(includeInactive ? {} : { isActive: true }) }, orderBy: { name: 'asc' } });
    },

    stockMovements: async (_: any, { locationId, stockItemId, limit }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'inventory.view');
      return prisma.stockMovement.findMany({
        where: { stockItem: { organizationId: auth.orgId }, ...(locationId ? { locationId } : {}), ...(stockItemId ? { stockItemId } : {}) },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit || 100, 500),
      });
    },

    lowStock: async (_: any, { locationId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'inventory.view');
      await assertLocation(auth, locationId);
      const [products, levels] = await Promise.all([
        prisma.inventory.findMany({ where: { locationId, product: { isActive: true, trackStock: true } }, include: { product: true } }),
        prisma.stockLevel.findMany({ where: { locationId, stockItem: { isActive: true } }, include: { stockItem: true } }),
      ]);
      return [
        ...products.filter((i) => i.quantity <= i.minStock).map((i) => ({ kind: 'PRODUCT', id: i.productId, name: i.product.name, quantity: i.quantity, threshold: i.minStock, unit: i.unit || 'unit' })),
        ...levels.filter((l) => l.quantity <= l.reorderPoint).map((l) => ({ kind: 'INGREDIENT', id: l.stockItemId, name: l.stockItem.name, quantity: round2(l.quantity), threshold: l.reorderPoint, unit: l.stockItem.unit })),
      ].sort((a, b) => a.quantity - b.quantity);
    },

    suppliers: async (_: any, __: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'inventory.view', 'purchasing.manage');
      return prisma.supplier.findMany({ where: { organizationId: auth.orgId }, orderBy: { name: 'asc' } });
    },

    purchaseOrders: async (_: any, { status, locationId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'purchasing.manage', 'inventory.view');
      return prisma.purchaseOrder.findMany({
        where: { organizationId: auth.orgId, ...(status ? { status } : {}), ...(locationId ? { locationId } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    },
  },

  Mutation: {
    updateInventory: async (_: any, { productId, locationId, quantity, minStock, maxStock, unit }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'inventory.manage');
      await assertLocation(auth, locationId);
      const p = await prisma.product.findFirst({ where: { id: productId, organizationId: auth.orgId } });
      if (!p) fail('Product not found', 'NOT_FOUND');
      const inv = await prisma.inventory.upsert({
        where: { productId_locationId: { productId, locationId } },
        create: { productId, locationId, quantity: quantity ?? 0, minStock: minStock ?? 5, maxStock, unit },
        update: clean({ quantity, minStock, maxStock, unit }),
      });
      await audit(auth, 'STOCK_SET', 'Product', productId, { locationId, quantity, minStock });
      return inv;
    },

    createStockItem: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'inventory.manage');
      if (!input.name) fail('Name is required');
      return prisma.stockItem.create({ data: { ...clean(input), name: input.name, organizationId: auth.orgId } });
    },

    updateStockItem: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'inventory.manage');
      await ownStockItem(auth, id);
      return prisma.stockItem.update({ where: { id }, data: clean(input) });
    },

    adjustStock: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'inventory.manage');
      await ownStockItem(auth, input.stockItemId);
      await assertLocation(auth, input.locationId);
      const key = { stockItemId_locationId: { stockItemId: input.stockItemId, locationId: input.locationId } };
      const current = await prisma.stockLevel.findUnique({ where: key });
      let delta: number;
      if (input.type === 'COUNT') delta = input.quantity - (current?.quantity || 0);
      else if (input.type === 'ADJUSTMENT') delta = input.quantity;
      else delta = Math.abs(input.quantity) * SIGN[input.type];
      if ((input.type === 'WASTE' || input.type === 'SALE') && !input.reason) fail('A reason is required');

      const [level] = await prisma.$transaction([
        prisma.stockLevel.upsert({
          where: key,
          create: { stockItemId: input.stockItemId, locationId: input.locationId, quantity: delta },
          update: { quantity: { increment: delta } },
        }),
        prisma.stockMovement.create({
          data: { type: input.type, quantity: round2(delta), unitCost: input.unitCost, reason: input.reason, stockItemId: input.stockItemId, locationId: input.locationId, userId: auth.userId },
        }),
      ]);
      await audit(auth, `STOCK_${input.type}`, 'StockItem', input.stockItemId, { delta, reason: input.reason });
      return level;
    },

    setStockLevel: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'inventory.manage');
      await ownStockItem(auth, input.stockItemId);
      await assertLocation(auth, input.locationId);
      return prisma.stockLevel.upsert({
        where: { stockItemId_locationId: { stockItemId: input.stockItemId, locationId: input.locationId } },
        create: { stockItemId: input.stockItemId, locationId: input.locationId, parLevel: input.parLevel ?? 0, reorderPoint: input.reorderPoint ?? 0 },
        update: clean({ parLevel: input.parLevel, reorderPoint: input.reorderPoint }),
      });
    },

    setRecipe: async (_: any, { productId, lines }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'inventory.manage', 'menu.manage');
      const p = await prisma.product.findFirst({ where: { id: productId, organizationId: auth.orgId } });
      if (!p) fail('Product not found', 'NOT_FOUND');
      for (const l of lines) {
        await ownStockItem(auth, l.stockItemId);
        if (l.quantity <= 0) fail('Recipe quantities must be positive');
      }
      await prisma.$transaction([
        prisma.recipeLine.deleteMany({ where: { productId } }),
        prisma.recipeLine.createMany({ data: lines.map((l: any) => ({ productId, stockItemId: l.stockItemId, quantity: l.quantity })) }),
      ]);
      return p;
    },

    createSupplier: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'purchasing.manage');
      if (!input.name) fail('Supplier name is required');
      return prisma.supplier.create({ data: { ...clean(input), name: input.name, organizationId: auth.orgId } });
    },

    updateSupplier: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'purchasing.manage');
      const s = await prisma.supplier.findFirst({ where: { id, organizationId: auth.orgId } });
      if (!s) fail('Supplier not found', 'NOT_FOUND');
      return prisma.supplier.update({ where: { id }, data: clean(input) });
    },

    createPurchaseOrder: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'purchasing.manage');
      await assertLocation(auth, input.locationId);
      const s = await prisma.supplier.findFirst({ where: { id: input.supplierId, organizationId: auth.orgId } });
      if (!s) fail('Supplier not found', 'NOT_FOUND');
      if (!input.lines.length) fail('Add at least one line');
      for (const l of input.lines) await ownStockItem(auth, l.stockItemId);
      const seq = await nextSequence(`po:${auth.orgId}`);
      const po = await prisma.purchaseOrder.create({
        data: {
          number: `PO-${String(seq).padStart(5, '0')}-${auth.orgId.slice(-4).toUpperCase()}`,
          supplierId: input.supplierId, locationId: input.locationId, organizationId: auth.orgId,
          expectedAt: input.expectedAt ? new Date(input.expectedAt) : null, notes: input.notes,
          total: round2(input.lines.reduce((sum: number, l: any) => sum + l.quantity * l.unitCost, 0)),
          lines: { create: input.lines.map((l: any) => ({ stockItemId: l.stockItemId, quantity: l.quantity, unitCost: l.unitCost })) },
        },
      });
      await audit(auth, 'CREATE', 'PurchaseOrder', po.id, { number: po.number, total: po.total });
      return po;
    },

    updatePurchaseOrderStatus: async (_: any, { id, status }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'purchasing.manage');
      const po = await prisma.purchaseOrder.findFirst({ where: { id, organizationId: auth.orgId } });
      if (!po) fail('Purchase order not found', 'NOT_FOUND');
      if (!['SENT', 'CANCELLED'].includes(status)) fail('Use receive to mark goods as received');
      if (po!.status === 'RECEIVED') fail('Purchase order already received');
      const updated = await prisma.purchaseOrder.update({ where: { id }, data: { status } });
      await audit(auth, `PO_${status}`, 'PurchaseOrder', id);
      return updated;
    },

    receivePurchaseOrder: async (_: any, { id, lines }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'purchasing.manage', 'inventory.manage');
      const po = await prisma.purchaseOrder.findFirst({ where: { id, organizationId: auth.orgId }, include: { lines: true } });
      if (!po) fail('Purchase order not found', 'NOT_FOUND');
      if (['RECEIVED', 'CANCELLED'].includes(po!.status)) fail(`Purchase order is ${po!.status.toLowerCase()}`);

      await prisma.$transaction(async (tx) => {
        for (const r of lines) {
          const line = po!.lines.find((l) => l.id === r.lineId);
          if (!line || r.receivedQty <= 0) continue;
          const item = await tx.stockItem.findUnique({ where: { id: line.stockItemId } });
          const level = await tx.stockLevel.findUnique({ where: { stockItemId_locationId: { stockItemId: line.stockItemId, locationId: po!.locationId } } });
          const onHand = Math.max(0, level?.quantity || 0);
          // Weighted-average costing.
          const newCost = onHand + r.receivedQty > 0
            ? (onHand * (item?.costPerUnit || 0) + r.receivedQty * line.unitCost) / (onHand + r.receivedQty)
            : line.unitCost;
          await tx.stockItem.update({ where: { id: line.stockItemId }, data: { costPerUnit: round2(newCost) } });
          await tx.stockLevel.upsert({
            where: { stockItemId_locationId: { stockItemId: line.stockItemId, locationId: po!.locationId } },
            create: { stockItemId: line.stockItemId, locationId: po!.locationId, quantity: r.receivedQty },
            update: { quantity: { increment: r.receivedQty } },
          });
          await tx.stockMovement.create({
            data: { type: 'PURCHASE', quantity: r.receivedQty, unitCost: line.unitCost, reference: po!.number, stockItemId: line.stockItemId, locationId: po!.locationId, userId: auth.userId },
          });
          await tx.purchaseOrderLine.update({ where: { id: line.id }, data: { receivedQty: { increment: r.receivedQty } } });
        }
        const refreshed = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: id } });
        const complete = refreshed.every((l) => l.receivedQty >= l.quantity);
        await tx.purchaseOrder.update({ where: { id }, data: { status: complete ? 'RECEIVED' : 'PARTIAL', receivedAt: complete ? new Date() : null } });
      }, { timeout: 30000 });
      await audit(auth, 'PO_RECEIVE', 'PurchaseOrder', id, { lines });
      return prisma.purchaseOrder.findUnique({ where: { id } });
    },
  },

  StockItem: {
    supplier: (s: any) => (s.supplierId ? prisma.supplier.findUnique({ where: { id: s.supplierId } }) : null),
    level: (s: any, { locationId }: any) => prisma.stockLevel.findUnique({ where: { stockItemId_locationId: { stockItemId: s.id, locationId } } }),
    levels: (s: any) => prisma.stockLevel.findMany({ where: { stockItemId: s.id } }),
  },

  StockMovement: {
    stockItem: (m: any) => prisma.stockItem.findUnique({ where: { id: m.stockItemId } }),
  },

  PurchaseOrder: {
    supplier: (p: any) => prisma.supplier.findUnique({ where: { id: p.supplierId } }),
    location: (p: any) => prisma.location.findUnique({ where: { id: p.locationId } }),
    lines: (p: any) => prisma.purchaseOrderLine.findMany({ where: { purchaseOrderId: p.id } }),
  },

  PurchaseOrderLine: {
    stockItem: (l: any) => prisma.stockItem.findUnique({ where: { id: l.stockItemId } }),
  },
};
