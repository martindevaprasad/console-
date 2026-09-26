import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime

  enum OrgType {
    RESTAURANT
    BAKERY
    CAFE
    QUICK_SERVICE
  }

  enum UserRole {
    OWNER
    MANAGER
    SHIFT_LEAD
    STAFF
    CUSTOMER
  }

  enum OrderStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    CANCELLED
    REFUNDED
  }

  enum PaymentMethod {
    CASH
    CARD
    DIGITAL
    SPLIT
  }

  enum TableStatus {
    AVAILABLE
    SEATED
    ORDERING
    WAITING_FOR_FOOD
    READY_FOR_PAYMENT
    NEEDS_CLEANING
  }

  enum OrderType {
    DINE_IN
    TAKEAWAY
    DELIVERY
  }

  type Organization {
    id: ID!
    name: String!
    domain: String
    type: OrgType!
    logoUrl: String
    address: String
    phone: String
    email: String
    taxRate: Float!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    locations: [Location!]!
    users: [User!]!
    categories: [Category!]!
    products: [Product!]!
    orders: [Order!]!
  }

  type Location {
    id: ID!
    name: String!
    address: String
    phone: String
    email: String
    isActive: Boolean!
    organizationId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    departments: [Department!]!
    users: [User!]!
    products: [Product!]!
    floorPlanZones: [FloorPlanZone!]!
  }

  type FloorPlanZone {
    id: ID!
    name: String!
    locationId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    location: Location
    tables: [Table!]!
  }

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
    createdAt: DateTime!
    updatedAt: DateTime!
    zone: FloorPlanZone
    sessions: [TableSession!]!
  }

  type TableSession {
    id: ID!
    guestCount: Int!
    startTime: DateTime!
    endTime: DateTime
    tableId: String!
    serverUserId: String
    createdAt: DateTime!
    updatedAt: DateTime!
    table: Table
    server: User
    orders: [Order!]!
  }

  type Department {
    id: ID!
    name: String!
    description: String
    isActive: Boolean!
    locationId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    users: [User!]!
  }

  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    phone: String
    avatarUrl: String
    isActive: Boolean!
    organizationId: String!
    locationId: String
    departmentId: String
    createdAt: DateTime!
    updatedAt: DateTime!
    location: Location
    department: Department
  }

  type Category {
    id: ID!
    name: String!
    description: String
    color: String
    icon: String
    isActive: Boolean!
    organizationId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    products: [Product!]!
  }

  type Product {
    id: ID!
    name: String!
    description: String
    sku: String
    price: Float!
    cost: Float
    imageUrl: String
    isActive: Boolean!
    organizationId: String!
    locationId: String
    departmentId: String
    categoryId: String
    createdAt: DateTime!
    updatedAt: DateTime!
    category: Category
    inventory: [Inventory!]!
  }

  type Inventory {
    id: ID!
    quantity: Int!
    minStock: Int!
    maxStock: Int
    unit: String
    productId: String!
    locationId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    product: Product
    location: Location
  }

  type OrderItem {
    id: ID!
    quantity: Int!
    price: Float!
    subtotal: Float!
    notes: String
    orderId: String!
    productId: String!
    product: Product
  }

  type Order {
    id: ID!
    orderNumber: String!
    status: OrderStatus!
    paymentMethod: PaymentMethod!
    subtotal: Float!
    taxAmount: Float!
    discountAmount: Float!
    total: Float!
    notes: String
    organizationId: String!
    locationId: String!
    userId: String
    orderType: OrderType!
    tableSessionId: String
    createdAt: DateTime!
    updatedAt: DateTime!
    items: [OrderItem!]!
    user: User
    location: Location
    tableSession: TableSession
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type DashboardMetrics {
    todayRevenue: Float!
    weekRevenue: Float!
    monthRevenue: Float!
    todayOrders: Int!
    weekOrders: Int!
    monthOrders: Int!
    avgOrderValue: Float!
    lowStockCount: Int!
    activeProducts: Int!
    totalCustomers: Int!
  }

  type RevenueDataPoint {
    date: String!
    revenue: Float!
    orders: Int!
  }

  # ---- QUERIES ----
  type Query {
    # Auth
    me: User

    # Organization
    organization(id: ID!): Organization
    organizations: [Organization!]!

    # Locations
    locations(organizationId: ID!): [Location!]!
    location(id: ID!): Location

    # Departments
    departments(locationId: ID!): [Department!]!
    department(id: ID!): Department

    # Users
    users(organizationId: ID!, locationId: ID, role: UserRole): [User!]!
    user(id: ID!): User

    # Categories
    categories(organizationId: ID!): [Category!]!
    category(id: ID!): Category

    # Products
    products(organizationId: ID!, locationId: ID, departmentId: ID, categoryId: ID, isActive: Boolean): [Product!]!
    product(id: ID!): Product
    lowStockProducts(organizationId: ID!, locationId: ID): [Inventory!]!

    # Inventory
    inventories(locationId: ID!): [Inventory!]!
    inventory(productId: ID!, locationId: ID!): Inventory

    # Orders
    orders(organizationId: ID!, locationId: ID, status: OrderStatus, limit: Int, offset: Int): [Order!]!
    order(id: ID!): Order
    orderByNumber(orderNumber: String!): Order

    # Table Management
    zones(locationId: ID!): [FloorPlanZone!]!
    zone(id: ID!): FloorPlanZone
    tables(zoneId: ID!): [Table!]!
    table(id: ID!): Table

    # Analytics
    dashboardMetrics(organizationId: ID!, locationId: ID): DashboardMetrics!
    revenueChart(organizationId: ID!, locationId: ID, days: Int): [RevenueDataPoint!]!
  }

  # ---- MUTATIONS ----
  type Mutation {
    # Auth
    register(email: String!, password: String!, name: String!, organizationName: String!, orgType: OrgType): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    # Organization
    updateOrganization(id: ID!, name: String, domain: String, type: OrgType, address: String, phone: String, email: String, taxRate: Float): Organization!

    # Locations
    createLocation(organizationId: ID!, name: String!, address: String, phone: String, email: String): Location!
    updateLocation(id: ID!, name: String, address: String, phone: String, email: String, isActive: Boolean): Location!
    deleteLocation(id: ID!): Boolean!

    # Departments
    createDepartment(locationId: ID!, name: String!, description: String): Department!
    updateDepartment(id: ID!, name: String, description: String, isActive: Boolean): Department!
    deleteDepartment(id: ID!): Boolean!

    # Users
    createUser(organizationId: ID!, email: String!, password: String!, name: String!, role: UserRole, locationId: ID, departmentId: ID, phone: String): User!
    updateUser(id: ID!, name: String, role: UserRole, locationId: ID, departmentId: ID, phone: String, isActive: Boolean): User!
    deleteUser(id: ID!): Boolean!

    # Categories
    createCategory(organizationId: ID!, name: String!, description: String, color: String, icon: String): Category!
    updateCategory(id: ID!, name: String, description: String, color: String, icon: String, isActive: Boolean): Category!
    deleteCategory(id: ID!): Boolean!

    # Products
    createProduct(organizationId: ID!, name: String!, price: Float!, description: String, sku: String, cost: Float, categoryId: ID, locationId: ID, departmentId: ID): Product!
    updateProduct(id: ID!, name: String, price: Float, description: String, sku: String, cost: Float, categoryId: ID, isActive: Boolean): Product!
    deleteProduct(id: ID!): Boolean!

    # Inventory
    updateInventory(productId: ID!, locationId: ID!, quantity: Int, minStock: Int, maxStock: Int, unit: String): Inventory!

    # Orders
    createOrder(
      organizationId: ID!
      locationId: ID!
      items: [OrderItemInput!]!
      paymentMethod: PaymentMethod
      taxAmount: Float
      discountAmount: Float
      notes: String
      orderType: OrderType
      tableSessionId: ID
    ): Order!
    updateOrderStatus(id: ID!, status: OrderStatus!): Order!
    cancelOrder(id: ID!): Order!

    # Table Management
    createZone(locationId: ID!, name: String!): FloorPlanZone!
    createTable(zoneId: ID!, name: String!, capacity: Int!, shape: String!, x: Int!, y: Int!, width: Int!, height: Int!): Table!
    updateTableStatus(id: ID!, status: TableStatus!): Table!
    seatTable(id: ID!, guestCount: Int!, serverUserId: ID): TableSession!
    checkoutTable(id: ID!): Table!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
    price: Float!
    notes: String
  }
`;
