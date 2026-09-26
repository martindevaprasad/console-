// Business-type templates and country presets used by onboarding.
// Every restaurant format is configuration, not code: a template decides the
// service model, enabled modules, order types, stations and a starter menu.

export type ModuleKey =
  | 'tables' | 'reservations' | 'kds' | 'inventory' | 'recipes' | 'purchasing'
  | 'customers' | 'loyalty' | 'promotions' | 'cashManagement' | 'timeclock'
  | 'onlineOrdering' | 'multiLocation';

export interface OrgSettings {
  serviceModel: 'TABLE_SERVICE' | 'COUNTER' | 'HYBRID' | 'DELIVERY_ONLY';
  orderTypes: string[];
  modules: Record<ModuleKey, boolean>;
  pos: {
    courses: boolean;
    seats: boolean;
    tipping: boolean;
    tipPresets: number[];
    serviceChargePct: number;
    serviceChargeMinGuests: number;
    cashRounding: number;
    autoFire: boolean;
    requireGuestCount: boolean;
  };
  security: {
    voidRequiresManager: boolean;
    refundRequiresManager: boolean;
    maxDiscountPctWithoutApproval: number;
    pinSwitchUser: boolean;
  };
  loyalty: { pointsPerUnit: number; pointValue: number; minRedeemPoints: number };
  receipt: { header: string; footer: string; showTaxBreakdown: boolean };
  taxLabel: string;
}

export const DEFAULT_SETTINGS: OrgSettings = {
  serviceModel: 'HYBRID',
  orderTypes: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
  modules: {
    tables: true, reservations: true, kds: true, inventory: true, recipes: false, purchasing: false,
    customers: true, loyalty: false, promotions: true, cashManagement: true, timeclock: true,
    onlineOrdering: false, multiLocation: false,
  },
  pos: {
    courses: false, seats: false, tipping: true, tipPresets: [10, 15, 20],
    serviceChargePct: 0, serviceChargeMinGuests: 0, cashRounding: 0, autoFire: false, requireGuestCount: false,
  },
  security: { voidRequiresManager: true, refundRequiresManager: true, maxDiscountPctWithoutApproval: 10, pinSwitchUser: true },
  loyalty: { pointsPerUnit: 1, pointValue: 0.01, minRedeemPoints: 100 },
  receipt: { header: '', footer: 'Thank you for dining with us!', showTaxBreakdown: true },
  taxLabel: 'Tax',
};

/** Deep-merge stored settings over defaults so new keys always exist. */
export function resolveSettings(stored: any): OrgSettings {
  const s = (stored && typeof stored === 'object') ? stored : {};
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    modules: { ...DEFAULT_SETTINGS.modules, ...(s.modules || {}) },
    pos: { ...DEFAULT_SETTINGS.pos, ...(s.pos || {}) },
    security: { ...DEFAULT_SETTINGS.security, ...(s.security || {}) },
    loyalty: { ...DEFAULT_SETTINGS.loyalty, ...(s.loyalty || {}) },
    receipt: { ...DEFAULT_SETTINGS.receipt, ...(s.receipt || {}) },
  };
}

interface Template {
  label: string;
  description: string;
  serviceModel: OrgSettings['serviceModel'];
  orderTypes: string[];
  modules: Partial<Record<ModuleKey, boolean>>;
  pos: Partial<OrgSettings['pos']>;
  stations: string[];
  zones: { name: string; tables: number; capacity: number }[];
  menu: { category: string; color: string; station?: string; items: [string, number][] }[];
  modifierGroups?: { name: string; min: number; max: number; options: [string, number][]; categories: string[] }[];
  trackFinishedGoods?: boolean;
}

