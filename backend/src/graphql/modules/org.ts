import { gql } from 'graphql-tag';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { generateToken } from '../../middleware/auth';
import {
  Ctx, requireAuth, requirePerm, fail, audit, findUserByPin, orgSettings,
} from '../../lib/context';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, SYSTEM_ROLE_PERMISSIONS, permissionsFor } from '../../lib/permissions';
import {
  BUSINESS_TEMPLATES, COUNTRY_PRESETS, SIZE_MODULES, buildSettings, resolveSettings,
} from '../../lib/templates';

export const typeDefs = gql`
  type Organization {
    id: ID!
    name: String!
    legalName: String
    domain: String
    type: OrgType!
    size: OrgSize!
    logoUrl: String
    address: String
    phone: String
    email: String
    taxId: String
    taxRate: Float!
    taxInclusive: Boolean!
    country: String!
    currency: String!
    locale: String!
    timezone: String!
    settings: JSON!
    onboardingCompleted: Boolean!
    plan: String!
    isActive: Boolean!
    createdAt: DateTime!
    locations: [Location!]!
  }

  type Location {
    id: ID!
    code: String
    name: String!
    address: String
    city: String
    country: String
    phone: String
    email: String
    timezone: String
    isHeadOffice: Boolean!
    receiptHeader: String
    receiptFooter: String
    isActive: Boolean!
    organizationId: String!
    createdAt: DateTime!
    departments: [Department!]!
    stations: [KitchenStation!]!
    devices: [Device!]!
  }

  type Department { id: ID! name: String! description: String isActive: Boolean! locationId: String! }

  type KitchenStation { id: ID! name: String! color: String printerName: String isExpo: Boolean! isActive: Boolean! locationId: String! }

  type Device { id: ID! name: String! type: DeviceType! identifier: String ipAddress: String lastSeenAt: DateTime isActive: Boolean! locationId: String! }

  type Role { id: ID! name: String! description: String permissions: [String!]! isSystem: Boolean! userCount: Int! }

  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    roleId: String
    phone: String
    avatarUrl: String
    hourlyRate: Float
    isActive: Boolean!
    hasPin: Boolean!
    lastLoginAt: DateTime
    organizationId: String!
    locationId: String
    departmentId: String
    createdAt: DateTime!
    location: Location
    department: Department
    customRole: Role
  }

  type AuthPayload { token: String! user: User! }

  type Session { user: User! permissions: [String!]! organization: Organization! }

  type AuditLog { id: ID! userName: String action: String! entity: String! entityId: String meta: JSON createdAt: DateTime! }

  input OrganizationInput {
    name: String legalName: String type: OrgType size: OrgSize logoUrl: String address: String phone: String email: String
    taxId: String taxRate: Float taxInclusive: Boolean country: String currency: String locale: String timezone: String
    onboardingCompleted: Boolean
  }

  input LocationInput {
    name: String code: String address: String city: String country: String phone: String email: String timezone: String
    isHeadOffice: Boolean receiptHeader: String receiptFooter: String isActive: Boolean
  }

  input StationInput { locationId: ID name: String color: String printerName: String isExpo: Boolean isActive: Boolean }
  input DeviceInput { locationId: ID name: String type: DeviceType identifier: String ipAddress: String isActive: Boolean }

  input UserInput {
    email: String password: String pin: String name: String role: UserRole roleId: ID phone: String
    hourlyRate: Float locationId: ID departmentId: ID isActive: Boolean
  }

  input RoleInput { name: String description: String permissions: [String!] }

  input OnboardingLocationInput { name: String! address: String city: String phone: String }
  input OnboardingTeamInput { name: String! email: String! password: String! role: UserRole pin: String }

  input OnboardingInput {
    businessName: String!
    legalName: String
    type: OrgType!
    size: OrgSize!
    country: String!
    currency: String!
    locale: String!
    timezone: String!
    taxLabel: String
    taxRate: Float!
    taxInclusive: Boolean!
    phone: String
    email: String
    address: String
    serviceModel: String
    orderTypes: [OrderType!]
    modules: JSON
    locations: [OnboardingLocationInput!]!
    loadSampleMenu: Boolean
    createFloorPlan: Boolean
    team: [OnboardingTeamInput!]
    ownerPin: String
  }

  type Query {
    me: User
    session: Session!
    organization: Organization
    platformPresets: JSON!
    permissionCatalog: JSON!
    locations(includeInactive: Boolean): [Location!]!
    location(id: ID!): Location
    departments(locationId: ID!): [Department!]!
    stations(locationId: ID!): [KitchenStation!]!
    devices(locationId: ID): [Device!]!
    users(locationId: ID, role: UserRole, includeInactive: Boolean): [User!]!
    user(id: ID!): User
    roles: [Role!]!
    auditLogs(entity: String, limit: Int, offset: Int): [AuditLog!]!
  }

  type Mutation {
    register(email: String!, password: String!, name: String!, organizationName: String!, orgType: OrgType): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    switchUser(pin: String!): AuthPayload!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
    setMyPin(pin: String!): Boolean!

    updateOrganization(input: OrganizationInput!): Organization!
    updateSettings(patch: JSON!): Organization!
    completeOnboarding(input: OnboardingInput!): Organization!

    createLocation(input: LocationInput!): Location!
    updateLocation(id: ID!, input: LocationInput!): Location!
    deleteLocation(id: ID!): Boolean!

    createDepartment(locationId: ID!, name: String!, description: String): Department!
    deleteDepartment(id: ID!): Boolean!

    createStation(input: StationInput!): KitchenStation!
    updateStation(id: ID!, input: StationInput!): KitchenStation!
    deleteStation(id: ID!): Boolean!

    createDevice(input: DeviceInput!): Device!
    updateDevice(id: ID!, input: DeviceInput!): Device!
    deleteDevice(id: ID!): Boolean!

    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserInput!): User!
    deleteUser(id: ID!): Boolean!

    createRole(input: RoleInput!): Role!
    updateRole(id: ID!, input: RoleInput!): Role!
    deleteRole(id: ID!): Boolean!
  }
`;

