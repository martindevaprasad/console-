import { gql } from 'graphql-tag';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import {
  Ctx, AuthInfo, requireAuth, requirePerm, requirePermOrApproval, fail, audit, can,
  resolveLocationId, orgSettings,
} from '../../lib/context';
import { calculate, round2, roundCash } from '../../lib/pricing';
import { OrgSettings, resolveSettings } from '../../lib/templates';
import { discountValidNow } from './catalog';

type Tx = Prisma.TransactionClient;

export const typeDefs = gql`
  type OrderItem {
    id: ID!
    name: String
    quantity: Int!
    price: Float!
    subtotal: Float!
    taxRate: Float!
    taxAmount: Float!
    discount: Float!
    modifiers: JSON
    notes: String
    seat: Int
    course: Int!
    status: ItemStatus!
    voidReason: String
    firedAt: DateTime
    readyAt: DateTime
    stationId: String
    orderId: String!
    productId: String!
    createdAt: DateTime!
    product: Product
    station: KitchenStation
  }

  type Payment {
    id: ID!
    type: PaymentType!
    method: PaymentMethod!
    amount: Float!
    tip: Float!
    tendered: Float
    change: Float
    reference: String
    reason: String
    userId: String
    createdAt: DateTime!
    user: User
  }

  type Order {
    id: ID!
    orderNumber: String!
    ticketNumber: Int
    status: OrderStatus!
    paymentStatus: PaymentStatus!
    paymentMethod: PaymentMethod!
    channel: String!
    orderType: OrderType!
    subtotal: Float!
    taxAmount: Float!
    discountAmount: Float!
    discountId: String
    discountReason: String
    serviceCharge: Float!
    tipAmount: Float!
    roundingAmount: Float!
    total: Float!
    paidAmount: Float!
    refundedAmount: Float!
    balanceDue: Float!
    taxBreakdown: JSON
    guestCount: Int
    notes: String
    organizationId: String!
    locationId: String!
    userId: String
    customerId: String
    tableId: String
    tableSessionId: String
    completedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    items: [OrderItem!]!
    payments: [Payment!]!
    user: User
    customer: Customer
    location: Location
    table: Table
  }

  type OrderPage { items: [Order!]! total: Int! }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
    modifierIds: [ID!]
    notes: String
    seat: Int
    course: Int
    priceOverride: Float
  }

  input DiscountInput {
    discountId: ID
    type: DiscountType
    value: Float
    reason: String
    approverPin: String
  }

  input PaymentInput {
    method: PaymentMethod!
    amount: Float
    tip: Float
    tendered: Float
    reference: String
  }

  input OrderInput {
    locationId: ID
    orderType: OrderType
    channel: String
    tableId: ID
    guestCount: Int
    customerId: ID
    notes: String
    items: [OrderItemInput!]!
    discount: DiscountInput
    payments: [PaymentInput!]
    fire: Boolean
    idempotencyKey: String
  }

  input OrderUpdateInput { customerId: ID guestCount: Int notes: String orderType: OrderType tableId: ID }

  input OrderFilter {
    locationId: ID
    status: OrderStatus
    paymentStatus: PaymentStatus
    orderType: OrderType
    channel: String
    customerId: ID
    from: DateTime
    to: DateTime
    search: String
  }

  type Query {
    orders(filter: OrderFilter, limit: Int, offset: Int): OrderPage!
    order(id: ID!): Order
    openOrders(locationId: ID): [Order!]!
    tableOrder(tableId: ID!): Order
    kitchenTickets(locationId: ID, stationId: ID): [Order!]!
  }

  type Mutation {
    createOrder(input: OrderInput!): Order!
    addOrderItems(orderId: ID!, items: [OrderItemInput!]!, fire: Boolean): Order!
    updateOrder(orderId: ID!, input: OrderUpdateInput!): Order!
    fireOrder(orderId: ID!, course: Int): Order!
    requestBill(orderId: ID!): Order!
    voidOrderItem(itemId: ID!, reason: String!, approverPin: String): Order!
    applyDiscount(orderId: ID!, discount: DiscountInput!): Order!
    removeDiscount(orderId: ID!): Order!
    addPayment(orderId: ID!, payment: PaymentInput!): Order!
    refundOrder(orderId: ID!, amount: Float!, method: PaymentMethod, reason: String!, approverPin: String): Order!
    cancelOrder(orderId: ID!, reason: String!, approverPin: String): Order!
    splitOrder(orderId: ID!, itemIds: [ID!]!): Order!
    transferOrder(orderId: ID!, tableId: ID!): Order!
    updateItemStatus(itemIds: [ID!]!, status: ItemStatus!): Boolean!
    bumpOrder(orderId: ID!, stationId: ID): Boolean!
    updateOrderStatus(id: ID!, status: OrderStatus!): Order!
  }
`;

// ---------------------------------------------------------------- helpers

const OPEN_STATES = ['OPEN', 'PENDING', 'IN_PROGRESS', 'READY'];
const KITCHEN_STATES = ['FIRED', 'PREPARING', 'READY'];

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

async function nextSeq(tx: Tx, key: string) {
  const s = await tx.sequence.upsert({ where: { key }, create: { key, value: 1 }, update: { value: { increment: 1 } } });
  return s.value;
}

