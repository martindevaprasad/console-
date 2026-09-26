import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../middleware/auth';

const prisma = new PrismaClient();

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

const getAuthUser = (context: any) => {
  const token = context.token;
  if (!token) return null;
  return verifyToken(token);
};

const requireAuth = (context: any) => {
  const user = getAuthUser(context);
  if (!user) throw new Error('Authentication required');
  return user;
};

export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: any) => {
      const authUser = requireAuth(context);
      return prisma.user.findUnique({ where: { id: authUser.userId } });
    },

    organization: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      return prisma.organization.findUnique({
        where: { id },
        include: { locations: true, categories: true },
      });
    },

    organizations: async (_: any, __: any, context: any) => {
      requireAuth(context);
      return prisma.organization.findMany();
    },

    locations: async (_: any, { organizationId }: any, context: any) => {
      requireAuth(context);
      return prisma.location.findMany({
        where: { organizationId, isActive: true },
        include: { departments: true },
      });
    },

    location: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      return prisma.location.findUnique({
        where: { id },
        include: { departments: true, users: true },
      });
    },

    departments: async (_: any, { locationId }: any, context: any) => {
      requireAuth(context);
      return prisma.department.findMany({
        where: { locationId, isActive: true },
      });
    },

    department: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      return prisma.department.findUnique({ where: { id } });
    },

    users: async (_: any, { organizationId, locationId, role }: any, context: any) => {
      requireAuth(context);
      return prisma.user.findMany({
        where: {
          organizationId,
          ...(locationId && { locationId }),
          ...(role && { role }),
          isActive: true,
        },
        include: { location: true, department: true },
      });
    },

    user: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      return prisma.user.findUnique({
        where: { id },
        include: { location: true, department: true },
      });
    },

    categories: async (_: any, { organizationId }: any, context: any) => {
      requireAuth(context);
      return prisma.category.findMany({
        where: { organizationId, isActive: true },
        include: { products: true },
      });
    },

    category: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      return prisma.category.findUnique({ where: { id }, include: { products: true } });
    },

    products: async (_: any, { organizationId, locationId, departmentId, categoryId, isActive }: any, context: any) => {
      requireAuth(context);
      return prisma.product.findMany({
        where: {
          organizationId,
          ...(locationId && { locationId }),
          ...(departmentId && { departmentId }),
          ...(categoryId && { categoryId }),
          ...(isActive !== undefined && { isActive }),
        },
        include: { category: true, inventory: true },
      });
    },

    product: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      return prisma.product.findUnique({
        where: { id },
        include: { category: true, inventory: true },
      });
    },

    lowStockProducts: async (_: any, { organizationId, locationId }: any, context: any) => {
      requireAuth(context);
      const inventories = await prisma.inventory.findMany({
        where: {
          ...(locationId && { locationId }),
          product: { organizationId },
        },
        include: { product: true, location: true },
      });
      return inventories.filter((inv) => inv.quantity <= inv.minStock);
    },

    inventories: async (_: any, { locationId }: any, context: any) => {
      requireAuth(context);
      return prisma.inventory.findMany({
        where: { locationId },
        include: { product: true, location: true },
      });
    },

    inventory: async (_: any, { productId, locationId }: any, context: any) => {
      requireAuth(context);
      return prisma.inventory.findUnique({
        where: { productId_locationId: { productId, locationId } },
        include: { product: true, location: true },
      });
    },

    orders: async (_: any, { organizationId, locationId, status, limit, offset }: any, context: any) => {
      requireAuth(context);
      return prisma.order.findMany({
        where: {
          organizationId,
          ...(locationId && { locationId }),
          ...(status && { status }),
        },
        include: {
          items: { include: { product: true } },
          user: true,
          location: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit || 50,
        skip: offset || 0,
      });
    },

    order: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      return prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          user: true,
          location: true,
        },
      });
    },

    orderByNumber: async (_: any, { orderNumber }: any, context: any) => {
      requireAuth(context);
      return prisma.order.findUnique({
        where: { orderNumber },
        include: { items: { include: { product: true } }, user: true },
      });
    },

    zones: async (_: any, { locationId }: any, context: any) => {
      requireAuth(context);
      return prisma.floorPlanZone.findMany({ where: { locationId } });
    },
    zone: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      return prisma.floorPlanZone.findUnique({ where: { id } });
    },
    tables: async (_: any, { zoneId }: any, context: any) => {
      requireAuth(context);
      return prisma.table.findMany({ where: { zoneId } });
    },
    table: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      return prisma.table.findUnique({ where: { id } });
    },

    dashboardMetrics: async (_: any, { organizationId, locationId }: any, context: any) => {
      requireAuth(context);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const where = {
        organizationId,
        ...(locationId && { locationId }),
        status: { not: 'CANCELLED' as any },
      };

      const [todayOrders, weekOrders, monthOrders, allOrders, lowStock, activeProducts, staff] =
        await Promise.all([
          prisma.order.findMany({ where: { ...where, createdAt: { gte: todayStart } } }),
          prisma.order.findMany({ where: { ...where, createdAt: { gte: weekStart } } }),
          prisma.order.findMany({ where: { ...where, createdAt: { gte: monthStart } } }),
          prisma.order.findMany({ where }),
          prisma.inventory.findMany({
            where: { product: { organizationId } },
            include: { product: true },
          }),
          prisma.product.count({ where: { organizationId, isActive: true } }),
          prisma.user.count({ where: { organizationId, isActive: true } }),
        ]);

      const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
      const weekRevenue = weekOrders.reduce((s, o) => s + o.total, 0);
      const monthRevenue = monthOrders.reduce((s, o) => s + o.total, 0);
      const avgOrderValue = allOrders.length ? allOrders.reduce((s, o) => s + o.total, 0) / allOrders.length : 0;
      const lowStockCount = lowStock.filter((i) => i.quantity <= i.minStock).length;

      return {
        todayRevenue,
        weekRevenue,
        monthRevenue,
        todayOrders: todayOrders.length,
        weekOrders: weekOrders.length,
        monthOrders: monthOrders.length,
        avgOrderValue,
        lowStockCount,
        activeProducts,
        totalCustomers: staff,
      };
    },

    revenueChart: async (_: any, { organizationId, locationId, days }: any, context: any) => {
      requireAuth(context);
      const numDays = days || 7;
      const results: any[] = [];
      const now = new Date();

      for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const orders = await prisma.order.findMany({
          where: {
            organizationId,
            ...(locationId && { locationId }),
            status: { not: 'CANCELLED' as any },
            createdAt: { gte: date, lt: nextDate },
          },
        });

        results.push({
          date: date.toISOString().split('T')[0],
          revenue: orders.reduce((s, o) => s + o.total, 0),
          orders: orders.length,
        });
      }
      return results;
    },
  },

  Mutation: {
    register: async (_: any, { email, password, name, organizationName, orgType }: any) => {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new Error('Email already registered');

      const org = await prisma.organization.create({
        data: {
          name: organizationName,
          type: orgType || 'RESTAURANT',
        },
      });

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'OWNER',
          organizationId: org.id,
        },
        include: { location: true, department: true },
      });

      const token = generateToken({
        userId: user.id,
        organizationId: org.id,
        role: user.role,
      });

      return { token, user };
    },

    login: async (_: any, { email, password }: any) => {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { location: true, department: true },
      });
      if (!user) throw new Error('Invalid credentials');

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error('Invalid credentials');

      const token = generateToken({
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        locationId: user.locationId || undefined,
        departmentId: user.departmentId || undefined,
      });

      return { token, user };
    },

    updateOrganization: async (_: any, { id, ...data }: any, context: any) => {
      requireAuth(context);
      return prisma.organization.update({ where: { id }, data });
    },

    createLocation: async (_: any, { organizationId, name, address, phone, email }: any, context: any) => {
      requireAuth(context);
      return prisma.location.create({
        data: { organizationId, name, address, phone, email },
        include: { departments: true },
      });
    },

    updateLocation: async (_: any, { id, ...data }: any, context: any) => {
      requireAuth(context);
      return prisma.location.update({ where: { id }, data, include: { departments: true } });
    },

    deleteLocation: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      await prisma.location.delete({ where: { id } });
      return true;
    },

    createDepartment: async (_: any, { locationId, name, description }: any, context: any) => {
      requireAuth(context);
      return prisma.department.create({ data: { locationId, name, description } });
    },

    updateDepartment: async (_: any, { id, ...data }: any, context: any) => {
      requireAuth(context);
      return prisma.department.update({ where: { id }, data });
    },

    deleteDepartment: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      await prisma.department.delete({ where: { id } });
      return true;
    },

    createUser: async (_: any, { organizationId, email, password, name, role, locationId, departmentId, phone }: any, context: any) => {
      requireAuth(context);
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new Error('Email already exists');
      const hashedPassword = await bcrypt.hash(password, 12);
      return prisma.user.create({
        data: { organizationId, email, password: hashedPassword, name, role: role || 'STAFF', locationId, departmentId, phone },
        include: { location: true, department: true },
      });
    },

    updateUser: async (_: any, { id, ...data }: any, context: any) => {
      requireAuth(context);
      return prisma.user.update({ where: { id }, data, include: { location: true, department: true } });
    },

    deleteUser: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      await prisma.user.update({ where: { id }, data: { isActive: false } });
      return true;
    },

    createCategory: async (_: any, { organizationId, name, description, color, icon }: any, context: any) => {
      requireAuth(context);
      return prisma.category.create({ data: { organizationId, name, description, color, icon } });
    },

    updateCategory: async (_: any, { id, ...data }: any, context: any) => {
      requireAuth(context);
      return prisma.category.update({ where: { id }, data });
    },

    deleteCategory: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      await prisma.category.delete({ where: { id } });
      return true;
    },

    createProduct: async (_: any, { organizationId, name, price, description, sku, cost, categoryId, locationId, departmentId }: any, context: any) => {
      requireAuth(context);
      const product = await prisma.product.create({
        data: { organizationId, name, price, description, sku, cost, categoryId, locationId, departmentId },
        include: { category: true, inventory: true },
      });

      // Auto-create inventory records for all locations in org
      const locations = await prisma.location.findMany({ where: { organizationId } });
      await Promise.all(
        locations.map((loc) =>
          prisma.inventory.upsert({
            where: { productId_locationId: { productId: product.id, locationId: loc.id } },
            create: { productId: product.id, locationId: loc.id, quantity: 0, minStock: 10 },
            update: {},
          })
        )
      );

      return product;
    },

    updateProduct: async (_: any, { id, ...data }: any, context: any) => {
      requireAuth(context);
      return prisma.product.update({ where: { id }, data, include: { category: true, inventory: true } });
    },

    deleteProduct: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      return true;
    },

    updateInventory: async (_: any, { productId, locationId, quantity, minStock, maxStock, unit }: any, context: any) => {
      requireAuth(context);
      return prisma.inventory.upsert({
        where: { productId_locationId: { productId, locationId } },
        create: { productId, locationId, quantity: quantity || 0, minStock: minStock || 10, maxStock, unit },
        update: {
          ...(quantity !== undefined && { quantity }),
          ...(minStock !== undefined && { minStock }),
          ...(maxStock !== undefined && { maxStock }),
          ...(unit && { unit }),
        },
        include: { product: true, location: true },
      });
    },

    createOrder: async (_: any, { organizationId, locationId, items, paymentMethod, taxAmount, discountAmount, notes }: any, context: any) => {
      requireAuth(context);
      const authUser = getAuthUser(context);

      const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
      const tax = taxAmount ?? 0;
      const discount = discountAmount ?? 0;
      const total = subtotal + tax - discount;

      const order = await prisma.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          organizationId,
          locationId,
          userId: authUser?.userId,
          paymentMethod: paymentMethod || 'CASH',
          orderType: items.orderType || 'DINE_IN',
          tableSessionId: items.tableSessionId || null,
          subtotal,
          taxAmount: tax,
          discountAmount: discount,
          total,
          notes,
          status: 'COMPLETED',
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.price * item.quantity,
              notes: item.notes,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          user: true,
          location: true,
        },
      });

      // Decrement inventory
      await Promise.all(
        items.map((item: any) =>
          prisma.inventory
            .updateMany({
              where: { productId: item.productId, locationId },
              data: { quantity: { decrement: item.quantity } },
            })
            .catch(() => {})
        )
      );

      return order;
    },

    updateOrderStatus: async (_: any, { id, status }: any, context: any) => {
      requireAuth(context);
      return prisma.order.update({
        where: { id },
        data: { status },
        include: { items: { include: { product: true } }, user: true, location: true },
      });
    },

    cancelOrder: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      return prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { items: { include: { product: true } }, user: true, location: true },
      });
    },

    createZone: async (_: any, { locationId, name }: any, context: any) => {
      requireAuth(context);
      return prisma.floorPlanZone.create({ data: { locationId, name } });
    },

    createTable: async (_: any, { zoneId, name, capacity, shape, x, y, width, height }: any, context: any) => {
      requireAuth(context);
      return prisma.table.create({
        data: { zoneId, name, capacity, shape, x, y, width, height },
      });
    },

    updateTableStatus: async (_: any, { id, status }: any, context: any) => {
      requireAuth(context);
      return prisma.table.update({ where: { id }, data: { status } });
    },

    seatTable: async (_: any, { id, guestCount, serverUserId }: any, context: any) => {
      requireAuth(context);
      await prisma.table.update({ where: { id }, data: { status: 'SEATED' } });
      return prisma.tableSession.create({
        data: { tableId: id, guestCount, serverUserId },
      });
    },

    checkoutTable: async (_: any, { id }: any, context: any) => {
      requireAuth(context);
      const activeSession = await prisma.tableSession.findFirst({
        where: { tableId: id, endTime: null },
      });
      if (activeSession) {
        await prisma.tableSession.update({
          where: { id: activeSession.id },
          data: { endTime: new Date() },
        });
      }
      return prisma.table.update({ where: { id }, data: { status: 'NEEDS_CLEANING' } });
    },
  },

  // Field resolvers
  Organization: {
    locations: (parent: any) => prisma.location.findMany({ where: { organizationId: parent.id, isActive: true } }),
    users: (parent: any) => prisma.user.findMany({ where: { organizationId: parent.id, isActive: true } }),
    categories: (parent: any) => prisma.category.findMany({ where: { organizationId: parent.id, isActive: true } }),
    products: (parent: any) => prisma.product.findMany({ where: { organizationId: parent.id, isActive: true } }),
    orders: (parent: any) => prisma.order.findMany({ where: { organizationId: parent.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
  },

  Location: {
    departments: (parent: any) => prisma.department.findMany({ where: { locationId: parent.id } }),
    users: (parent: any) => prisma.user.findMany({ where: { locationId: parent.id } }),
    products: (parent: any) => prisma.product.findMany({ where: { locationId: parent.id } }),
    floorPlanZones: (parent: any) => prisma.floorPlanZone.findMany({ where: { locationId: parent.id } }),
  },

  Department: {
    users: (parent: any) => prisma.user.findMany({ where: { departmentId: parent.id } }),
  },

  User: {
    location: (parent: any) => parent.locationId ? prisma.location.findUnique({ where: { id: parent.locationId } }) : null,
    department: (parent: any) => parent.departmentId ? prisma.department.findUnique({ where: { id: parent.departmentId } }) : null,
  },

  Category: {
    products: (parent: any) => prisma.product.findMany({ where: { categoryId: parent.id, isActive: true } }),
  },

  Product: {
    category: (parent: any) => parent.categoryId ? prisma.category.findUnique({ where: { id: parent.categoryId } }) : null,
    inventory: (parent: any) => prisma.inventory.findMany({ where: { productId: parent.id } }),
  },

  Inventory: {
    product: (parent: any) => prisma.product.findUnique({ where: { id: parent.productId } }),
    location: (parent: any) => prisma.location.findUnique({ where: { id: parent.locationId } }),
  },

  Order: {
    items: (parent: any) =>
      prisma.orderItem.findMany({ where: { orderId: parent.id }, include: { product: true } }),
    user: (parent: any) => parent.userId ? prisma.user.findUnique({ where: { id: parent.userId } }) : null,
    location: (parent: any) => prisma.location.findUnique({ where: { id: parent.locationId } }),
    tableSession: (parent: any) => parent.tableSessionId ? prisma.tableSession.findUnique({ where: { id: parent.tableSessionId } }) : null,
  },

  OrderItem: {
    product: (parent: any) => prisma.product.findUnique({ where: { id: parent.productId } }),
  },

  FloorPlanZone: {
    location: (parent: any) => prisma.location.findUnique({ where: { id: parent.locationId } }),
    tables: (parent: any) => prisma.table.findMany({ where: { zoneId: parent.id } }),
  },

  Table: {
    zone: (parent: any) => prisma.floorPlanZone.findUnique({ where: { id: parent.zoneId } }),
    sessions: (parent: any) => prisma.tableSession.findMany({ where: { tableId: parent.id } }),
  },

  TableSession: {
    table: (parent: any) => prisma.table.findUnique({ where: { id: parent.tableId } }),
    server: (parent: any) => parent.serverUserId ? prisma.user.findUnique({ where: { id: parent.serverUserId } }) : null,
    orders: (parent: any) => prisma.order.findMany({ where: { tableSessionId: parent.id } }),
  },
};