const tokenFor = (u: any) =>
  generateToken({ userId: u.id, organizationId: u.organizationId, role: u.role, locationId: u.locationId || undefined, departmentId: u.departmentId || undefined });

const clean = <T extends Record<string, any>>(obj: T) =>
  Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== undefined)) as Partial<T>;

const ownLocation = async (orgId: string, id: string) => {
  const loc = await prisma.location.findFirst({ where: { id, organizationId: orgId } });
  if (!loc) fail('Location not found', 'NOT_FOUND');
  return loc!;
};

const validatePin = (pin?: string | null) => {
  if (pin && !/^\d{4,6}$/.test(pin)) fail('PIN must be 4–6 digits');
};

async function assertPinUnique(orgId: string, pin: string, exceptUserId?: string) {
  const existing = await findUserByPin(orgId, pin);
  if (existing && existing.id !== exceptUserId) fail('PIN already in use by another team member');
}

// Lays out N tables on a simple grid for a freshly created zone.
function gridTables(count: number, capacity: number) {
  const perRow = 6;
  return Array.from({ length: count }, (_, i) => ({
    name: `T${i + 1}`,
    capacity,
    shape: capacity <= 2 ? 'ROUND' : 'RECTANGLE',
    x: 40 + (i % perRow) * 130,
    y: 40 + Math.floor(i / perRow) * 120,
    width: capacity > 6 ? 120 : 90,
    height: 80,
  }));
}