export const BUSINESS_TEMPLATES: Record<string, Template> = {
  FINE_DINING: {
    label: 'Fine Dining', description: 'Coursed table service, seat-level ordering, service charge',
    serviceModel: 'TABLE_SERVICE', orderTypes: ['DINE_IN', 'TAKEAWAY'],
    modules: { tables: true, reservations: true, kds: true, recipes: true, loyalty: true },
    pos: { courses: true, seats: true, tipping: true, serviceChargePct: 10, serviceChargeMinGuests: 6, requireGuestCount: true },
    stations: ['Hot Kitchen', 'Garde Manger', 'Pastry', 'Bar'],
    zones: [{ name: 'Main Dining', tables: 12, capacity: 4 }, { name: 'Private Room', tables: 2, capacity: 10 }],
    menu: [
      { category: 'Starters', color: '#06b6d4', station: 'Garde Manger', items: [['Burrata & Heirloom Tomato', 16], ['Beef Tartare', 19]] },
      { category: 'Mains', color: '#7c3aed', station: 'Hot Kitchen', items: [['Dry-aged Ribeye', 58], ['Pan-seared Halibut', 42]] },
      { category: 'Desserts', color: '#f59e0b', station: 'Pastry', items: [['Chocolate Soufflé', 14], ['Crème Brûlée', 12]] },
      { category: 'Wine', color: '#ef4444', station: 'Bar', items: [['House Red (glass)', 14], ['Champagne (glass)', 22]] },
    ],
    modifierGroups: [{ name: 'Steak Temperature', min: 1, max: 1, options: [['Rare', 0], ['Medium Rare', 0], ['Medium', 0], ['Well Done', 0]], categories: ['Mains'] }],
  },
  CASUAL_DINING: {
    label: 'Casual Dining', description: 'Table service with takeaway & delivery',
    serviceModel: 'HYBRID', orderTypes: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
    modules: { tables: true, reservations: true, kds: true, loyalty: true },
    pos: { tipping: true },
    stations: ['Kitchen', 'Bar'],
    zones: [{ name: 'Dining Room', tables: 10, capacity: 4 }, { name: 'Patio', tables: 6, capacity: 2 }],
    menu: [
      { category: 'Starters', color: '#06b6d4', station: 'Kitchen', items: [['Chicken Wings', 11], ['Loaded Nachos', 12]] },
      { category: 'Mains', color: '#7c3aed', station: 'Kitchen', items: [['Classic Burger', 15], ['Grilled Salmon', 22], ['Chicken Alfredo', 18]] },
      { category: 'Sides', color: '#10b981', station: 'Kitchen', items: [['Fries', 5], ['Side Salad', 6]] },
      { category: 'Beverages', color: '#3b82f6', station: 'Bar', items: [['Soft Drink', 3], ['Draft Beer', 7]] },
    ],
    modifierGroups: [{ name: 'Add-ons', min: 0, max: 3, options: [['Extra Cheese', 1.5], ['Bacon', 2], ['Avocado', 2]], categories: ['Mains'] }],
  },
  RESTAURANT: {
    label: 'Restaurant (General)', description: 'Flexible table + counter service',
    serviceModel: 'HYBRID', orderTypes: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
    modules: { tables: true, reservations: true, kds: true },
    pos: { tipping: true },
    stations: ['Kitchen', 'Bar'],
    zones: [{ name: 'Main Hall', tables: 10, capacity: 4 }],
    menu: [
      { category: 'Starters', color: '#06b6d4', station: 'Kitchen', items: [['Soup of the Day', 7], ['Garlic Bread', 5]] },
      { category: 'Mains', color: '#7c3aed', station: 'Kitchen', items: [['Grilled Chicken', 16], ['Vegetable Curry', 14]] },
      { category: 'Beverages', color: '#3b82f6', station: 'Bar', items: [['Fresh Juice', 5], ['Soft Drink', 3]] },
    ],
  },
  QUICK_SERVICE: {
    label: 'Quick Service (QSR)', description: 'Counter ordering, combos, drive-thru, speed of service',
    serviceModel: 'COUNTER', orderTypes: ['TAKEAWAY', 'DINE_IN', 'DRIVE_THRU', 'DELIVERY'],
    modules: { tables: false, reservations: false, kds: true, loyalty: true, recipes: true },
    pos: { tipping: false, autoFire: true },
    stations: ['Grill', 'Fryer', 'Assembly'],
    zones: [],
    menu: [
      { category: 'Burgers', color: '#7c3aed', station: 'Grill', items: [['Cheeseburger', 6.5], ['Double Stack', 8.5], ['Chicken Burger', 7]] },
      { category: 'Sides', color: '#f59e0b', station: 'Fryer', items: [['Fries (M)', 3], ['Onion Rings', 3.5]] },
      { category: 'Drinks', color: '#3b82f6', station: 'Assembly', items: [['Cola', 2], ['Milkshake', 4]] },
    ],
    modifierGroups: [{ name: 'Size', min: 1, max: 1, options: [['Regular', 0], ['Large', 1]], categories: ['Sides', 'Drinks'] }],
  },
  CAFE: {
    label: 'Café / Coffee Shop', description: 'Counter service, drink customisation, loyalty',
    serviceModel: 'COUNTER', orderTypes: ['TAKEAWAY', 'DINE_IN'],
    modules: { tables: false, reservations: false, kds: true, loyalty: true, inventory: true },
    pos: { tipping: true, tipPresets: [5, 10, 15], autoFire: true },
    stations: ['Barista', 'Kitchen'],
    zones: [],
    menu: [
      { category: 'Coffee', color: '#7c3aed', station: 'Barista', items: [['Espresso', 3], ['Cappuccino', 4.5], ['Latte', 4.8]] },
      { category: 'Tea', color: '#10b981', station: 'Barista', items: [['Green Tea', 3.5], ['Chai Latte', 4.5]] },
      { category: 'Bakery', color: '#f59e0b', station: 'Kitchen', items: [['Croissant', 3.5], ['Blueberry Muffin', 3.8]] },
    ],
    modifierGroups: [
      { name: 'Milk', min: 0, max: 1, options: [['Whole', 0], ['Oat', 0.6], ['Almond', 0.6]], categories: ['Coffee', 'Tea'] },
      { name: 'Size', min: 1, max: 1, options: [['Small', 0], ['Medium', 0.5], ['Large', 1]], categories: ['Coffee'] },
    ],
  },
  BAKERY: {
    label: 'Bakery / Patisserie', description: 'Retail counter, finished-goods stock, pre-orders',
    serviceModel: 'COUNTER', orderTypes: ['TAKEAWAY', 'PICKUP', 'DELIVERY', 'CATERING'],
    modules: { tables: false, reservations: false, kds: false, inventory: true, recipes: true, customers: true },
    pos: { tipping: false, autoFire: true },
    stations: ['Counter'],
    zones: [],
    trackFinishedGoods: true,
    menu: [
      { category: 'Breads', color: '#f59e0b', items: [['Sourdough Loaf', 7], ['Baguette', 3.5]] },
      { category: 'Pastries', color: '#7c3aed', items: [['Butter Croissant', 3.2], ['Pain au Chocolat', 3.6]] },
      { category: 'Cakes', color: '#ef4444', items: [['Cheesecake Slice', 5.5], ['Whole Celebration Cake', 45]] },
    ],
  },
  BAR_PUB: {
    label: 'Bar / Pub', description: 'Open tabs, bar-first service, kitchen bites',
    serviceModel: 'HYBRID', orderTypes: ['DINE_IN', 'TAKEAWAY'],
    modules: { tables: true, reservations: false, kds: true, inventory: true, recipes: true },
    pos: { tipping: true },
    stations: ['Bar', 'Kitchen'],
    zones: [{ name: 'Bar Floor', tables: 8, capacity: 4 }, { name: 'Bar Counter', tables: 10, capacity: 1 }],
    menu: [
      { category: 'Beer', color: '#f59e0b', station: 'Bar', items: [['Lager (pint)', 7], ['IPA (pint)', 8]] },
      { category: 'Cocktails', color: '#7c3aed', station: 'Bar', items: [['Mojito', 12], ['Old Fashioned', 13]] },
      { category: 'Bar Bites', color: '#06b6d4', station: 'Kitchen', items: [['Sliders', 11], ['Fish & Chips', 16]] },
    ],
  },
  FOOD_TRUCK: {
    label: 'Food Truck', description: 'Lean counter service, single menu, fast checkout',
    serviceModel: 'COUNTER', orderTypes: ['TAKEAWAY'],
    modules: { tables: false, reservations: false, kds: false, customers: false, promotions: false, timeclock: false },
    pos: { tipping: true, autoFire: true },
    stations: ['Line'],
    zones: [],
    menu: [
      { category: 'Mains', color: '#7c3aed', items: [['Street Tacos (3)', 10], ['Loaded Burrito', 12]] },
      { category: 'Drinks', color: '#3b82f6', items: [['Horchata', 4], ['Bottled Water', 2]] },
    ],
  },
  CLOUD_KITCHEN: {
    label: 'Cloud / Dark Kitchen', description: 'Delivery-only, multi-brand, aggregator channels',
    serviceModel: 'DELIVERY_ONLY', orderTypes: ['DELIVERY', 'PICKUP'],
    modules: { tables: false, reservations: false, kds: true, onlineOrdering: true, recipes: true, inventory: true },
    pos: { tipping: false, autoFire: true },
    stations: ['Hot Line', 'Cold Line', 'Packing'],
    zones: [],
    menu: [
      { category: 'Bowls', color: '#10b981', station: 'Cold Line', items: [['Poke Bowl', 14], ['Burrito Bowl', 12]] },
      { category: 'Wraps', color: '#7c3aed', station: 'Hot Line', items: [['Chicken Wrap', 10], ['Falafel Wrap', 9]] },
    ],
  },
  FOOD_COURT: {
    label: 'Food Court Outlet', description: 'High-volume counter with shared seating',
    serviceModel: 'COUNTER', orderTypes: ['DINE_IN', 'TAKEAWAY'],
    modules: { tables: false, reservations: false, kds: true },
    pos: { tipping: false, autoFire: true },
    stations: ['Kitchen'],
    zones: [],
    menu: [
      { category: 'Meals', color: '#7c3aed', station: 'Kitchen', items: [['Fried Rice', 8], ['Noodle Box', 8.5]] },
      { category: 'Drinks', color: '#3b82f6', station: 'Kitchen', items: [['Iced Tea', 2.5]] },
    ],
  },
  CATERING: {
    label: 'Catering', description: 'Scheduled large orders, deposits, pickup & delivery',
    serviceModel: 'DELIVERY_ONLY', orderTypes: ['CATERING', 'PICKUP', 'DELIVERY'],
    modules: { tables: false, reservations: false, kds: true, customers: true, inventory: true, recipes: true, purchasing: true },
    pos: { tipping: false },
    stations: ['Production Kitchen'],
    zones: [],
    menu: [
      { category: 'Platters', color: '#7c3aed', station: 'Production Kitchen', items: [['Sandwich Platter (10)', 65], ['Fruit Platter', 45]] },
      { category: 'Hot Trays', color: '#f59e0b', station: 'Production Kitchen', items: [['Lasagna Tray', 80]] },
    ],
  },
  HOTEL_RESTAURANT: {
    label: 'Hotel Restaurant', description: 'Outlets, room service, house accounts',
    serviceModel: 'TABLE_SERVICE', orderTypes: ['DINE_IN', 'ROOM_SERVICE', 'TAKEAWAY'],
    modules: { tables: true, reservations: true, kds: true, customers: true, multiLocation: true },
    pos: { courses: true, tipping: true, serviceChargePct: 10 },
    stations: ['Main Kitchen', 'Bar', 'Room Service'],
    zones: [{ name: 'Restaurant', tables: 14, capacity: 4 }, { name: 'Lobby Lounge', tables: 6, capacity: 2 }],
    menu: [
      { category: 'Breakfast', color: '#f59e0b', station: 'Main Kitchen', items: [['Continental Breakfast', 22], ['Eggs Benedict', 18]] },
      { category: 'All Day', color: '#7c3aed', station: 'Main Kitchen', items: [['Club Sandwich', 19], ['Caesar Salad', 16]] },
      { category: 'Bar', color: '#06b6d4', station: 'Bar', items: [['Signature Cocktail', 16]] },
    ],
  },
};

