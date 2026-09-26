const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname.endsWith('vercel.app') 
    ? `https://${window.location.hostname}/api/graphql` 
    : 'http://localhost:5002/graphql');

async function gql(query: string, variables: Record<string, any> = {}, token?: string | null) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL error');
  return json.data;
}

export const api = {
  query: (query: string, variables?: Record<string, any>, token?: string | null) => gql(query, variables, token),
  mutation: (mutation: string, variables?: Record<string, any>, token?: string | null) => gql(mutation, variables, token),
};

// ---- Auth ----
export const AUTH = {
  LOGIN: `mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id email name role organizationId locationId departmentId }
    }
  }`,
  REGISTER: `mutation Register($email: String!, $password: String!, $name: String!, $organizationName: String!, $orgType: OrgType) {
    register(email: $email, password: $password, name: $name, organizationName: $organizationName, orgType: $orgType) {
      token
      user { id email name role organizationId }
    }
  }`,
  ME: `query Me {
    me { id email name role organizationId locationId departmentId }
  }`,
};

// ---- Organization ----
export const ORG = {
  GET: `query GetOrg($id: ID!) {
    organization(id: $id) { id name type taxRate domain address phone email logoUrl }
  }`,
  UPDATE: `mutation UpdateOrg($id: ID!, $name: String, $type: OrgType, $taxRate: Float, $address: String, $phone: String, $email: String) {
    updateOrganization(id: $id, name: $name, type: $type, taxRate: $taxRate, address: $address, phone: $phone, email: $email) {
      id name type taxRate
    }
  }`,
};

// ---- Locations ----
export const LOCATION = {
  LIST: `query Locations($organizationId: ID!) {
    locations(organizationId: $organizationId) {
      id name address phone email isActive organizationId
      departments { id name description locationId isActive }
    }
  }`,
  CREATE: `mutation CreateLocation($organizationId: ID!, $name: String!, $address: String, $phone: String, $email: String) {
    createLocation(organizationId: $organizationId, name: $name, address: $address, phone: $phone, email: $email) {
      id name address phone email isActive organizationId
      departments { id name }
    }
  }`,
  UPDATE: `mutation UpdateLocation($id: ID!, $name: String, $address: String, $isActive: Boolean) {
    updateLocation(id: $id, name: $name, address: $address, isActive: $isActive) {
      id name address isActive
    }
  }`,
  DELETE: `mutation DeleteLocation($id: ID!) { deleteLocation(id: $id) }`,
};

// ---- Departments ----
export const DEPARTMENT = {
  LIST: `query Departments($locationId: ID!) {
    departments(locationId: $locationId) { id name description locationId isActive }
  }`,
  CREATE: `mutation CreateDept($locationId: ID!, $name: String!, $description: String) {
    createDepartment(locationId: $locationId, name: $name, description: $description) {
      id name description locationId isActive
    }
  }`,
  DELETE: `mutation DeleteDept($id: ID!) { deleteDepartment(id: $id) }`,
};

// ---- Products ----
export const PRODUCT = {
  LIST: `query Products($organizationId: ID!, $categoryId: ID, $isActive: Boolean) {
    products(organizationId: $organizationId, categoryId: $categoryId, isActive: $isActive) {
      id name description sku price cost isActive organizationId categoryId
      category { id name color icon }
      inventory { quantity minStock locationId }
    }
  }`,
  CREATE: `mutation CreateProduct($organizationId: ID!, $name: String!, $price: Float!, $description: String, $sku: String, $cost: Float, $categoryId: ID) {
    createProduct(organizationId: $organizationId, name: $name, price: $price, description: $description, sku: $sku, cost: $cost, categoryId: $categoryId) {
      id name price description sku cost isActive categoryId
      category { id name color }
    }
  }`,
  UPDATE: `mutation UpdateProduct($id: ID!, $name: String, $price: Float, $description: String, $isActive: Boolean, $categoryId: ID) {
    updateProduct(id: $id, name: $name, price: $price, description: $description, isActive: $isActive, categoryId: $categoryId) {
      id name price description isActive categoryId
      category { id name color }
    }
  }`,
  DELETE: `mutation DeleteProduct($id: ID!) { deleteProduct(id: $id) }`,
};

// ---- Categories ----
export const CATEGORY = {
  LIST: `query Categories($organizationId: ID!) {
    categories(organizationId: $organizationId) { id name description color icon isActive }
  }`,
  CREATE: `mutation CreateCategory($organizationId: ID!, $name: String!, $color: String, $icon: String) {
    createCategory(organizationId: $organizationId, name: $name, color: $color, icon: $icon) {
      id name color icon isActive
    }
  }`,
  DELETE: `mutation DeleteCategory($id: ID!) { deleteCategory(id: $id) }`,
};

