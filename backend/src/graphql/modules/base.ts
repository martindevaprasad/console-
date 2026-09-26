import { gql } from 'graphql-tag';
import { GraphQLScalarType, Kind } from 'graphql';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  enum OrgType { RESTAURANT BAKERY CAFE QUICK_SERVICE FINE_DINING CASUAL_DINING BAR_PUB FOOD_TRUCK CLOUD_KITCHEN FOOD_COURT CATERING HOTEL_RESTAURANT }
  enum OrgSize { SMALL MEDIUM LARGE ENTERPRISE }
  enum UserRole { OWNER MANAGER SHIFT_LEAD STAFF CUSTOMER }
  enum OrderStatus { OPEN PENDING IN_PROGRESS READY COMPLETED CANCELLED REFUNDED }
  enum PaymentStatus { UNPAID PARTIAL PAID PARTIALLY_REFUNDED REFUNDED }
  enum PaymentMethod { CASH CARD DIGITAL SPLIT GIFT_CARD LOYALTY HOUSE_ACCOUNT OTHER }
  enum PaymentType { SALE REFUND }
  enum TableStatus { AVAILABLE SEATED ORDERING WAITING_FOR_FOOD READY_FOR_PAYMENT NEEDS_CLEANING }
  enum OrderType { DINE_IN TAKEAWAY DELIVERY PICKUP DRIVE_THRU CATERING ROOM_SERVICE }
  enum ItemStatus { PENDING FIRED PREPARING READY SERVED VOIDED }
  enum DiscountType { PERCENT FIXED }
  enum DiscountScope { ORDER ITEM CATEGORY }
  enum ReservationStatus { BOOKED CONFIRMED WAITLIST SEATED COMPLETED CANCELLED NO_SHOW }
  enum ShiftStatus { OPEN CLOSED }
  enum CashMovementType { PAY_IN PAY_OUT DROP }
  enum StockMovementType { SALE PURCHASE WASTE ADJUSTMENT TRANSFER_IN TRANSFER_OUT COUNT RETURN }
  enum PurchaseOrderStatus { DRAFT SENT PARTIAL RECEIVED CANCELLED }
  enum DeviceType { POS KDS KIOSK PRINTER PAYMENT_TERMINAL CUSTOMER_DISPLAY }

  type Query { _health: String }
  type Mutation { _noop: Boolean }
`;

const parseLiteral = (ast: any): any => {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN: return ast.value;
    case Kind.INT:
    case Kind.FLOAT: return Number(ast.value);
    case Kind.OBJECT: return Object.fromEntries(ast.fields.map((f: any) => [f.name.value, parseLiteral(f.value)]));
    case Kind.LIST: return ast.values.map(parseLiteral);
    default: return null;
  }
};

export const resolvers = {
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    serialize: (v: any) => (v instanceof Date ? v.toISOString() : v),
    parseValue: (v: any) => new Date(v),
    parseLiteral: (ast: any) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
  }),
  JSON: new GraphQLScalarType({
    name: 'JSON',
    serialize: (v) => v,
    parseValue: (v) => v,
    parseLiteral,
  }),
  Query: { _health: () => 'ok' },
  Mutation: { _noop: () => true },
};
