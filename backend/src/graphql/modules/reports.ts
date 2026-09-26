import { gql } from 'graphql-tag';
import { prisma } from '../../lib/prisma';
import { Ctx, requirePerm, can, fail } from '../../lib/context';
import { round2 } from '../../lib/pricing';

export const typeDefs = gql`
  type Query {
    "Live operational snapshot for the dashboard. from/to bound 'today' in the viewer's timezone."
    dashboard(locationId: ID, from: DateTime!, to: DateTime!, compareFrom: DateTime, compareTo: DateTime): JSON!
    "Full sales analytics for a period, optionally for one location."
    salesReport(from: DateTime!, to: DateTime!, locationId: ID): JSON!
  }
`;

function tzParts(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
    return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
  } catch {
    return { day: date.toISOString().slice(0, 10), hour: date.getUTCHours() };
  }
}

const REVENUE_STATES = ['COMPLETED', 'REFUNDED'];

async function loadOrders(orgId: string, from: Date, to: Date, locationId?: string | null) {
  return prisma.order.findMany({
    where: { organizationId: orgId, createdAt: { gte: from, lte: to }, ...(locationId ? { locationId } : {}) },
    include: {
      items: { include: { product: { select: { categoryId: true, cost: true } } } },
      payments: true,
      user: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
    },
  });
}

function summarize(orders: any[]) {
  const done = orders.filter((o) => REVENUE_STATES.includes(o.status));
  const gross = done.reduce((s, o) => s + o.subtotal, 0);
  const discounts = done.reduce((s, o) => s + o.discountAmount, 0);
  const tax = done.reduce((s, o) => s + o.taxAmount, 0);
  const serviceCharge = done.reduce((s, o) => s + o.serviceCharge, 0);
  const tips = done.reduce((s, o) => s + o.tipAmount, 0);
  const refunds = done.reduce((s, o) => s + o.refundedAmount, 0);
  const total = done.reduce((s, o) => s + o.total, 0);
  const guests = done.reduce((s, o) => s + (o.guestCount || 0), 0);
  const cogs = done.reduce((s, o) => s + o.items.filter((i: any) => i.status !== 'VOIDED').reduce((a: number, i: any) => a + (i.product?.cost || 0) * i.quantity, 0), 0);
  const voids = orders.flatMap((o) => o.items).filter((i: any) => i.status === 'VOIDED' && i.voidReason);
  return {
    orders: done.length,
    grossSales: round2(gross),
    discounts: round2(discounts),
    netSales: round2(gross - discounts - refunds),
    tax: round2(tax),
    serviceCharge: round2(serviceCharge),
    tips: round2(tips),
    refunds: round2(refunds),
    total: round2(total - refunds),
    guests,
    avgTicket: done.length ? round2((gross - discounts) / done.length) : 0,
    perGuest: guests ? round2((gross - discounts) / guests) : 0,
    cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
    voidCount: voids.length,
    voidValue: round2(voids.reduce((s: number, i: any) => s + i.subtotal, 0)),
    cogs: round2(cogs),
    grossMargin: gross - discounts > 0 ? round2(((gross - discounts - cogs) / (gross - discounts)) * 100) : 0,
  };
}

function groupSum(orders: any[], keyFn: (o: any) => string) {
  const map = new Map<string, { key: string; sales: number; orders: number }>();
  for (const o of orders.filter((x) => REVENUE_STATES.includes(x.status))) {
    const k = keyFn(o);
    const row = map.get(k) || { key: k, sales: 0, orders: 0 };
    row.sales += o.subtotal - o.discountAmount;
    row.orders += 1;
    map.set(k, row);
  }
  return [...map.values()].map((r) => ({ ...r, sales: round2(r.sales) })).sort((a, b) => b.sales - a.sales);
}