async function getOwnedOrder(auth: AuthInfo, id: string, client: Tx | typeof prisma = prisma) {
  const order = await client.order.findFirst({ where: { id, organizationId: auth.orgId } });
  if (!order) fail('Order not found', 'NOT_FOUND');
  return order!;
}

const assertOpen = (order: any) => {
  if (!OPEN_STATES.includes(order.status)) fail(`Order is ${order.status.toLowerCase()} and can no longer be changed`);
};

async function currentShiftId(tx: Tx, locationId: string, userId: string) {
  const mine = await tx.shift.findFirst({ where: { locationId, status: 'OPEN', userId } });
  if (mine) return mine.id;
  const any = await tx.shift.findFirst({ where: { locationId, status: 'OPEN' }, orderBy: { openedAt: 'desc' } });
  return any?.id || null;
}

/** Validates items against the live catalog and returns OrderItem create rows. Prices never come from the client. */
async function buildLines(tx: Tx, auth: AuthInfo, locationId: string, items: any[], fire: boolean) {
  if (!items?.length) fail('Add at least one item');
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await tx.product.findMany({
    where: { id: { in: ids }, organizationId: auth.orgId },
    include: {
      taxRateRef: true,
      station: true,
      inventory: { where: { locationId } },
      modifierGroups: { include: { group: { include: { modifiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } } } } },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const [defaultTax, org, locStations] = await Promise.all([
    tx.taxRate.findFirst({ where: { organizationId: auth.orgId, isDefault: true, isActive: true } }),
    tx.organization.findUnique({ where: { id: auth.orgId } }),
    tx.kitchenStation.findMany({ where: { locationId, isActive: true } }),
  ]);

  return items.map((item) => {
    const p = byId.get(item.productId);
    if (!p || !p.isActive) fail('One of the items is no longer available');
    const qty = Math.floor(item.quantity);
    if (!qty || qty < 1 || qty > 999) fail(`Invalid quantity for ${p!.name}`);

    if (p!.trackStock) {
      const stock = p!.inventory[0]?.quantity ?? 0;
      if (stock <= 0) fail(`${p!.name} is sold out (86)`);
    }

    // Modifiers
    const groups = p!.modifierGroups.map((l) => l.group).filter((g) => g.isActive);
    const allMods = new Map(groups.flatMap((g) => g.modifiers.map((m) => [m.id, { ...m, groupName: g.name }] as const)));
    const chosen: string[] = [...(item.modifierIds || [])];
    for (const id of chosen) if (!allMods.has(id)) fail(`Invalid option selected for ${p!.name}`);
    for (const g of groups) {
      const count = chosen.filter((id) => allMods.get(id)!.groupId === g.id).length;
      if (count > g.maxSelect) fail(`${p!.name}: choose at most ${g.maxSelect} for ${g.name}`);
      if (count < g.minSelect) {
        const defaults = g.modifiers.filter((m) => m.isDefault).slice(0, g.minSelect - count);
        if (count + defaults.length < g.minSelect) fail(`${p!.name}: ${g.name} is required`);
        chosen.push(...defaults.map((m) => m.id));
      }
    }
    const mods = chosen.map((id) => {
      const m = allMods.get(id)!;
      return { id: m.id, name: m.name, price: m.price, group: m.groupName };
    });

    // Price: location override → open price / manager override → base
    const overrides = (p!.priceOverrides as any) || {};
    let base = typeof overrides[locationId] === 'number' ? overrides[locationId] : p!.price;
    if (item.priceOverride !== undefined && item.priceOverride !== null) {
      if (!p!.isOpenPrice && !can(auth, 'pos.price_override')) fail('Price override not permitted', 'FORBIDDEN');
      if (item.priceOverride < 0) fail('Price cannot be negative');
      base = item.priceOverride;
    }
    const unit = round2(base + mods.reduce((s, m) => s + m.price, 0));

    // Kitchen routing: route by station name so every outlet can have its own station ids.
    const station = p!.station
      ? (locStations.find((s) => s.name === p!.station!.name) || (p!.station.locationId === locationId ? p!.station : null))
      : null;

    const taxRate = p!.taxRateRef?.isActive ? p!.taxRateRef.rate : (defaultTax?.rate ?? org?.taxRate ?? 0);
    return {
      productId: p!.id,
      name: p!.name,
      quantity: qty,
      price: unit,
      subtotal: round2(unit * qty),
      taxRate,
      modifiers: mods.length ? mods : undefined,
      notes: item.notes || null,
      seat: item.seat ?? null,
      course: item.course ?? 1,
      stationId: station?.id || null,
      status: fire ? 'FIRED' as const : 'PENDING' as const,
      firedAt: fire ? new Date() : null,
    };
  });
}

/** Resolves a discount request into a stored spec, enforcing approvals. */
async function resolveDiscount(ctx: Ctx, auth: AuthInfo, settings: OrgSettings, timezone: string, input: any) {
  if (!input) return null;
  if (input.discountId) {
    const d = await prisma.discount.findFirst({ where: { id: input.discountId, organizationId: auth.orgId } });
    if (!d || !discountValidNow(d, timezone)) fail('This promotion is not currently valid');
    let approvedBy: string | undefined;
    if (d!.requiresApproval) approvedBy = (await requirePermOrApproval(ctx, 'pos.discount', input.approverPin)).approvedBy;
    return {
      spec: { discountId: d!.id, type: d!.type, value: d!.value, maxDiscount: d!.maxDiscount, minOrderAmount: d!.minOrderAmount, scope: d!.scope, categoryId: d!.categoryId },
      reason: d!.name, approvedBy,
    };
  }
  if (!input.type || !input.value || input.value <= 0) fail('Discount type and value are required');
  if (input.type === 'PERCENT' && input.value > 100) fail('Discount cannot exceed 100%');
  if (!input.reason) fail('A reason is required for manual discounts');
  const limit = settings.security.maxDiscountPctWithoutApproval;
  let approvedBy: string | undefined;
  if (input.type === 'FIXED' || input.value > limit) {
    approvedBy = (await requirePermOrApproval(ctx, 'pos.discount', input.approverPin)).approvedBy;
  }
  return { spec: { type: input.type, value: input.value, scope: 'ORDER' }, reason: input.reason, approvedBy };
}

/** Recomputes totals & payment status from items/payments. Single source of truth for money. */
async function recalc(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, payments: true, organization: true },
  });
  if (!order) fail('Order not found', 'NOT_FOUND');
  const o = order!;
  const settings = resolveSettings(o.organization.settings);
  const taxRates = await tx.taxRate.findMany({ where: { organizationId: o.organizationId } });
  const nameForRate = (rate: number) => taxRates.find((t) => t.rate === rate)?.name || settings.taxLabel;

  const spec: any = o.discountSpec;
  let discount: any = null;
  if (spec) {
    const activeGross = o.items.filter((i) => i.status !== 'VOIDED').reduce((s, i) => s + i.price * i.quantity, 0);
    if (!spec.minOrderAmount || activeGross >= spec.minOrderAmount) {
      if (spec.scope === 'CATEGORY' && spec.categoryId) {
        const eligible = o.items
          .filter((i) => i.status !== 'VOIDED' && i.product.categoryId === spec.categoryId)
          .reduce((s, i) => s + i.price * i.quantity, 0);
        const amt = spec.type === 'PERCENT' ? eligible * spec.value / 100 : Math.min(spec.value, eligible);
        discount = { type: 'FIXED', value: amt, maxDiscount: spec.maxDiscount };
      } else {
        discount = { type: spec.type, value: spec.value, maxDiscount: spec.maxDiscount };
      }
    }
  }

  const tip = o.payments.filter((p) => p.type === 'SALE').reduce((s, p) => s + p.tip, 0);
  const svcApplies = o.orderType === 'DINE_IN' && settings.pos.serviceChargePct > 0 &&
    (!settings.pos.serviceChargeMinGuests || (o.guestCount || 0) >= settings.pos.serviceChargeMinGuests);

  const res = calculate({
    lines: o.items.map((i) => ({ unitPrice: i.price, quantity: i.quantity, taxRate: i.taxRate, taxName: nameForRate(i.taxRate), voided: i.status === 'VOIDED' })),
    taxInclusive: o.organization.taxInclusive,
    discount,
    serviceChargePct: svcApplies ? settings.pos.serviceChargePct : 0,
    tip,
  });

  await Promise.all(o.items.map((item, idx) => {
    const l = res.lines[idx];
    if (item.taxAmount === l.tax && item.discount === l.discount && item.subtotal === round2(item.price * item.quantity)) return null;
    return tx.orderItem.update({ where: { id: item.id }, data: { taxAmount: l.tax, discount: l.discount, subtotal: round2(item.price * item.quantity) } });
  }));

  const total = round2(res.total + o.roundingAmount);
  const paid = round2(o.payments.filter((p) => p.type === 'SALE').reduce((s, p) => s + p.amount, 0));
  const refunded = round2(o.payments.filter((p) => p.type === 'REFUND').reduce((s, p) => s + p.amount, 0));
  const due = round2(total - res.tipAmount);
  let paymentStatus: any = 'UNPAID';
  if (refunded > 0) paymentStatus = refunded >= paid - 0.005 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  else if (paid > 0) paymentStatus = paid >= due - 0.005 ? 'PAID' : 'PARTIAL';
  if (due <= 0 && o.items.some((i) => i.status !== 'VOIDED') && refunded === 0) paymentStatus = 'PAID';

  const methods = [...new Set(o.payments.filter((p) => p.type === 'SALE').map((p) => p.method))];
  return tx.order.update({
    where: { id: orderId },
    data: {
      subtotal: res.subtotal,
      discountAmount: res.discountAmount,
      taxAmount: res.taxAmount,
      serviceCharge: res.serviceCharge,
      tipAmount: res.tipAmount,
      total,
      paidAmount: paid,
      refundedAmount: refunded,
      taxBreakdown: res.taxBreakdown as any,
      paymentStatus,
      ...(methods.length === 1 ? { paymentMethod: methods[0] } : methods.length > 1 ? { paymentMethod: 'SPLIT' } : {}),
    },
  });
}

