import { gql } from 'graphql-tag';
import { prisma } from '../../lib/prisma';
import { Ctx, AuthInfo, requireAuth, requirePerm, fail, audit, resolveLocationId, assertLocation } from '../../lib/context';
import { round2 } from '../../lib/pricing';

export const typeDefs = gql`
  type FloorPlanZone { id: ID! name: String! locationId: String! tables: [Table!]! }

  type Table {
    id: ID!
    name: String!
    capacity: Int!
    shape: String!
    x: Int!
    y: Int!
    width: Int!
    height: Int!
    status: TableStatus!
    zoneId: String!
    activeSession: TableSession
    currentOrder: Order
    sessions: [TableSession!]!
  }

  type TableSession {
    id: ID!
    guestCount: Int!
    startTime: DateTime!
    endTime: DateTime
    tableId: String!
    serverUserId: String
    server: User
  }

  type Reservation {
    id: ID!
    customerName: String!
    phone: String
    email: String
    partySize: Int!
    dateTime: DateTime!
    durationMin: Int!
    quotedWaitMin: Int
    status: ReservationStatus!
    notes: String
    tableId: String
    customerId: String
    locationId: String!
    createdAt: DateTime!
    table: Table
  }

  type CashMovement { id: ID! type: CashMovementType! amount: Float! reason: String createdAt: DateTime! }

  type Shift {
    id: ID!
    status: ShiftStatus!
    openingFloat: Float!
    closingCash: Float
    expectedCash: Float
    variance: Float
    notes: String
    openedAt: DateTime!
    closedAt: DateTime
    userId: String!
    locationId: String!
    user: User
    cashMovements: [CashMovement!]!
    summary: JSON!
  }

  type TimeEntry {
    id: ID!
    clockIn: DateTime!
    clockOut: DateTime
    breakMinutes: Int!
    hours: Float!
    userId: String!
    locationId: String!
    user: User
  }

  input TableInput { zoneId: ID name: String capacity: Int shape: String x: Int y: Int width: Int height: Int }

  input ReservationInput {
    locationId: ID customerName: String phone: String email: String partySize: Int dateTime: DateTime durationMin: Int
    quotedWaitMin: Int status: ReservationStatus notes: String tableId: ID customerId: ID
  }

  type Query {
    zones(locationId: ID!): [FloorPlanZone!]!
    reservations(locationId: ID, from: DateTime, to: DateTime, status: ReservationStatus): [Reservation!]!
    currentShift(locationId: ID): Shift
    shifts(locationId: ID, limit: Int): [Shift!]!
    shift(id: ID!): Shift
    myTimeEntry: TimeEntry
    timeEntries(locationId: ID, userId: ID, from: DateTime, to: DateTime): [TimeEntry!]!
  }

  type Mutation {
    createZone(locationId: ID!, name: String!): FloorPlanZone!
    updateZone(id: ID!, name: String!): FloorPlanZone!
    deleteZone(id: ID!): Boolean!
    createTable(zoneId: ID!, name: String!, capacity: Int!, shape: String!, x: Int!, y: Int!, width: Int!, height: Int!): Table!
    updateTable(id: ID!, input: TableInput!): Table!
    deleteTable(id: ID!): Boolean!
    updateTableStatus(id: ID!, status: TableStatus!): Table!
    seatTable(id: ID!, guestCount: Int!, serverUserId: ID): TableSession!
    checkoutTable(id: ID!): Table!

    createReservation(input: ReservationInput!): Reservation!
    updateReservation(id: ID!, input: ReservationInput!): Reservation!
    seatReservation(id: ID!, tableId: ID!): Reservation!

    openShift(locationId: ID, openingFloat: Float!): Shift!
    addCashMovement(shiftId: ID!, type: CashMovementType!, amount: Float!, reason: String): Shift!
    closeShift(shiftId: ID!, closingCash: Float!, notes: String): Shift!

    clockIn(locationId: ID): TimeEntry!
    clockOut(breakMinutes: Int): TimeEntry!
    updateTimeEntry(id: ID!, clockIn: DateTime, clockOut: DateTime, breakMinutes: Int): TimeEntry!
  }
`;

const OPEN_STATES = ['OPEN', 'PENDING', 'IN_PROGRESS', 'READY'];

async function ownTable(auth: AuthInfo, id: string) {
  const t = await prisma.table.findFirst({ where: { id, zone: { location: { organizationId: auth.orgId } } }, include: { zone: true } });
  if (!t) fail('Table not found', 'NOT_FOUND');
  return t!;
}

async function ownZone(auth: AuthInfo, id: string) {
  const z = await prisma.floorPlanZone.findFirst({ where: { id, location: { organizationId: auth.orgId } } });
  if (!z) fail('Zone not found', 'NOT_FOUND');
  return z!;
}