// Size tier toggles modules that only make sense at scale.
export const SIZE_MODULES: Record<string, Partial<Record<ModuleKey, boolean>>> = {
  SMALL: { multiLocation: false, purchasing: false },
  MEDIUM: { multiLocation: true, purchasing: true, timeclock: true },
  LARGE: { multiLocation: true, purchasing: true, timeclock: true, inventory: true, recipes: true },
  ENTERPRISE: { multiLocation: true, purchasing: true, timeclock: true, inventory: true, recipes: true, loyalty: true },
};

export interface CountryPreset {
  code: string; name: string; currency: string; locale: string; timezone: string;
  taxLabel: string; taxRate: number; taxInclusive: boolean; cashRounding: number;
  serviceChargePct?: number; tipping: boolean;
}

export const COUNTRY_PRESETS: CountryPreset[] = [
  { code: 'US', name: 'United States', currency: 'USD', locale: 'en-US', timezone: 'America/New_York', taxLabel: 'Sales Tax', taxRate: 8.875, taxInclusive: false, cashRounding: 0, tipping: true },
  { code: 'CA', name: 'Canada', currency: 'CAD', locale: 'en-CA', timezone: 'America/Toronto', taxLabel: 'HST', taxRate: 13, taxInclusive: false, cashRounding: 0.05, tipping: true },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', locale: 'en-GB', timezone: 'Europe/London', taxLabel: 'VAT', taxRate: 20, taxInclusive: true, cashRounding: 0, serviceChargePct: 12.5, tipping: true },
  { code: 'IE', name: 'Ireland', currency: 'EUR', locale: 'en-IE', timezone: 'Europe/Dublin', taxLabel: 'VAT', taxRate: 13.5, taxInclusive: true, cashRounding: 0, tipping: true },
  { code: 'DE', name: 'Germany', currency: 'EUR', locale: 'de-DE', timezone: 'Europe/Berlin', taxLabel: 'MwSt', taxRate: 19, taxInclusive: true, cashRounding: 0, tipping: true },
  { code: 'FR', name: 'France', currency: 'EUR', locale: 'fr-FR', timezone: 'Europe/Paris', taxLabel: 'TVA', taxRate: 10, taxInclusive: true, cashRounding: 0, tipping: false },
  { code: 'ES', name: 'Spain', currency: 'EUR', locale: 'es-ES', timezone: 'Europe/Madrid', taxLabel: 'IVA', taxRate: 10, taxInclusive: true, cashRounding: 0, tipping: false },
  { code: 'IT', name: 'Italy', currency: 'EUR', locale: 'it-IT', timezone: 'Europe/Rome', taxLabel: 'IVA', taxRate: 10, taxInclusive: true, cashRounding: 0, tipping: false },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', locale: 'nl-NL', timezone: 'Europe/Amsterdam', taxLabel: 'BTW', taxRate: 9, taxInclusive: true, cashRounding: 0.05, tipping: false },
  { code: 'IN', name: 'India', currency: 'INR', locale: 'en-IN', timezone: 'Asia/Kolkata', taxLabel: 'GST', taxRate: 5, taxInclusive: false, cashRounding: 1, tipping: false },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', locale: 'en-AE', timezone: 'Asia/Dubai', taxLabel: 'VAT', taxRate: 5, taxInclusive: true, cashRounding: 0, tipping: true },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', locale: 'ar-SA', timezone: 'Asia/Riyadh', taxLabel: 'VAT', taxRate: 15, taxInclusive: true, cashRounding: 0, tipping: false },
  { code: 'SG', name: 'Singapore', currency: 'SGD', locale: 'en-SG', timezone: 'Asia/Singapore', taxLabel: 'GST', taxRate: 9, taxInclusive: false, cashRounding: 0.05, serviceChargePct: 10, tipping: false },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', locale: 'ms-MY', timezone: 'Asia/Kuala_Lumpur', taxLabel: 'SST', taxRate: 6, taxInclusive: false, cashRounding: 0.05, serviceChargePct: 10, tipping: false },
  { code: 'JP', name: 'Japan', currency: 'JPY', locale: 'ja-JP', timezone: 'Asia/Tokyo', taxLabel: 'Consumption Tax', taxRate: 10, taxInclusive: true, cashRounding: 0, tipping: false },
  { code: 'AU', name: 'Australia', currency: 'AUD', locale: 'en-AU', timezone: 'Australia/Sydney', taxLabel: 'GST', taxRate: 10, taxInclusive: true, cashRounding: 0.05, tipping: false },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', locale: 'en-NZ', timezone: 'Pacific/Auckland', taxLabel: 'GST', taxRate: 15, taxInclusive: true, cashRounding: 0.1, tipping: false },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', locale: 'en-ZA', timezone: 'Africa/Johannesburg', taxLabel: 'VAT', taxRate: 15, taxInclusive: true, cashRounding: 0, tipping: true },
  { code: 'MX', name: 'Mexico', currency: 'MXN', locale: 'es-MX', timezone: 'America/Mexico_City', taxLabel: 'IVA', taxRate: 16, taxInclusive: true, cashRounding: 0, tipping: true },
  { code: 'BR', name: 'Brazil', currency: 'BRL', locale: 'pt-BR', timezone: 'America/Sao_Paulo', taxLabel: 'ISS', taxRate: 5, taxInclusive: true, cashRounding: 0, serviceChargePct: 10, tipping: false },
];

export function buildSettings(type: string, size: string, country?: CountryPreset): OrgSettings {
  const t = BUSINESS_TEMPLATES[type] || BUSINESS_TEMPLATES.RESTAURANT;
  const base = resolveSettings({});
  return {
    ...base,
    serviceModel: t.serviceModel,
    orderTypes: t.orderTypes,
    modules: {
      ...base.modules,
      ...t.modules,
      ...(SIZE_MODULES[size] || {}),
      // Template decisions on service format always win over size tier.
      ...(t.modules.tables === false ? { tables: false } : {}),
      ...(t.modules.reservations === false ? { reservations: false } : {}),
    },
    pos: {
      ...base.pos,
      ...t.pos,
      ...(country ? {
        cashRounding: country.cashRounding,
        tipping: t.pos.tipping === false ? false : country.tipping,
        serviceChargePct: t.pos.serviceChargePct ?? country.serviceChargePct ?? 0,
      } : {}),
    },
    taxLabel: country?.taxLabel || base.taxLabel,
  };
}