async function fireItems(tx: Tx, orderId: string, course?: number | null) {
  await tx.orderItem.updateMany({
    where: { orderId, status: 'PENDING', ...(course ? { course } : {}) },
    data: { status: 'FIRED', firedAt: new Date() },
  });
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (order?.tableId) await tx.table.updateMany({ where: { id: order.tableId }, data: { status: 'WAITING_FOR_FOOD' } });
}

/** Post-payment side effects: kitchen, stock, loyalty, table, promotion usage. */
async function completeOrder(tx: Tx, orderId: string, settings: OrgSettings, auth: AuthInfo) {
  const order = await tx.order.update({
    where: { id: orderId },
    data: { status: 'COMPLETED', completedAt: new Date() },
    include: { items: { include: { product: { include: { recipe: true } } } } },
  });

  if (settings.modules.kds) await fireItems(tx, orderId);
  else await tx.orderItem.updateMany({ where: { orderId, status: { in: ['PENDING', 'FIRED', 'PREPARING', 'READY'] } }, data: { status: 'SERVED' } });

  if (settings.modules.inventory) {
    for (const item of order.items) {
      if (item.status === 'VOIDED') continue;
      if (item.product.trackStock) {
        await tx.inventory.updateMany({ where: { productId: item.productId, locationId: order.locationId }, data: { quantity: { decrement: item.quantity } } });
      }
      for (const line of item.product.recipe) {
        const qty = line.quantity * item.quantity;
        await tx.stockLevel.upsert({
          where: { stockItemId_locationId: { stockItemId: line.stockItemId, locationId: order.locationId } },
          create: { stockItemId: line.stockItemId, locationId: order.locationId, quantity: -qty },
          update: { quantity: { decrement: qty } },
        });
        await tx.stockMovement.create({
          data: { type: 'SALE', quantity: -qty, stockItemId: line.stockItemId, locationId: order.locationId, reference: order.orderNumber, userId: auth.userId },
        });
      }
    }
  }

  if (order.customerId) {
    const spend = round2(order.total - order.tipAmount);
    const points = settings.modules.loyalty ? Math.floor(spend * settings.loyalty.pointsPerUnit) : 0;
    await tx.customer.update({
      where: { id: order.customerId },
      data: { totalSpent: { increment: spend }, visitCount: { increment: 1 }, lastVisitAt: new Date(), ...(points > 0 ? { loyaltyPoints: { increment: points } } : {}) },
    });
  }

  if (order.tableId) {
    const others = await tx.order.count({ where: { tableId: order.tableId, id: { not: order.id }, status: { in: OPEN_STATES as any } } });
    if (!others) {
      await tx.table.updateMany({ where: { id: order.tableId }, data: { status: 'NEEDS_CLEANING' } });
      await tx.tableSession.updateMany({ where: { tableId: order.tableId, endTime: null }, data: { endTime: new Date() } });
    }
  }

  if (order.discountId) await tx.discount.updateMany({ where: { id: order.discountId }, data: { usageCount: { increment: 1 } } });
}