async function ownShift(auth: AuthInfo, id: string) {
  const s = await prisma.shift.findFirst({ where: { id, location: { organizationId: auth.orgId } } });
  if (!s) fail('Shift not found', 'NOT_FOUND');
  return s!;
}

async function seat(auth: AuthInfo, tableId: string, guestCount: number, serverUserId?: string | null) {
  const table = await ownTable(auth, tableId);
  if (!['AVAILABLE', 'NEEDS_CLEANING'].includes(table.status)) fail(`${table.name} is currently occupied`);
  await prisma.tableSession.updateMany({ where: { tableId, endTime: null }, data: { endTime: new Date() } });
  await prisma.table.update({ where: { id: tableId }, data: { status: 'SEATED' } });
  return prisma.tableSession.create({ data: { tableId, guestCount, serverUserId: serverUserId || auth.userId } });
}

/** Cash reconciliation for a drawer shift. */
export async function shiftSummary(shiftId: string) {
  const [shift, payments, movements] = await Promise.all([
    prisma.shift.findUnique({ where: { id: shiftId } }),
    prisma.payment.findMany({ where: { shiftId } }),
    prisma.cashMovement.findMany({ where: { shiftId } }),
  ]);
  const byMethod: Record<string, { sales: number; refunds: number; tips: number; count: number }> = {};
  for (const p of payments) {
    const m = (byMethod[p.method] ||= { sales: 0, refunds: 0, tips: 0, count: 0 });
    if (p.type === 'SALE') { m.sales += p.amount; m.tips += p.tip; m.count++; } else m.refunds += p.amount;
  }
  const cash = byMethod.CASH || { sales: 0, refunds: 0, tips: 0, count: 0 };
  const payIns = movements.filter((m) => m.type === 'PAY_IN').reduce((s, m) => s + m.amount, 0);
  const payOuts = movements.filter((m) => m.type === 'PAY_OUT').reduce((s, m) => s + m.amount, 0);
  const drops = movements.filter((m) => m.type === 'DROP').reduce((s, m) => s + m.amount, 0);
  const expectedCash = round2((shift?.openingFloat || 0) + cash.sales + cash.tips - cash.refunds + payIns - payOuts - drops);
  const orders = await prisma.order.findMany({ where: { shiftId }, select: { status: true, total: true, discountAmount: true, taxAmount: true } });
  return {
    openingFloat: shift?.openingFloat || 0,
    expectedCash,
    payIns: round2(payIns), payOuts: round2(payOuts), drops: round2(drops),
    byMethod: Object.fromEntries(Object.entries(byMethod).map(([k, v]) => [k, { sales: round2(v.sales), refunds: round2(v.refunds), tips: round2(v.tips), count: v.count }])),
    grossSales: round2(payments.filter((p) => p.type === 'SALE').reduce((s, p) => s + p.amount, 0)),
    refunds: round2(payments.filter((p) => p.type === 'REFUND').reduce((s, p) => s + p.amount, 0)),
    tips: round2(payments.reduce((s, p) => s + p.tip, 0)),
    orders: orders.filter((o) => o.status === 'COMPLETED' || o.status === 'REFUNDED').length,
    cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
    discounts: round2(orders.reduce((s, o) => s + o.discountAmount, 0)),
    tax: round2(orders.filter((o) => o.status === 'COMPLETED').reduce((s, o) => s + o.taxAmount, 0)),
  };
}