export const resolvers = {
  Query: {
    me: async (_: any, __: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      return prisma.user.findUnique({ where: { id: auth.userId } });
    },

    session: async (_: any, __: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      const [user, organization] = await Promise.all([
        prisma.user.findUnique({ where: { id: auth.userId } }),
        prisma.organization.findUnique({ where: { id: auth.orgId } }),
      ]);
      return { user, organization, permissions: [...auth.permissions] };
    },

    organization: async (_: any, __: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      return prisma.organization.findUnique({ where: { id: auth.orgId } });
    },

    platformPresets: () => ({
      countries: COUNTRY_PRESETS,
      businessTypes: Object.entries(BUSINESS_TEMPLATES).map(([key, t]) => ({
        key, label: t.label, description: t.description, serviceModel: t.serviceModel,
        orderTypes: t.orderTypes, modules: t.modules, stations: t.stations,
      })),
      sizes: [
        { key: 'SMALL', label: 'Single outlet', description: '1 location, owner-operated', modules: SIZE_MODULES.SMALL },
        { key: 'MEDIUM', label: 'Growing group', description: '2–10 locations', modules: SIZE_MODULES.MEDIUM },
        { key: 'LARGE', label: 'Regional chain', description: '10–100 locations', modules: SIZE_MODULES.LARGE },
        { key: 'ENTERPRISE', label: 'Enterprise / franchise', description: '100+ locations, multi-brand', modules: SIZE_MODULES.ENTERPRISE },
      ],
    }),

    permissionCatalog: () => ({ groups: PERMISSION_GROUPS, systemRoles: SYSTEM_ROLE_PERMISSIONS }),

    locations: async (_: any, { includeInactive }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      return prisma.location.findMany({
        where: { organizationId: auth.orgId, ...(includeInactive ? {} : { isActive: true }) },
        orderBy: [{ isHeadOffice: 'desc' }, { createdAt: 'asc' }],
      });
    },

    location: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      return prisma.location.findFirst({ where: { id, organizationId: auth.orgId } });
    },

    departments: async (_: any, { locationId }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      await ownLocation(auth.orgId, locationId);
      return prisma.department.findMany({ where: { locationId, isActive: true } });
    },

    stations: async (_: any, { locationId }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      await ownLocation(auth.orgId, locationId);
      return prisma.kitchenStation.findMany({ where: { locationId }, orderBy: { name: 'asc' } });
    },

    devices: async (_: any, { locationId }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      return prisma.device.findMany({
        where: { location: { organizationId: auth.orgId }, ...(locationId ? { locationId } : {}) },
        orderBy: { name: 'asc' },
      });
    },

    users: async (_: any, { locationId, role, includeInactive }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'staff.view', 'pos.access');
      return prisma.user.findMany({
        where: {
          organizationId: auth.orgId,
          ...(locationId ? { locationId } : {}),
          ...(role ? { role } : {}),
          ...(includeInactive ? {} : { isActive: true }),
        },
        orderBy: { name: 'asc' },
      });
    },

    user: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'staff.view');
      return prisma.user.findFirst({ where: { id, organizationId: auth.orgId } });
    },

    roles: async (_: any, __: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'staff.view');
      const custom = await prisma.role.findMany({ where: { organizationId: auth.orgId }, orderBy: { name: 'asc' } });
      const system = Object.entries(SYSTEM_ROLE_PERMISSIONS)
        .filter(([k]) => k !== 'CUSTOMER')
        .map(([k, perms]) => ({ id: `system:${k}`, name: k, description: 'Built-in role', permissions: perms, isSystem: true, organizationId: auth.orgId }));
      return [...system, ...custom];
    },

    auditLogs: async (_: any, { entity, limit, offset }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'audit.view');
      return prisma.auditLog.findMany({
        where: { organizationId: auth.orgId, ...(entity ? { entity } : {}) },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit || 100, 500),
        skip: offset || 0,
      });
    },
  },

  Mutation: {
    register: async (_: any, { email, password, name, organizationName, orgType }: any) => {
      if (password.length < 8) fail('Password must be at least 8 characters');
      const normalized = email.trim().toLowerCase();
      if (await prisma.user.findUnique({ where: { email: normalized } })) fail('Email already registered');
      if (await prisma.organization.findUnique({ where: { name: organizationName } })) fail('A business with this name already exists');

      const type = orgType || 'RESTAURANT';
      const { org, user } = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: { name: organizationName, type, settings: buildSettings(type, 'SMALL') as any },
        });
        const user = await tx.user.create({
          data: { email: normalized, password: await bcrypt.hash(password, 12), name, role: 'OWNER', organizationId: org.id },
        });
        return { org, user };
      });
      await audit({ userId: user.id, orgId: org.id, name: user.name, role: 'OWNER', permissions: new Set() }, 'REGISTER', 'Organization', org.id);
      return { token: tokenFor(user), user };
    },

    login: async (_: any, { email, password }: any) => {
      const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
        ?? await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) fail('Invalid credentials', 'UNAUTHENTICATED');
      if (!(await bcrypt.compare(password, user!.password))) fail('Invalid credentials', 'UNAUTHENTICATED');
      await prisma.user.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } });
      return { token: tokenFor(user), user };
    },

    // Fast staff switching on a shared terminal: the terminal is already inside
    // an organization, so a PIN is enough to identify the next user.
    switchUser: async (_: any, { pin }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      const { settings } = await orgSettings(auth.orgId);
      if (!settings.security.pinSwitchUser) fail('PIN switching is disabled for this business');
      const user = await findUserByPin(auth.orgId, pin);
      if (!user) fail('Invalid PIN', 'UNAUTHENTICATED');
      await prisma.user.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } });
      await audit(auth, 'SWITCH_USER', 'User', user!.id, { to: user!.name });
      return { token: tokenFor(user), user };
    },

    changePassword: async (_: any, { currentPassword, newPassword }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      if (newPassword.length < 8) fail('Password must be at least 8 characters');
      const user = await prisma.user.findUnique({ where: { id: auth.userId } });
      if (!(await bcrypt.compare(currentPassword, user!.password))) fail('Current password is incorrect');
      await prisma.user.update({ where: { id: auth.userId }, data: { password: await bcrypt.hash(newPassword, 12) } });
      return true;
    },

    setMyPin: async (_: any, { pin }: any, ctx: Ctx) => {
      const auth = await requireAuth(ctx);
      validatePin(pin);
      await assertPinUnique(auth.orgId, pin, auth.userId);
      await prisma.user.update({ where: { id: auth.userId }, data: { pinHash: await bcrypt.hash(pin, 10) } });
      return true;
    },

    updateOrganization: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'settings.manage');
      const org = await prisma.organization.update({ where: { id: auth.orgId }, data: clean(input) });
      await audit(auth, 'UPDATE', 'Organization', org.id, clean(input));
      return org;
    },

    updateSettings: async (_: any, { patch }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'settings.manage');
      const { org, settings } = await orgSettings(auth.orgId);
      const merged = resolveSettings({
        ...settings,
        ...patch,
        modules: { ...settings.modules, ...(patch.modules || {}) },
        pos: { ...settings.pos, ...(patch.pos || {}) },
        security: { ...settings.security, ...(patch.security || {}) },
        loyalty: { ...settings.loyalty, ...(patch.loyalty || {}) },
        receipt: { ...settings.receipt, ...(patch.receipt || {}) },
      });
      const updated = await prisma.organization.update({ where: { id: org.id }, data: { settings: merged as any } });
      await audit(auth, 'UPDATE_SETTINGS', 'Organization', org.id, patch);
      return updated;
    },

    completeOnboarding: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'settings.manage');
      const country = COUNTRY_PRESETS.find((c) => c.code === input.country);
      const template = BUSINESS_TEMPLATES[input.type] || BUSINESS_TEMPLATES.RESTAURANT;
      const settings: any = buildSettings(input.type, input.size, country);
      if (input.serviceModel) settings.serviceModel = input.serviceModel;
      if (input.orderTypes?.length) settings.orderTypes = input.orderTypes;
      if (input.modules) settings.modules = { ...settings.modules, ...input.modules };
      if (input.taxLabel) settings.taxLabel = input.taxLabel;
      if (input.locations.length > 1) settings.modules.multiLocation = true;

      for (const m of input.team || []) validatePin(m.pin);
      validatePin(input.ownerPin);

      const orgId = auth.orgId;
      await prisma.$transaction(async (tx) => {
        await tx.organization.update({
          where: { id: orgId },
          data: {
            name: input.businessName, legalName: input.legalName, type: input.type, size: input.size,
            country: input.country, currency: input.currency, locale: input.locale, timezone: input.timezone,
            taxRate: input.taxRate, taxInclusive: input.taxInclusive, phone: input.phone, email: input.email,
            address: input.address, settings, onboardingCompleted: true,
          },
        });

        // Default tax rate
        const existingTax = await tx.taxRate.findFirst({ where: { organizationId: orgId, isDefault: true } });
        const tax = existingTax
          ? await tx.taxRate.update({ where: { id: existingTax.id }, data: { rate: input.taxRate, name: settings.taxLabel } })
          : await tx.taxRate.create({ data: { organizationId: orgId, name: settings.taxLabel, rate: input.taxRate, isDefault: true } });

        // Locations (idempotent by name) + stations + floor plan
        const createdLocations: any[] = [];
        for (const [i, l] of input.locations.entries()) {
          let loc = await tx.location.findFirst({ where: { organizationId: orgId, name: l.name } });
          if (!loc) {
            loc = await tx.location.create({
              data: {
                organizationId: orgId, name: l.name, address: l.address, city: l.city, phone: l.phone,
                country: input.country, timezone: input.timezone, isHeadOffice: i === 0,
                code: l.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || `L${i + 1}`,
              },
            });
          }
          createdLocations.push(loc);
          if (settings.modules.kds || template.stations.length) {
            for (const [si, s] of template.stations.entries()) {
              const exists = await tx.kitchenStation.findFirst({ where: { locationId: loc.id, name: s } });
              if (!exists) {
                await tx.kitchenStation.create({ data: { locationId: loc.id, name: s, color: ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981'][si % 4] } });
              }
            }
          }
          if (settings.modules.tables && input.createFloorPlan !== false) {
            const hasZones = await tx.floorPlanZone.count({ where: { locationId: loc.id } });
            if (!hasZones) {
              for (const z of template.zones) {
                await tx.floorPlanZone.create({
                  data: { locationId: loc.id, name: z.name, tables: { create: gridTables(z.tables, z.capacity) } },
                });
              }
            }
          }
          if (!(await tx.device.count({ where: { locationId: loc.id } }))) {
            await tx.device.create({ data: { locationId: loc.id, name: 'Front Counter POS', type: 'POS' } });
          }
        }

        // Starter menu mapped onto the first location's stations
        if (input.loadSampleMenu) {
          const first = createdLocations[0];
          const stations = first ? await tx.kitchenStation.findMany({ where: { locationId: first.id } }) : [];
          const categoryIds: Record<string, string> = {};
          for (const [ci, c] of template.menu.entries()) {
            const cat = await tx.category.upsert({
              where: { organizationId_name: { organizationId: orgId, name: c.category } },
              create: { organizationId: orgId, name: c.category, color: c.color, sortOrder: ci },
              update: {},
            });
            categoryIds[c.category] = cat.id;
            const stationId = stations.find((s) => s.name === c.station)?.id;
            for (const [pi, [name, price]] of c.items.entries()) {
              const exists = await tx.product.findFirst({ where: { organizationId: orgId, name } });
              if (exists) continue;
              const product = await tx.product.create({
                data: {
                  organizationId: orgId, name, price, categoryId: cat.id, taxRateId: tax.id, stationId,
                  sortOrder: pi, trackStock: !!template.trackFinishedGoods, cost: Math.round(price * 0.3 * 100) / 100,
                },
              });
              if (template.trackFinishedGoods) {
                for (const loc of createdLocations) {
                  await tx.inventory.create({ data: { productId: product.id, locationId: loc.id, quantity: 20, minStock: 5 } });
                }
              }
            }
          }
          for (const g of template.modifierGroups || []) {
            if (await tx.modifierGroup.findFirst({ where: { organizationId: orgId, name: g.name } })) continue;
            const group = await tx.modifierGroup.create({
              data: {
                organizationId: orgId, name: g.name, minSelect: g.min, maxSelect: g.max,
                modifiers: { create: g.options.map(([name, price], i) => ({ name, price, sortOrder: i, isDefault: i === 0 && g.min > 0 })) },
              },
            });
            const products = await tx.product.findMany({
              where: { organizationId: orgId, categoryId: { in: g.categories.map((c) => categoryIds[c]).filter(Boolean) } },
            });
            if (products.length) {
              await tx.productModifierGroup.createMany({ data: products.map((p) => ({ productId: p.id, groupId: group.id })), skipDuplicates: true });
            }
          }
        }

        // Team
        for (const m of input.team || []) {
          const email = m.email.trim().toLowerCase();
          if (await tx.user.findUnique({ where: { email } })) continue;
          await tx.user.create({
            data: {
              organizationId: orgId, email, name: m.name, role: m.role || 'STAFF',
              password: await bcrypt.hash(m.password, 12),
              pinHash: m.pin ? await bcrypt.hash(m.pin, 10) : null,
              locationId: createdLocations[0]?.id,
            },
          });
        }

        if (input.ownerPin) {
          await tx.user.update({ where: { id: auth.userId }, data: { pinHash: await bcrypt.hash(input.ownerPin, 10) } });
        }
      }, { timeout: 60000, maxWait: 10000 });

      await audit(auth, 'COMPLETE_ONBOARDING', 'Organization', orgId, { type: input.type, size: input.size, country: input.country });
      return prisma.organization.findUnique({ where: { id: orgId } });
    },

    createLocation: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'locations.manage');
      if (!input.name) fail('Location name is required');
      const { org, settings } = await orgSettings(auth.orgId);
      const count = await prisma.location.count({ where: { organizationId: auth.orgId, isActive: true } });
      if (count >= 1 && !settings.modules.multiLocation) {
        fail('Multi-location is disabled. Enable it under Settings → Modules.');
      }
      const loc = await prisma.location.create({
        data: { ...clean(input), name: input.name, organizationId: auth.orgId, country: input.country || org.country, timezone: input.timezone || org.timezone },
      });
      // New outlets inherit the station layout of the head office.
      const hq = await prisma.location.findFirst({ where: { organizationId: auth.orgId, isHeadOffice: true } });
      if (hq) {
        const stations = await prisma.kitchenStation.findMany({ where: { locationId: hq.id } });
        if (stations.length) {
          await prisma.kitchenStation.createMany({ data: stations.map((s) => ({ locationId: loc.id, name: s.name, color: s.color, isExpo: s.isExpo })) });
        }
      }
      await audit(auth, 'CREATE', 'Location', loc.id, { name: loc.name });
      return loc;
    },

    updateLocation: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'locations.manage');
      await ownLocation(auth.orgId, id);
      if (input.isHeadOffice) {
        await prisma.location.updateMany({ where: { organizationId: auth.orgId }, data: { isHeadOffice: false } });
      }
      const loc = await prisma.location.update({ where: { id }, data: clean(input) });
      await audit(auth, 'UPDATE', 'Location', id, clean(input));
      return loc;
    },

    deleteLocation: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'locations.manage');
      await ownLocation(auth.orgId, id);
      // Soft delete: orders and reports must keep referencing the outlet.
      await prisma.location.update({ where: { id }, data: { isActive: false } });
      await audit(auth, 'DEACTIVATE', 'Location', id);
      return true;
    },

    createDepartment: async (_: any, { locationId, name, description }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'locations.manage');
      await ownLocation(auth.orgId, locationId);
      return prisma.department.create({ data: { locationId, name, description } });
    },

    deleteDepartment: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'locations.manage');
      const d = await prisma.department.findFirst({ where: { id, location: { organizationId: auth.orgId } } });
      if (!d) fail('Department not found', 'NOT_FOUND');
      await prisma.department.update({ where: { id }, data: { isActive: false } });
      return true;
    },

    createStation: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'locations.manage');
      await ownLocation(auth.orgId, input.locationId);
      return prisma.kitchenStation.create({ data: { ...clean(input), locationId: input.locationId, name: input.name || 'Station' } });
    },

    updateStation: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'locations.manage');
      const s = await prisma.kitchenStation.findFirst({ where: { id, location: { organizationId: auth.orgId } } });
      if (!s) fail('Station not found', 'NOT_FOUND');
      const { locationId, ...rest } = input;
      return prisma.kitchenStation.update({ where: { id }, data: clean(rest) });
    },

    deleteStation: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'locations.manage');
      const s = await prisma.kitchenStation.findFirst({ where: { id, location: { organizationId: auth.orgId } } });
      if (!s) fail('Station not found', 'NOT_FOUND');
      await prisma.kitchenStation.update({ where: { id }, data: { isActive: false } });
      return true;
    },

    createDevice: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'locations.manage');
      await ownLocation(auth.orgId, input.locationId);
      return prisma.device.create({ data: { ...clean(input), locationId: input.locationId, name: input.name || 'Device' } });
    },

    updateDevice: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'locations.manage');
      const d = await prisma.device.findFirst({ where: { id, location: { organizationId: auth.orgId } } });
      if (!d) fail('Device not found', 'NOT_FOUND');
      const { locationId, ...rest } = input;
      return prisma.device.update({ where: { id }, data: clean(rest) });
    },

    deleteDevice: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'locations.manage');
      const d = await prisma.device.findFirst({ where: { id, location: { organizationId: auth.orgId } } });
      if (!d) fail('Device not found', 'NOT_FOUND');
      await prisma.device.delete({ where: { id } });
      return true;
    },

    createUser: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'staff.manage');
      if (!input.email || !input.name || !input.password) fail('Name, email and password are required');
      if (input.password.length < 8) fail('Password must be at least 8 characters');
      if (input.role === 'OWNER' && auth.role !== 'OWNER') fail('Only an owner can create another owner', 'FORBIDDEN');
      validatePin(input.pin);
      if (input.pin) await assertPinUnique(auth.orgId, input.pin);
      const email = input.email.trim().toLowerCase();
      if (await prisma.user.findUnique({ where: { email } })) fail('Email already exists');
      if (input.locationId) await ownLocation(auth.orgId, input.locationId);
      if (input.roleId) {
        const r = await prisma.role.findFirst({ where: { id: input.roleId, organizationId: auth.orgId } });
        if (!r) fail('Role not found', 'NOT_FOUND');
      }
      const { pin, password, ...rest } = input;
      const user = await prisma.user.create({
        data: {
          ...clean(rest), email, name: input.name, organizationId: auth.orgId,
          password: await bcrypt.hash(password, 12),
          pinHash: pin ? await bcrypt.hash(pin, 10) : null,
        },
      });
      await audit(auth, 'CREATE', 'User', user.id, { email, role: user.role });
      return user;
    },

    updateUser: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'staff.manage');
      const target = await prisma.user.findFirst({ where: { id, organizationId: auth.orgId } });
      if (!target) fail('User not found', 'NOT_FOUND');
      if ((target!.role === 'OWNER' || input.role === 'OWNER') && auth.role !== 'OWNER') fail('Only an owner can modify owners', 'FORBIDDEN');
      validatePin(input.pin);
      if (input.pin) await assertPinUnique(auth.orgId, input.pin, id);
      if (input.locationId) await ownLocation(auth.orgId, input.locationId);
      const { pin, password, email, ...rest } = input;
      const data: any = clean(rest);
      if (input.roleId === null) data.roleId = null;
      if (pin) data.pinHash = await bcrypt.hash(pin, 10);
      if (password) {
        if (password.length < 8) fail('Password must be at least 8 characters');
        data.password = await bcrypt.hash(password, 12);
      }
      if (email) data.email = email.trim().toLowerCase();
      const user = await prisma.user.update({ where: { id }, data });
      await audit(auth, 'UPDATE', 'User', id, { ...clean(rest), pinChanged: !!pin, passwordChanged: !!password });
      return user;
    },

    deleteUser: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'staff.manage');
      if (id === auth.userId) fail('You cannot deactivate yourself');
      const target = await prisma.user.findFirst({ where: { id, organizationId: auth.orgId } });
      if (!target) fail('User not found', 'NOT_FOUND');
      if (target!.role === 'OWNER' && auth.role !== 'OWNER') fail('Only an owner can deactivate owners', 'FORBIDDEN');
      await prisma.user.update({ where: { id }, data: { isActive: false } });
      await audit(auth, 'DEACTIVATE', 'User', id);
      return true;
    },

    createRole: async (_: any, { input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'roles.manage');
      if (!input.name) fail('Role name is required');
      const permissions = (input.permissions || []).filter((p: string) => ALL_PERMISSIONS.includes(p));
      const role = await prisma.role.create({ data: { organizationId: auth.orgId, name: input.name, description: input.description, permissions } });
      await audit(auth, 'CREATE', 'Role', role.id, { name: role.name, permissions });
      return role;
    },

    updateRole: async (_: any, { id, input }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'roles.manage');
      const r = await prisma.role.findFirst({ where: { id, organizationId: auth.orgId } });
      if (!r) fail('Role not found', 'NOT_FOUND');
      const data: any = clean({ name: input.name, description: input.description });
      if (input.permissions) data.permissions = input.permissions.filter((p: string) => ALL_PERMISSIONS.includes(p));
      const role = await prisma.role.update({ where: { id }, data });
      await audit(auth, 'UPDATE', 'Role', id, data);
      return role;
    },

    deleteRole: async (_: any, { id }: any, ctx: Ctx) => {
      const auth = await requirePerm(ctx, 'roles.manage');
      const r = await prisma.role.findFirst({ where: { id, organizationId: auth.orgId } });
      if (!r) fail('Role not found', 'NOT_FOUND');
      await prisma.user.updateMany({ where: { roleId: id }, data: { roleId: null } });
      await prisma.role.delete({ where: { id } });
      await audit(auth, 'DELETE', 'Role', id);
      return true;
    },
  },

  Organization: {
    settings: (o: any) => resolveSettings(o.settings),
    locations: (o: any) => prisma.location.findMany({ where: { organizationId: o.id, isActive: true }, orderBy: { createdAt: 'asc' } }),
  },

  Location: {
    departments: (l: any) => prisma.department.findMany({ where: { locationId: l.id, isActive: true } }),
    stations: (l: any) => prisma.kitchenStation.findMany({ where: { locationId: l.id, isActive: true }, orderBy: { name: 'asc' } }),
    devices: (l: any) => prisma.device.findMany({ where: { locationId: l.id } }),
  },

  Role: {
    userCount: (r: any) => r.isSystem
      ? prisma.user.count({ where: { organizationId: r.organizationId, role: r.name, roleId: null, isActive: true } })
      : prisma.user.count({ where: { roleId: r.id, isActive: true } }),
  },

  User: {
    hasPin: (u: any) => !!u.pinHash,
    location: (u: any) => (u.locationId ? prisma.location.findUnique({ where: { id: u.locationId } }) : null),
    department: (u: any) => (u.departmentId ? prisma.department.findUnique({ where: { id: u.departmentId } }) : null),
    customRole: (u: any) => (u.roleId ? prisma.role.findUnique({ where: { id: u.roleId } }) : null),
  },
};