async function applyPayment(tx: Tx, auth: AuthInfo, orderId: string, payment: any, settings: OrgSettings) {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  assertOpen(order);
  const due = round2(order!.total - order!.tipAmount);
  const balance = round2(due - order!.paidAmount);
  if (balance <= 0) fail('Order is already fully paid');

  let amount = round2(payment.amount ?? balance);
  if (amount <= 0) fail('Payment amount must be positive');
  const tip = round2(Math.max(0, payment.tip || 0));
  if (tip > 0 && !settings.pos.tipping) fail('Tipping is disabled for this business');

  let rounding = 0;
  let change: number | null = null;
  if (payment.method === 'CASH') {
    const target = settings.pos.cashRounding ? roundCash(balance, settings.pos.cashRounding) : balance;
    if (amount >= target - 0.001) {
      rounding = round2(target - balance);
      const tendered = payment.tendered ?? amount;
      change = round2(Math.max(0, tendered - target));
      amount = target;
    }
  } else if (amount > balance) {
    amount = balance;
  }

  if (payment.method === 'LOYALTY' || payment.method === 'HOUSE_ACCOUNT') {
    if (!order!.customerId) fail('Attach a customer to use this payment method');
    const customer = await tx.customer.findUnique({ where: { id: order!.customerId! } });
    if (payment.method === 'LOYALTY') {
      if (!settings.modules.loyalty) fail('Loyalty is disabled');
      const points = Math.ceil(amount / settings.loyalty.pointValue);
      if (customer!.loyaltyPoints < Math.max(points, settings.loyalty.minRedeemPoints)) fail('Not enough loyalty points');
      await tx.customer.update({ where: { id: customer!.id }, data: { loyaltyPoints: { decrement: points } } });
    } else {
      if (!customer!.houseAccount) fail('Customer does not have a house account');
      await tx.customer.update({ where: { id: customer!.id }, data: { balance: { increment: amount } } });
    }
  }
  if (payment.method === 'GIFT_CARD' && !payment.reference) fail('Gift card number is required');

  await tx.payment.create({
    data: {
      type: 'SALE', method: payment.method, amount, tip, tendered: payment.tendered ?? null, change,
      reference: payment.reference || null, orderId, userId: auth.userId, shiftId: order!.shiftId,
    },
  });
  if (rounding) await tx.order.update({ where: { id: orderId }, data: { roundingAmount: { increment: rounding } } });

  const updated = await recalc(tx, orderId);
  if (updated.paymentStatus === 'PAID') await completeOrder(tx, orderId, settings, auth);
}