// ---- Users ----
export const USER = {
  LIST: `query Users($organizationId: ID!) {
    users(organizationId: $organizationId) {
      id email name role phone isActive organizationId locationId departmentId
      location { id name }
      department { id name }
    }
  }`,
  CREATE: `mutation CreateUser($organizationId: ID!, $email: String!, $password: String!, $name: String!, $role: UserRole, $locationId: ID, $phone: String) {
    createUser(organizationId: $organizationId, email: $email, password: $password, name: $name, role: $role, locationId: $locationId, phone: $phone) {
      id email name role phone isActive
    }
  }`,
  UPDATE: `mutation UpdateUser($id: ID!, $name: String, $role: UserRole, $locationId: ID, $isActive: Boolean) {
    updateUser(id: $id, name: $name, role: $role, locationId: $locationId, isActive: $isActive) {
      id email name role isActive
    }
  }`,
  DELETE: `mutation DeleteUser($id: ID!) { deleteUser(id: $id) }`,
};

// ---- Orders ----
export const ORDER = {
  LIST: `query Orders($organizationId: ID!, $locationId: ID, $status: OrderStatus, $limit: Int) {
    orders(organizationId: $organizationId, locationId: $locationId, status: $status, limit: $limit) {
      id orderNumber status paymentMethod subtotal taxAmount discountAmount total createdAt
      items { id productId quantity price subtotal product { id name } }
      user { id name }
      location { id name }
    }
  }`,
  CREATE: `mutation CreateOrder($organizationId: ID!, $locationId: ID!, $items: [OrderItemInput!]!, $paymentMethod: PaymentMethod, $taxAmount: Float, $discountAmount: Float, $notes: String, $orderType: OrderType, $tableSessionId: ID) {
    createOrder(organizationId: $organizationId, locationId: $locationId, items: $items, paymentMethod: $paymentMethod, taxAmount: $taxAmount, discountAmount: $discountAmount, notes: $notes, orderType: $orderType, tableSessionId: $tableSessionId) {
      id orderNumber status total createdAt orderType tableSessionId
      items { id productId quantity price product { name } }
    }
  }`,
  UPDATE_STATUS: `mutation UpdateStatus($id: ID!, $status: OrderStatus!) {
    updateOrderStatus(id: $id, status: $status) { id status }
  }`,
};

// ---- Inventory ----
export const INVENTORY = {
  LIST: `query Inventories($locationId: ID!) {
    inventories(locationId: $locationId) {
      id quantity minStock maxStock unit productId locationId
      product { id name price sku }
    }
  }`,
  LOW_STOCK: `query LowStock($organizationId: ID!, $locationId: ID) {
    lowStockProducts(organizationId: $organizationId, locationId: $locationId) {
      id quantity minStock unit productId
      product { id name price }
    }
  }`,
  UPDATE: `mutation UpdateInventory($productId: ID!, $locationId: ID!, $quantity: Int, $minStock: Int) {
    updateInventory(productId: $productId, locationId: $locationId, quantity: $quantity, minStock: $minStock) {
      id quantity minStock productId locationId
    }
  }`,
};

// ---- Analytics ----
export const ANALYTICS = {
  DASHBOARD: `query Dashboard($organizationId: ID!, $locationId: ID) {
    dashboardMetrics(organizationId: $organizationId, locationId: $locationId) {
      todayRevenue weekRevenue monthRevenue
      todayOrders weekOrders monthOrders
      avgOrderValue lowStockCount activeProducts totalCustomers
    }
  }`,
  REVENUE_CHART: `query RevenueChart($organizationId: ID!, $locationId: ID, $days: Int) {
    revenueChart(organizationId: $organizationId, locationId: $locationId, days: $days) {
      date revenue orders
    }
  }`,
};

// ---- Table Management ----
export const TABLE_MANAGEMENT = {
  ZONES: `query Zones($locationId: ID!) {
    zones(locationId: $locationId) {
      id name locationId
      tables {
        id name capacity shape x y width height status zoneId
        sessions {
          id guestCount startTime endTime serverUserId
        }
      }
    }
  }`,
  CREATE_ZONE: `mutation CreateZone($locationId: ID!, $name: String!) {
    createZone(locationId: $locationId, name: $name) {
      id name locationId
    }
  }`,
  CREATE_TABLE: `mutation CreateTable($zoneId: ID!, $name: String!, $capacity: Int!, $shape: String!, $x: Int!, $y: Int!, $width: Int!, $height: Int!) {
    createTable(zoneId: $zoneId, name: $name, capacity: $capacity, shape: $shape, x: $x, y: $y, width: $width, height: $height) {
      id name capacity shape x y width height status zoneId
    }
  }`,
  UPDATE_STATUS: `mutation UpdateTableStatus($id: ID!, $status: TableStatus!) {
    updateTableStatus(id: $id, status: $status) {
      id status
    }
  }`,
  SEAT_TABLE: `mutation SeatTable($id: ID!, $guestCount: Int!, $serverUserId: ID) {
    seatTable(id: $id, guestCount: $guestCount, serverUserId: $serverUserId) {
      id guestCount startTime tableId serverUserId
    }
  }`,
  CHECKOUT_TABLE: `mutation CheckoutTable($id: ID!) {
    checkoutTable(id: $id) {
      id status
    }
  }`,
};