function productMix(orders: any[], categories: Map<string, string>) {
  const products = new Map<string, { name: string; quantity: number; sales: number }>();
  const cats = new Map<string, { key: string; sales: number; quantity: number }>();
  for (const o of orders.filter((x) => REVENUE_STATES.includes(x.status))) {
    for (const i of o.items) {
      if (i.status === 'VOIDED') continue;
      const net = i.subtotal - i.discount;
      const p = products.get(i.productId) || { name: i.name || 'Item', quantity: 0, sales: 0 };
      p.quantity += i.quantity; p.sales += net;
      products.set(i.productId, p);
      const cName = categories.get(i.product?.categoryId) || 'Uncategorised';
      const c = cats.get(cName) || { key: cName, sales: 0, quantity: 0 };
      c.sales += net; c.quantity += i.quantity;
      cats.set(cName, c);
    }
  }
  return {
    topProducts: [...products.entries()].map(([id, p]) => ({ id, ...p, sales: round2(p.sales) })).sort((a, b) => b.sales - a.sales),
    byCategory: [...cats.values()].map((c) => ({ ...c, sales: round2(c.sales) })).sort((a, b) => b.sales - a.sales),
  };
}

function paymentMix(orders: any[]) {
  const map = new Map<string, { key: string; amount: number; count: number; tips: number }>();
  for (const o of orders) {
    for (const p of o.payments) {
      const row = map.get(p.method) || { key: p.method, amount: 0, count: 0, tips: 0 };
      row.amount += p.type === 'SALE' ? p.amount : -p.amount;
      row.tips += p.tip;
      if (p.type === 'SALE') row.count++;
      map.set(p.method, row);
    }
  }
  return [...map.values()].map((r) => ({ ...r, amount: round2(r.amount), tips: round2(r.tips) })).sort((a, b) => b.amount - a.amount);
}