/** A 100%-discounted (zero due) order is settled without a payment. */
async function maybeComplete(tx: Tx, orderId: string, settings: OrgSettings, auth: AuthInfo) {
  const o = await tx.order.findUnique({ where: { id: orderId } });
  if (o && o.paymentStatus === 'PAID' && OPEN_STATES.includes(o.status)) await completeOrder(tx, orderId, settings, auth);
}

async function attachTable(tx: Tx, auth: AuthInfo, locationId: string, tableId: string, guestCount?: number | null) {
  const table = await tx.table.findFirst({ where: { id: tableId, zone: { locationId, location: { organizationId: auth.orgId } } } });
  if (!table) fail('Table not found at this location', 'NOT_FOUND');
  let session = await tx.tableSession.findFirst({ where: { tableId, endTime: null } });
  if (!session) session = await tx.tableSession.create({ data: { tableId, guestCount: guestCount || 1, serverUserId: auth.userId } });
  if (['AVAILABLE', 'SEATED', 'NEEDS_CLEANING'].includes(table!.status)) {
    await tx.table.updateMany({ where: { id: tableId }, data: { status: 'ORDERING' } });
  }
  return session;
}

const TX_OPTS = { timeout: 30000, maxWait: 10000 };

const withOrder = (id: string) => prisma.order.findUnique({ where: { id } });

// ---------------------------------------------------------------- resolvers

