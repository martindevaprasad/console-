export const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: 'Dine-in',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery',
  PICKUP: 'Pickup',
  DRIVE_THRU: 'Drive-thru',
  CATERING: 'Catering',
  ROOM_SERVICE: 'Room service',
};

export const ALL_ORDER_TYPES = Object.keys(ORDER_TYPE_LABELS);

export const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  DIGITAL: 'Digital / UPI',
  GIFT_CARD: 'Gift card',
  LOYALTY: 'Loyalty points',
  HOUSE_ACCOUNT: 'House account',
  OTHER: 'Other',
  SPLIT: 'Split',
};

export const ORDER_STATUS_BADGE: Record<string, string> = {
  OPEN: 'badge-info',
  PENDING: 'badge-warning',
  IN_PROGRESS: 'badge-warning',
  READY: 'badge-primary',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-neutral',
  REFUNDED: 'badge-danger',
};

export const PAYMENT_STATUS_BADGE: Record<string, string> = {
  UNPAID: 'badge-warning',
  PARTIAL: 'badge-info',
  PAID: 'badge-success',
  PARTIALLY_REFUNDED: 'badge-danger',
  REFUNDED: 'badge-danger',
};

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  SHIFT_LEAD: 'Shift lead',
  STAFF: 'Staff',
};

export const MODULE_INFO: { key: string; label: string; desc: string }[] = [
  { key: 'tables', label: 'Table service', desc: 'Floor plans, seating, table checks' },
  { key: 'reservations', label: 'Reservations & waitlist', desc: 'Bookings, walk-in queue, quoted waits' },
  { key: 'kds', label: 'Kitchen display (KDS)', desc: 'Station routing, ticket timers, bump bar' },
  { key: 'inventory', label: 'Inventory', desc: 'Stock levels, counts, waste, 86 items' },
  { key: 'recipes', label: 'Recipes & food cost', desc: 'Ingredient deduction per sale, theoretical cost' },
  { key: 'purchasing', label: 'Purchasing', desc: 'Suppliers, purchase orders, receiving' },
  { key: 'customers', label: 'Customers (CRM)', desc: 'Guest profiles, history, house accounts' },
  { key: 'loyalty', label: 'Loyalty', desc: 'Earn & redeem points at the POS' },
  { key: 'promotions', label: 'Promotions', desc: 'Happy hours, codes, auto discounts' },
  { key: 'cashManagement', label: 'Cash management', desc: 'Drawer shifts, pay-ins/outs, Z reports' },
  { key: 'timeclock', label: 'Time clock', desc: 'Clock in/out, breaks, labour hours' },
  { key: 'onlineOrdering', label: 'Online & aggregator orders', desc: 'Web, QR and delivery-partner channels' },
  { key: 'multiLocation', label: 'Multi-location', desc: 'Multiple outlets, central menu, roll-up reporting' },
];

export const CHANNELS = ['POS', 'KIOSK', 'ONLINE', 'QR', 'AGGREGATOR', 'PHONE'];

export const DIETARY = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'NUT_FREE', 'HALAL', 'KOSHER', 'SPICY'];

export const TABLE_STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  AVAILABLE: { color: 'var(--color-success-light)', bg: 'var(--color-success-glow)', label: 'Available' },
  SEATED: { color: '#93c5fd', bg: 'var(--color-info-glow)', label: 'Seated' },
  ORDERING: { color: 'var(--color-primary-light)', bg: 'var(--color-primary-glow)', label: 'Ordering' },
  WAITING_FOR_FOOD: { color: 'var(--color-warning-light)', bg: 'var(--color-warning-glow)', label: 'Waiting food' },
  READY_FOR_PAYMENT: { color: 'var(--color-accent-light)', bg: 'var(--color-accent-glow)', label: 'Bill requested' },
  NEEDS_CLEANING: { color: 'var(--text-secondary)', bg: 'rgba(148, 163, 184, 0.12)', label: 'Needs cleaning' },
};