export const resolvers = {
  Query: {
    dashboard: async (_: any, { locationId, from, to, compareFrom, compareTo }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'reports.view', 'pos.access');
      if (locationId) {
        const loc = await prisma.location.findFirst({ where: { id: locationId, organizationId: auth.orgId } });
        if (!loc) fail('Location not found', 'NOT_FOUND');
      }
      const org = await prisma.organization.findUnique({ where: { id: auth.orgId } });
      const tz = org?.timezone || 'UTC';
      const [orders, prev, categories, openOrders, tables, kitchen, clockedIn, lowProducts, lowIngredients] = await Promise.all([
        loadOrders(auth.orgId, new Date(from), new Date(to), locationId),
        compareFrom ? loadOrders(auth.orgId, new Date(compareFrom), new Date(compareTo), locationId) : Promise.resolve([]),
        prisma.category.findMany({ where: { organizationId: auth.orgId } }),
        prisma.order.findMany({ where: { organizationId: auth.orgId, ...(locationId ? { locationId } : {}), status: { in: ['OPEN', 'PENDING', 'IN_PROGRESS', 'READY'] } }, select: { total: true, orderType: true } }),
        prisma.table.groupBy({ by: ['status'], where: { zone: { location: { organizationId: auth.orgId, ...(locationId ? { id: locationId } : {}) } } }, _count: true }),
        prisma.orderItem.count({ where: { status: { in: ['FIRED', 'PREPARING'] }, order: { organizationId: auth.orgId, ...(locationId ? { locationId } : {}) } } }),
        prisma.timeEntry.count({ where: { clockOut: null, location: { organizationId: auth.orgId }, ...(locationId ? { locationId } : {}) } }),
        prisma.inventory.findMany({ where: { product: { organizationId: auth.orgId, trackStock: true, isActive: true }, ...(locationId ? { locationId } : {}) }, select: { quantity: true, minStock: true } }),
        prisma.stockLevel.findMany({ where: { stockItem: { organizationId: auth.orgId, isActive: true }, ...(locationId ? { locationId } : {}) }, select: { quantity: true, reorderPoint: true } }),
      ]);
      const catNames = new Map(categories.map((c) => [c.id, c.name]));
      const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, sales: 0, orders: 0 }));
      for (const o of orders.filter((x: any) => REVENUE_STATES.includes(x.status))) {
        const h = tzParts(o.createdAt, tz).hour;
        hourly[h].sales = round2(hourly[h].sales + o.subtotal - o.discountAmount);
        hourly[h].orders += 1;
      }
      const summary = summarize(orders);
      const financial = can(auth, 'reports.financial');
      return {
        summary: financial ? summary : { orders: summary.orders, guests: summary.guests, avgTicket: summary.avgTicket, grossSales: summary.grossSales, netSales: summary.netSales },
        compare: compareFrom ? summarize(prev) : null,
        hourly,
        byOrderType: groupSum(orders, (o) => o.orderType),
        byChannel: groupSum(orders, (o) => o.channel),
        topProducts: productMix(orders, catNames).topProducts.slice(0, 8),
        payments: financial ? paymentMix(orders) : [],
        live: {
          openOrders: openOrders.length,
          openValue: round2(openOrders.reduce((s, o) => s + o.total, 0)),
          tables: Object.fromEntries(tables.map((t: any) => [t.status, t._count])),
          kitchenQueue: kitchen,
          staffOnClock: clockedIn,
          lowStock: lowProducts.filter((i) => i.quantity <= i.minStock).length + lowIngredients.filter((l) => l.quantity <= l.reorderPoint).length,
        },
      };
    },

    salesReport: async (_: any, { from, to, locationId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'reports.view');
      const f = new Date(from);
      const t = new Date(to);
      if (t.getTime() - f.getTime() > 400 * 86400000) fail('Report range is limited to ~13 months');
      const org = await prisma.organization.findUnique({ where: { id: auth.orgId } });
      const tz = org?.timezone || 'UTC';
      const [orders, categories] = await Promise.all([
        loadOrders(auth.orgId, f, t, locationId),
        prisma.category.findMany({ where: { organizationId: auth.orgId } }),
      ]);
      const mix = productMix(orders, new Map(categories.map((c) => [c.id, c.name])));
      const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, sales: 0, orders: 0 }));
      const daily = new Map<string, { day: string; sales: number; orders: number; guests: number }>();
      for (const o of orders.filter((x: any) => REVENUE_STATES.includes(x.status))) {
        const { day, hour } = tzParts(o.createdAt, tz);
        const net = o.subtotal - o.discountAmount;
        hourly[hour].sales += net; hourly[hour].orders += 1;
        const d = daily.get(day) || { day, sales: 0, orders: 0, guests: 0 };
        d.sales += net; d.orders += 1; d.guests += o.guestCount || 0;
        daily.set(day, d);
      }
      const staff = new Map<string, { key: string; sales: number; orders: number; tips: number }>();
      for (const o of orders.filter((x: any) => REVENUE_STATES.includes(x.status))) {
        const k = o.user?.name || 'Unassigned';
        const row = staff.get(k) || { key: k, sales: 0, orders: 0, tips: 0 };
        row.sales += o.subtotal - o.discountAmount; row.orders += 1; row.tips += o.tipAmount;
        staff.set(k, row);
      }
      const financial = can(auth, 'reports.financial');
      const summary = summarize(orders);
      return {
        currency: org?.currency,
        summary: financial ? summary : { ...summary, cogs: undefined, grossMargin: undefined },
        daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)).map((d) => ({ ...d, sales: round2(d.sales) })),
        hourly: hourly.map((h) => ({ ...h, sales: round2(h.sales) })),
        byOrderType: groupSum(orders, (o) => o.orderType),
        byChannel: groupSum(orders, (o) => o.channel),
        byLocation: groupSum(orders, (o) => o.location?.name || '—'),
        byCategory: mix.byCategory,
        topProducts: mix.topProducts.slice(0, 50),
        payments: financial ? paymentMix(orders) : [],
        byStaff: [...staff.values()].map((s) => ({ ...s, sales: round2(s.sales), tips: round2(s.tips) })).sort((a, b) => b.sales - a.sales),
        taxBreakdown: financial ? Object.values(orders.filter((o: any) => o.status === 'COMPLETED').flatMap((o: any) => (o.taxBreakdown as any[]) || []).reduce((acc: any, b: any) => {
          const k = `${b.name}@${b.rate}`;
          acc[k] = acc[k] || { name: b.name, rate: b.rate, taxable: 0, amount: 0 };
          acc[k].taxable = round2(acc[k].taxable + b.taxable);
          acc[k].amount = round2(acc[k].amount + b.amount);
          return acc;
        }, {})) : [],
      };
    },
  },
};