export const resolvers = {
  Query: {
    orders: async (_: any, { filter = {}, limit, offset }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'orders.view');
      const f = filter || {};
      const where: Prisma.OrderWhereInput = {
        organizationId: auth.orgId,
        ...(f.locationId ? { locationId: f.locationId } : {}),
        ...(f.status ? { status: f.status } : {}),
        ...(f.paymentStatus ? { paymentStatus: f.paymentStatus } : {}),
        ...(f.orderType ? { orderType: f.orderType } : {}),
        ...(f.channel ? { channel: f.channel } : {}),
        ...(f.customerId ? { customerId: f.customerId } : {}),
        ...(f.from || f.to ? { createdAt: { ...(f.from ? { gte: new Date(f.from) } : {}), ...(f.to ? { lte: new Date(f.to) } : {}) } } : {}),
        ...(f.search ? {
          OR: [
            { orderNumber: { contains: f.search, mode: 'insensitive' } },
            { customer: { name: { contains: f.search, mode: 'insensitive' } } },
            ...(/^\d+$/.test(f.search) ? [{ ticketNumber: Number(f.search) }] : []),
          ],
        } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(limit || 50, 200), skip: offset || 0 }),
        prisma.order.count({ where }),
      ]);
      return { items, total };
    },

    order: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'orders.view', 'pos.access');
      return prisma.order.findFirst({ where: { id, organizationId: auth.orgId } });
    },

    openOrders: async (_: any, { locationId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const loc = await resolveLocationId(auth, locationId);
      return prisma.order.findMany({
        where: { organizationId: auth.orgId, locationId: loc, status: { in: OPEN_STATES as any }, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    },

    tableOrder: async (_: any, { tableId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      return prisma.order.findFirst({
        where: { organizationId: auth.orgId, tableId, status: { in: OPEN_STATES as any } },
        orderBy: { createdAt: 'desc' },
      });
    },

    kitchenTickets: async (_: any, { locationId, stationId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'kds.access');
      const loc = await resolveLocationId(auth, locationId);
      return prisma.order.findMany({
        where: {
          organizationId: auth.orgId,
          locationId: loc,
          status: { notIn: ['CANCELLED'] },
          createdAt: { gte: new Date(Date.now() - 12 * 3600 * 1000) },
          items: { some: { status: { in: KITCHEN_STATES as any }, ...(stationId ? { stationId } : {}) } },
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
    },
  },

  Mutation: {
    createOrder: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      if (input.idempotencyKey) {
        const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing && existing.organizationId === auth.orgId) return existing;
      }
      const locationId = await resolveLocationId(auth, input.locationId);
      const { org, settings } = await orgSettings(auth.orgId);
      const orderType = input.orderType || settings.orderTypes[0] || 'TAKEAWAY';
      if (!settings.orderTypes.includes(orderType)) fail(`${orderType.replace('_', ' ')} orders are not enabled`);
      if (input.tableId && !settings.modules.tables) fail('Table service is disabled');
      if (input.customerId) {
        const c = await prisma.customer.findFirst({ where: { id: input.customerId, organizationId: auth.orgId } });
        if (!c) fail('Customer not found', 'NOT_FOUND');
      }
      if (orderType === 'DELIVERY' && !input.customerId) fail('Delivery orders need a customer');

      let discount = await resolveDiscount(ctx, auth, settings, org.timezone, input.discount);
      if (!discount) {
        // Auto-apply the best valid automatic promotion.
        const autos = (await prisma.discount.findMany({ where: { organizationId: auth.orgId, autoApply: true, isActive: true } }))
          .filter((d) => discountValidNow(d, org.timezone));
        const best = autos.sort((a, b) => b.value - a.value)[0];
        if (best) discount = { spec: { discountId: best.id, type: best.type, value: best.value, maxDiscount: best.maxDiscount, minOrderAmount: best.minOrderAmount, scope: best.scope, categoryId: best.categoryId }, reason: best.name, approvedBy: undefined };
      }

      const fire = !!input.fire;
      const orderId = await prisma.$transaction(async (tx) => {
        const lines = await buildLines(tx, auth, locationId, input.items, fire);
        const day = new Date().toISOString().slice(0, 10);
        const ticketNumber = await nextSeq(tx, `ticket:${locationId}:${day}`);
        const shiftId = await currentShiftId(tx, locationId, auth.userId);
        const session = input.tableId ? await attachTable(tx, auth, locationId, input.tableId, input.guestCount) : null;

        const order = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            ticketNumber,
            status: 'OPEN',
            channel: input.channel || 'POS',
            orderType,
            organizationId: auth.orgId,
            locationId,
            userId: auth.userId,
            customerId: input.customerId || null,
            tableId: input.tableId || null,
            tableSessionId: session?.id || null,
            guestCount: input.guestCount || session?.guestCount || null,
            shiftId,
            notes: input.notes || null,
            idempotencyKey: input.idempotencyKey || null,
            subtotal: 0,
            total: 0,
            discountId: discount?.spec.discountId || null,
            discountReason: discount ? [discount.reason, discount.approvedBy && `approved by ${discount.approvedBy}`].filter(Boolean).join(' — ') : null,
            discountSpec: discount?.spec as any ?? undefined,
            items: { create: lines as any },
          },
        });
        await recalc(tx, order.id);
        if (fire && order.tableId) await tx.table.updateMany({ where: { id: order.tableId }, data: { status: 'WAITING_FOR_FOOD' } });
        for (const p of input.payments || []) await applyPayment(tx, auth, order.id, p, settings);
        await maybeComplete(tx, order.id, settings, auth);
        return order.id;
      }, TX_OPTS);

      if (discount?.approvedBy) await audit(auth, 'DISCOUNT_APPROVED', 'Order', orderId, { approvedBy: discount.approvedBy, spec: discount.spec });
      return withOrder(orderId);
    },

    addOrderItems: async (_: any, { orderId, items, fire }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const order = await getOwnedOrder(auth, orderId);
      assertOpen(order);
      if (order.paidAmount > 0) fail('Order has partial payment; start a new check for extra items');
      await prisma.$transaction(async (tx) => {
        const lines = await buildLines(tx, auth, order.locationId, items, !!fire);
        await tx.orderItem.createMany({ data: lines.map((l) => ({ ...l, orderId })) as any });
        await recalc(tx, orderId);
        if (fire && order.tableId) await tx.table.updateMany({ where: { id: order.tableId }, data: { status: 'WAITING_FOR_FOOD' } });
      }, TX_OPTS);
      return withOrder(orderId);
    },

    updateOrder: async (_: any, { orderId, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const order = await getOwnedOrder(auth, orderId);
      assertOpen(order);
      const { settings } = await orgSettings(auth.orgId);
      if (input.orderType && !settings.orderTypes.includes(input.orderType)) fail('Order type not enabled');
      if (input.customerId) {
        const c = await prisma.customer.findFirst({ where: { id: input.customerId, organizationId: auth.orgId } });
        if (!c) fail('Customer not found', 'NOT_FOUND');
      }
      await prisma.$transaction(async (tx) => {
        let tableSessionId = order.tableSessionId;
        if (input.tableId && input.tableId !== order.tableId) tableSessionId = (await attachTable(tx, auth, order.locationId, input.tableId, input.guestCount ?? order.guestCount)).id;
        await tx.order.update({
          where: { id: orderId },
          data: {
            ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
            ...(input.guestCount !== undefined ? { guestCount: input.guestCount } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            ...(input.orderType ? { orderType: input.orderType } : {}),
            ...(input.tableId ? { tableId: input.tableId, tableSessionId } : {}),
          },
        });
        await recalc(tx, orderId);
      }, TX_OPTS);
      return withOrder(orderId);
    },

    fireOrder: async (_: any, { orderId, course }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const order = await getOwnedOrder(auth, orderId);
      assertOpen(order);
      await prisma.$transaction((tx) => fireItems(tx, orderId, course), TX_OPTS);
      return withOrder(orderId);
    },

    requestBill: async (_: any, { orderId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const order = await getOwnedOrder(auth, orderId);
      if (order.tableId) await prisma.table.updateMany({ where: { id: order.tableId }, data: { status: 'READY_FOR_PAYMENT' } });
      return order;
    },

    voidOrderItem: async (_: any, { itemId, reason, approverPin }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const item = await prisma.orderItem.findFirst({ where: { id: itemId, order: { organizationId: auth.orgId } }, include: { order: true } });
      if (!item) fail('Item not found', 'NOT_FOUND');
      assertOpen(item!.order);
      if (item!.order.paidAmount > 0) fail('Refund the payment before voiding items');
      const { settings } = await orgSettings(auth.orgId);
      let approvedBy: string | undefined;
      // Unsent items can be removed freely; sent items cost food and need authority.
      if (item!.status !== 'PENDING' && settings.security.voidRequiresManager) {
        approvedBy = (await requirePermOrApproval(ctx, 'pos.void', approverPin)).approvedBy;
      }
      await prisma.$transaction(async (tx) => {
        if (item!.status === 'PENDING') await tx.orderItem.delete({ where: { id: itemId } });
        else await tx.orderItem.update({ where: { id: itemId }, data: { status: 'VOIDED', voidReason: reason } });
        await recalc(tx, item!.orderId);
      }, TX_OPTS);
      if (item!.status !== 'PENDING') {
        await audit(auth, 'VOID_ITEM', 'Order', item!.orderId, { item: item!.name, quantity: item!.quantity, amount: item!.subtotal, reason, approvedBy });
      }
      return withOrder(item!.orderId);
    },

    applyDiscount: async (_: any, { orderId, discount }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const order = await getOwnedOrder(auth, orderId);
      assertOpen(order);
      if (order.paidAmount > 0) fail('Cannot change discount after a payment was taken');
      const { org, settings } = await orgSettings(auth.orgId);
      const d = await resolveDiscount(ctx, auth, settings, org.timezone, discount);
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            discountId: d!.spec.discountId || null,
            discountSpec: d!.spec as any,
            discountReason: [d!.reason, d!.approvedBy && `approved by ${d!.approvedBy}`].filter(Boolean).join(' — '),
          },
        });
        await recalc(tx, orderId);
        await maybeComplete(tx, orderId, settings, auth);
      }, TX_OPTS);
      await audit(auth, 'APPLY_DISCOUNT', 'Order', orderId, { ...d!.spec, reason: d!.reason, approvedBy: d!.approvedBy });
      return withOrder(orderId);
    },

    removeDiscount: async (_: any, { orderId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const order = await getOwnedOrder(auth, orderId);
      assertOpen(order);
      if (order.paidAmount > 0) fail('Cannot change discount after a payment was taken');
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: orderId }, data: { discountId: null, discountSpec: Prisma.DbNull, discountReason: null } });
        await recalc(tx, orderId);
      }, TX_OPTS);
      return withOrder(orderId);
    },

    addPayment: async (_: any, { orderId, payment }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      await getOwnedOrder(auth, orderId);
      const { settings } = await orgSettings(auth.orgId);
      await prisma.$transaction((tx) => applyPayment(tx, auth, orderId, payment, settings), TX_OPTS);
      return withOrder(orderId);
    },

    refundOrder: async (_: any, { orderId, amount, method, reason, approverPin }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access', 'orders.manage');
      const { settings } = await orgSettings(auth.orgId);
      const { approvedBy } = settings.security.refundRequiresManager
        ? await requirePermOrApproval(ctx, 'pos.refund', approverPin)
        : { approvedBy: undefined };
      const order = await getOwnedOrder(auth, orderId);
      const refundable = round2(order.paidAmount - order.refundedAmount);
      if (amount <= 0 || amount > refundable + 0.001) fail(`Refund must be between 0 and ${refundable.toFixed(2)}`);
      await prisma.$transaction(async (tx) => {
        const shiftId = await currentShiftId(tx, order.locationId, auth.userId);
        await tx.payment.create({
          data: { type: 'REFUND', method: method || order.paymentMethod, amount: round2(amount), reason, orderId, userId: auth.userId, shiftId },
        });
        const updated = await recalc(tx, orderId);
        if (updated.paymentStatus === 'REFUNDED') await tx.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } });
        if (order.customerId) {
          await tx.customer.update({ where: { id: order.customerId }, data: { totalSpent: { decrement: round2(amount) } } });
        }
      }, TX_OPTS);
      await audit(auth, 'REFUND', 'Order', orderId, { amount, reason, approvedBy });
      return withOrder(orderId);
    },

    cancelOrder: async (_: any, { orderId, reason, approverPin }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const order = await getOwnedOrder(auth, orderId);
      assertOpen(order);
      if (order.paidAmount > 0) fail('Refund payments before cancelling');
      const { settings } = await orgSettings(auth.orgId);
      const sent = await prisma.orderItem.count({ where: { orderId, status: { not: 'PENDING' } } });
      let approvedBy: string | undefined;
      if (sent && settings.security.voidRequiresManager) approvedBy = (await requirePermOrApproval(ctx, 'pos.void', approverPin)).approvedBy;
      await prisma.$transaction(async (tx) => {
        await tx.orderItem.updateMany({ where: { orderId }, data: { status: 'VOIDED', voidReason: reason } });
        await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED', notes: [order.notes, `Cancelled: ${reason}`].filter(Boolean).join('\n') } });
        if (order.tableId) {
          const others = await tx.order.count({ where: { tableId: order.tableId, id: { not: orderId }, status: { in: OPEN_STATES as any } } });
          if (!others) await tx.table.updateMany({ where: { id: order.tableId }, data: { status: 'NEEDS_CLEANING' } });
        }
      }, TX_OPTS);
      await audit(auth, 'CANCEL_ORDER', 'Order', orderId, { reason, total: order.total, approvedBy });
      return withOrder(orderId);
    },

    splitOrder: async (_: any, { orderId, itemIds }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'pos.access');
      const order = await getOwnedOrder(auth, orderId);
      assertOpen(order);
      if (order.paidAmount > 0) fail('Split before taking payments, or split the payment instead');
      const items = await prisma.orderItem.findMany({ where: { orderId, id: { in: itemIds }, status: { not: 'VOIDED' } } });
      const remaining = await prisma.orderItem.count({ where: { orderId, id: { notIn: itemIds }, status: { not: 'VOIDED' } } });
      if (!items.length) fail('Select items to move');
      if (!remaining) fail('Leave at least one item on the original check');
      const newId = await prisma.$transaction(async (tx) => {
        const day = new Date().toISOString().slice(0, 10);
        const created = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            ticketNumber: await nextSeq(tx, `ticket:${order.locationId}:${day}`),
            status: 'OPEN', channel: order.channel, orderType: order.orderType,
            organizationId: order.organizationId, locationId: order.locationId, userId: auth.userId,
            customerId: order.customerId, tableId: order.tableId, tableSessionId: order.tableSessionId,
            shiftId: order.shiftId, guestCount: null, subtotal: 0, total: 0,
            notes: `Split from #${order.ticketNumber ?? order.orderNumber}`,
          },
        });
        await tx.orderItem.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { orderId: created.id } });
        await recalc(tx, orderId);
        await recalc(tx, created.id);
        return created.id;
      }, TX_OPTS);
      await audit(auth, 'SPLIT_ORDER', 'Order', orderId, { newOrderId: newId, items: items.length });
      return withOrder(newId);
    },

    transferOrder: async (_: any, { orderId, tableId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'tables.manage');
      const order = await getOwnedOrder(auth, orderId);
      assertOpen(order);
      await prisma.$transaction(async (tx) => {
        const session = await attachTable(tx, auth, order.locationId, tableId, order.guestCount);
        await tx.order.update({ where: { id: orderId }, data: { tableId, tableSessionId: session.id } });
        if (order.tableId) {
          const others = await tx.order.count({ where: { tableId: order.tableId, status: { in: OPEN_STATES as any } } });
          if (!others) {
            await tx.table.updateMany({ where: { id: order.tableId }, data: { status: 'NEEDS_CLEANING' } });
            await tx.tableSession.updateMany({ where: { tableId: order.tableId, endTime: null }, data: { endTime: new Date() } });
          }
        }
      }, TX_OPTS);
      await audit(auth, 'TRANSFER_TABLE', 'Order', orderId, { from: order.tableId, to: tableId });
      return withOrder(orderId);
    },

    updateItemStatus: async (_: any, { itemIds, status }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'kds.access');
      if (status === 'VOIDED') fail('Use void to remove items');
      await prisma.orderItem.updateMany({
        where: { id: { in: itemIds }, order: { organizationId: auth.orgId } },
        data: { status, ...(status === 'READY' ? { readyAt: new Date() } : {}), ...(status === 'FIRED' ? { readyAt: null } : {}) },
      });
      return true;
    },

    bumpOrder: async (_: any, { orderId, stationId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'kds.access');
      await getOwnedOrder(auth, orderId);
      const ready = await prisma.orderItem.count({ where: { orderId, status: 'READY', ...(stationId ? { stationId } : {}) } });
      const cooking = await prisma.orderItem.count({ where: { orderId, status: { in: ['FIRED', 'PREPARING'] }, ...(stationId ? { stationId } : {}) } });
      // First bump marks ready; bumping an all-ready ticket marks it served (clears the screen).
      if (cooking) {
        await prisma.orderItem.updateMany({ where: { orderId, status: { in: ['FIRED', 'PREPARING'] }, ...(stationId ? { stationId } : {}) }, data: { status: 'READY', readyAt: new Date() } });
      } else if (ready) {
        await prisma.orderItem.updateMany({ where: { orderId, status: 'READY', ...(stationId ? { stationId } : {}) }, data: { status: 'SERVED' } });
      }
      return true;
    },

    updateOrderStatus: async (_: any, { id, status }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'orders.manage');
      await getOwnedOrder(auth, id);
      if (['COMPLETED', 'REFUNDED', 'CANCELLED'].includes(status)) fail('Use payment, refund or cancel actions for this status');
      return prisma.order.update({ where: { id }, data: { status } });
    },
  },

  Order: {
    balanceDue: (o: any) => Math.max(0, round2(o.total - o.tipAmount - o.paidAmount)),
    items: (o: any) => prisma.orderItem.findMany({ where: { orderId: o.id }, orderBy: [{ course: 'asc' }, { createdAt: 'asc' }] }),
    payments: (o: any) => prisma.payment.findMany({ where: { orderId: o.id }, orderBy: { createdAt: 'asc' } }),
    user: (o: any) => (o.userId ? prisma.user.findUnique({ where: { id: o.userId } }) : null),
    customer: (o: any) => (o.customerId ? prisma.customer.findUnique({ where: { id: o.customerId } }) : null),
    location: (o: any) => prisma.location.findUnique({ where: { id: o.locationId } }),
    table: (o: any) => (o.tableId ? prisma.table.findUnique({ where: { id: o.tableId } }) : null),
  },

  OrderItem: {
    product: (i: any) => prisma.product.findUnique({ where: { id: i.productId } }),
    station: (i: any) => (i.stationId ? prisma.kitchenStation.findUnique({ where: { id: i.stationId } }) : null),
  },

  Payment: {
    user: (p: any) => (p.userId ? prisma.user.findUnique({ where: { id: p.userId } }) : null),
  },
};

