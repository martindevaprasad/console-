// Permission catalogue. Roles (system or custom) are just bags of these keys.

export const PERMISSION_GROUPS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: 'Point of Sale',
    items: [
      { key: 'pos.access', label: 'Use POS terminal' },
      { key: 'pos.discount', label: 'Apply discounts above limit' },
      { key: 'pos.void', label: 'Void items / cancel orders' },
      { key: 'pos.refund', label: 'Issue refunds' },
      { key: 'pos.price_override', label: 'Override item prices' },
    ],
  },
  {
    group: 'Front of House',
    items: [
      { key: 'orders.view', label: 'View orders' },
      { key: 'orders.manage', label: 'Edit / transfer orders' },
      { key: 'tables.manage', label: 'Manage tables & seating' },
      { key: 'tables.layout', label: 'Edit floor plan layout' },
      { key: 'reservations.manage', label: 'Manage reservations & waitlist' },
      { key: 'kds.access', label: 'Use kitchen display' },
    ],
  },
  {
    group: 'Catalog & Stock',
    items: [
      { key: 'menu.view', label: 'View menu' },
      { key: 'menu.manage', label: 'Edit menu, modifiers, taxes' },
      { key: 'inventory.view', label: 'View inventory' },
      { key: 'inventory.manage', label: 'Adjust stock, recipes' },
      { key: 'purchasing.manage', label: 'Suppliers & purchase orders' },
      { key: 'promotions.manage', label: 'Manage promotions' },
    ],
  },
  {
    group: 'Customers',
    items: [
      { key: 'customers.view', label: 'View customers' },
      { key: 'customers.manage', label: 'Edit customers & loyalty' },
    ],
  },
  {
    group: 'People & Cash',
    items: [
      { key: 'staff.view', label: 'View staff' },
      { key: 'staff.manage', label: 'Manage staff' },
      { key: 'roles.manage', label: 'Manage roles & permissions' },
      { key: 'timeclock.manage', label: 'Edit time entries' },
      { key: 'cash.manage', label: 'Open/close shifts, cash movements' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { key: 'reports.view', label: 'View operational reports' },
      { key: 'reports.financial', label: 'View financial reports' },
      { key: 'locations.manage', label: 'Manage locations, stations, devices' },
      { key: 'settings.manage', label: 'Manage business settings' },
      { key: 'audit.view', label: 'View audit log' },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ALL_PERMISSIONS,
  MANAGER: ALL_PERMISSIONS.filter((p) => !['roles.manage'].includes(p)),
  SHIFT_LEAD: [
    'pos.access', 'pos.discount', 'pos.void', 'pos.refund',
    'orders.view', 'orders.manage', 'tables.manage', 'reservations.manage', 'kds.access',
    'menu.view', 'inventory.view', 'customers.view', 'customers.manage',
    'staff.view', 'timeclock.manage', 'cash.manage', 'reports.view',
  ],
  STAFF: [
    'pos.access', 'orders.view', 'tables.manage', 'reservations.manage', 'kds.access',
    'menu.view', 'customers.view',
  ],
  CUSTOMER: [],
};

export function permissionsFor(role: string, customPermissions?: string[] | null): string[] {
  if (customPermissions && customPermissions.length) return customPermissions;
  return SYSTEM_ROLE_PERMISSIONS[role] || [];
}