export const resolvers = {
  Query: {
    zones: async (_: any, { locationId }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      await assertLocation(auth, locationId);
      return prisma.floorPlanZone.findMany({ where: { locationId }, orderBy: { createdAt: 'asc' } });
    },

    reservations: async (_: any, { locationId, from, to, status }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'reservations.manage');
      const loc = await resolveLocationId(auth, locationId);
      return prisma.reservation.findMany({
        where: {
          locationId: loc,
          ...(status ? { status } : {}),
          ...(from || to ? { dateTime: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
        },
        orderBy: { dateTime: 'asc' },
      });
    },

    currentShift: async (_: any, { locationId }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      const loc = await resolveLocationId(auth, locationId);
      return prisma.shift.findFirst({ where: { locationId: loc, status: 'OPEN' }, orderBy: { openedAt: 'desc' } });
    },

    shifts: async (_: any, { locationId, limit }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'cash.manage', 'reports.view');
      return prisma.shift.findMany({
        where: { location: { organizationId: auth.orgId }, ...(locationId ? { locationId } : {}) },
        orderBy: { openedAt: 'desc' },
        take: Math.min(limit || 30, 200),
      });
    },

    shift: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'cash.manage', 'reports.view');
      return ownShift(auth, id);
    },

    myTimeEntry: async (_: any, __: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      return prisma.timeEntry.findFirst({ where: { userId: auth.userId, clockOut: null }, orderBy: { clockIn: 'desc' } });
    },

    timeEntries: async (_: any, { locationId, userId, from, to }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      const canSeeAll = auth.permissions.has('timeclock.manage') || auth.permissions.has('staff.view');
      return prisma.timeEntry.findMany({
        where: {
          location: { organizationId: auth.orgId },
          ...(locationId ? { locationId } : {}),
          ...(canSeeAll ? (userId ? { userId } : {}) : { userId: auth.userId }),
          ...(from || to ? { clockIn: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
        },
        orderBy: { clockIn: 'desc' },
        take: 500,
      });
    },
  },

  Mutation: {
    createZone: async (_: any, { locationId, name }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'tables.layout');
      await assertLocation(auth, locationId);
      return prisma.floorPlanZone.create({ data: { locationId, name } });
    },

    updateZone: async (_: any, { id, name }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'tables.layout');
      await ownZone(auth, id);
      return prisma.floorPlanZone.update({ where: { id }, data: { name } });
    },

    deleteZone: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'tables.layout');
      await ownZone(auth, id);
      const busy = await prisma.table.count({ where: { zoneId: id, status: { not: 'AVAILABLE' } } });
      if (busy) fail('Zone has occupied tables');
      await prisma.floorPlanZone.delete({ where: { id } });
      return true;
    },

    createTable: async (_: any, args: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'tables.layout');
      await ownZone(auth, args.zoneId);
      return prisma.table.create({ data: args });
    },

    updateTable: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'tables.layout');
      await ownTable(auth, id);
      if (input.zoneId) await ownZone(auth, input.zoneId);
      const data = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== null));
      return prisma.table.update({ where: { id }, data });
    },

    deleteTable: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'tables.layout');
      const t = await ownTable(auth, id);
      if (t.status !== 'AVAILABLE') fail('Table is in use');
      await prisma.table.delete({ where: { id } });
      return true;
    },

    updateTableStatus: async (_: any, { id, status }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'tables.manage');
      await ownTable(auth, id);
      if (status === 'AVAILABLE') await prisma.tableSession.updateMany({ where: { tableId: id, endTime: null }, data: { endTime: new Date() } });
      return prisma.table.update({ where: { id }, data: { status } });
    },

    seatTable: async (_: any, { id, guestCount, serverUserId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'tables.manage');
      if (guestCount < 1) fail('Guest count must be at least 1');
      return seat(auth, id, guestCount, serverUserId);
    },

    checkoutTable: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'tables.manage');
      await ownTable(auth, id);
      const open = await prisma.order.count({ where: { tableId: id, status: { in: OPEN_STATES as any } } });
      if (open) fail('Table has an unpaid check. Settle it from the POS first.');
      await prisma.tableSession.updateMany({ where: { tableId: id, endTime: null }, data: { endTime: new Date() } });
      return prisma.table.update({ where: { id }, data: { status: 'NEEDS_CLEANING' } });
    },

    createReservation: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'reservations.manage');
      const locationId = await resolveLocationId(auth, input.locationId);
      if (!input.customerName || !input.partySize) fail('Guest name and party size are required');
      if (input.tableId) await ownTable(auth, input.tableId);
      const status = input.status || 'BOOKED';
      const r = await prisma.reservation.create({
        data: {
          locationId, customerName: input.customerName, phone: input.phone, email: input.email,
          partySize: input.partySize, dateTime: input.dateTime ? new Date(input.dateTime) : new Date(),
          durationMin: input.durationMin || 90, quotedWaitMin: input.quotedWaitMin, status, notes: input.notes,
          tableId: input.tableId, customerId: input.customerId,
        },
      });
      await audit(auth, 'CREATE', 'Reservation', r.id, { name: r.customerName, party: r.partySize, status });
      return r;
    },

    updateReservation: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'reservations.manage');
      const r = await prisma.reservation.findFirst({ where: { id, location: { organizationId: auth.orgId } } });
      if (!r) fail('Reservation not found', 'NOT_FOUND');
      const { locationId, ...rest } = input;
      const data: any = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
      if (data.dateTime) data.dateTime = new Date(data.dateTime);
      return prisma.reservation.update({ where: { id }, data });
    },

    seatReservation: async (_: any, { id, tableId }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'reservations.manage');
      const r = await prisma.reservation.findFirst({ where: { id, location: { organizationId: auth.orgId } } });
      if (!r) fail('Reservation not found', 'NOT_FOUND');
      await seat(auth, tableId, r!.partySize);
      return prisma.reservation.update({ where: { id }, data: { status: 'SEATED', tableId } });
    },

    openShift: async (_: any, { locationId, openingFloat }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'cash.manage');
      const loc = await resolveLocationId(auth, locationId);
      const open = await prisma.shift.findFirst({ where: { locationId: loc, userId: auth.userId, status: 'OPEN' } });
      if (open) fail('You already have an open shift at this location');
      if (openingFloat < 0) fail('Opening float cannot be negative');
      const s = await prisma.shift.create({ data: { locationId: loc, userId: auth.userId, openingFloat } });
      await audit(auth, 'OPEN_SHIFT', 'Shift', s.id, { openingFloat });
      return s;
    },

    addCashMovement: async (_: any, { shiftId, type, amount, reason }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'cash.manage');
      const s = await ownShift(auth, shiftId);
      if (s.status !== 'OPEN') fail('Shift is closed');
      if (amount <= 0) fail('Amount must be positive');
      await prisma.cashMovement.create({ data: { shiftId, type, amount, reason, userId: auth.userId } });
      await audit(auth, type, 'Shift', shiftId, { amount, reason });
      return s;
    },

    closeShift: async (_: any, { shiftId, closingCash, notes }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'cash.manage');
      const s = await ownShift(auth, shiftId);
      if (s.status !== 'OPEN') fail('Shift is already closed');
      const summary = await shiftSummary(shiftId);
      const variance = round2(closingCash - summary.expectedCash);
      const closed = await prisma.shift.update({
        where: { id: shiftId },
        data: { status: 'CLOSED', closedAt: new Date(), closingCash, expectedCash: summary.expectedCash, variance, notes },
      });
      await audit(auth, 'CLOSE_SHIFT', 'Shift', shiftId, { closingCash, expected: summary.expectedCash, variance });
      return closed;
    },

    clockIn: async (_: any, { locationId }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      const loc = await resolveLocationId(auth, locationId);
      const open = await prisma.timeEntry.findFirst({ where: { userId: auth.userId, clockOut: null } });
      if (open) fail('You are already clocked in');
      return prisma.timeEntry.create({ data: { userId: auth.userId, locationId: loc } });
    },

    clockOut: async (_: any, { breakMinutes }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      const open = await prisma.timeEntry.findFirst({ where: { userId: auth.userId, clockOut: null } });
      if (!open) fail('You are not clocked in');
      return prisma.timeEntry.update({ where: { id: open!.id }, data: { clockOut: new Date(), breakMinutes: breakMinutes || 0 } });
    },

    updateTimeEntry: async (_: any, { id, clockIn, clockOut, breakMinutes }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'timeclock.manage');
      const e = await prisma.timeEntry.findFirst({ where: { id, location: { organizationId: auth.orgId } } });
      if (!e) fail('Time entry not found', 'NOT_FOUND');
      const updated = await prisma.timeEntry.update({
        where: { id },
        data: {
          ...(clockIn ? { clockIn: new Date(clockIn) } : {}),
          ...(clockOut ? { clockOut: new Date(clockOut) } : {}),
          ...(breakMinutes !== undefined && breakMinutes !== null ? { breakMinutes } : {}),
        },
      });
      await audit(auth, 'EDIT_TIME_ENTRY', 'TimeEntry', id, { clockIn, clockOut, breakMinutes });
      return updated;
    },
  },

  FloorPlanZone: {
    tables: (z: any) => prisma.table.findMany({ where: { zoneId: z.id }, orderBy: { name: 'asc' } }),
  },

  Table: {
    activeSession: (t: any) => prisma.tableSession.findFirst({ where: { tableId: t.id, endTime: null }, orderBy: { startTime: 'desc' } }),
    currentOrder: (t: any) => prisma.order.findFirst({ where: { tableId: t.id, status: { in: OPEN_STATES as any } }, orderBy: { createdAt: 'desc' } }),
    sessions: (t: any) => prisma.tableSession.findMany({ where: { tableId: t.id }, orderBy: { startTime: 'desc' }, take: 10 }),
  },

  TableSession: {
    server: (s: any) => (s.serverUserId ? prisma.user.findUnique({ where: { id: s.serverUserId } }) : null),
  },

  Reservation: {
    table: (r: any) => (r.tableId ? prisma.table.findUnique({ where: { id: r.tableId } }) : null),
  },

  Shift: {
    user: (s: any) => prisma.user.findUnique({ where: { id: s.userId } }),
    cashMovements: (s: any) => prisma.cashMovement.findMany({ where: { shiftId: s.id }, orderBy: { createdAt: 'asc' } }),
    summary: (s: any) => shiftSummary(s.id),
  },

  TimeEntry: {
    hours: (e: any) => {
      const end = e.clockOut ? new Date(e.clockOut).getTime() : Date.now();
      return round2(Math.max(0, (end - new Date(e.clockIn).getTime()) / 3600000 - (e.breakMinutes || 0) / 60));
    },
    user: (e: any) => prisma.user.findUnique({ where: { id: e.userId } }),
  },
};
