// Deployed: frontend and API share one origin (/api/* is routed to the backend function).
// Local dev: the backend runs separately on :5002.
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_URL = import.meta.env.VITE_API_URL ||
  (isLocal ? 'http://localhost:5002/graphql' : `${window.location.origin}/api/graphql`);

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function gql(query: string, variables: Record<string, any> = {}, token?: string | null) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    // Usually a hosting 404/500 page: the API is not deployed at API_URL.
    console.error(`API at ${API_URL} returned non-JSON (HTTP ${res.status}):`, text.slice(0, 200));
    throw new ApiError(`Cannot reach the API (HTTP ${res.status} from ${API_URL}). Check VITE_API_URL / backend deployment.`, 'API_UNREACHABLE');
  }
  if (json.errors) {
    const e = json.errors[0];
    const code = e?.extensions?.code;
    if (code === 'UNAUTHENTICATED' && token) window.dispatchEvent(new Event('auth:expired'));
    throw new ApiError(e?.message || 'GraphQL error', code);
  }
  return json.data;
}

export const api = {
  query: (query: string, variables?: Record<string, any>, token?: string | null) => gql(query, variables, token),
  mutation: (mutation: string, variables?: Record<string, any>, token?: string | null) => gql(mutation, variables, token),
};

// ---------------------------------------------------------------- fragments

const USER = `id email name role roleId phone hourlyRate isActive hasPin organizationId locationId departmentId lastLoginAt
  location { id name } customRole { id name }`;
const ORG = `id name legalName type size logoUrl address phone email taxId taxRate taxInclusive country currency locale timezone settings onboardingCompleted plan`;
const LOCATION_F = `id code name address city country phone email timezone isHeadOffice receiptHeader receiptFooter isActive organizationId
  departments { id name description locationId isActive }
  stations { id name color printerName isExpo isActive locationId }`;
const PRODUCT_F = `id name description sku barcode price cost imageUrl color isActive trackStock isOpenPrice prepMinutes dietary channels
  priceOverrides sortOrder categoryId taxRateId stationId recipeCost
  category { id name color } tax { id name rate } station { id name }
  modifierGroups { id name minSelect maxSelect modifiers { id name price isDefault isActive } }
  inventory { quantity minStock locationId }`;
const ORDER_F = `id orderNumber ticketNumber status paymentStatus paymentMethod channel orderType subtotal taxAmount discountAmount discountReason
  serviceCharge tipAmount roundingAmount total paidAmount refundedAmount balanceDue taxBreakdown guestCount notes
  locationId customerId tableId completedAt createdAt
  items { id name quantity price subtotal taxRate discount modifiers notes seat course status voidReason firedAt readyAt stationId productId }
  payments { id type method amount tip tendered change reference reason createdAt user { name } }
  user { id name } customer { id name phone loyaltyPoints houseAccount } location { id name } table { id name }`;

// ---------------------------------------------------------------- auth & org

export const AUTH = {
  LOGIN: `mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { token user { ${USER} } } }`,
  REGISTER: `mutation Register($email: String!, $password: String!, $name: String!, $organizationName: String!, $orgType: OrgType) {
    register(email: $email, password: $password, name: $name, organizationName: $organizationName, orgType: $orgType) { token user { ${USER} } } }`,
  SESSION: `query Session { session { permissions user { ${USER} } organization { ${ORG} } } }`,
  SWITCH_USER: `mutation SwitchUser($pin: String!) { switchUser(pin: $pin) { token user { ${USER} } } }`,
  SET_PIN: `mutation SetPin($pin: String!) { setMyPin(pin: $pin) }`,
  CHANGE_PASSWORD: `mutation ChangePassword($currentPassword: String!, $newPassword: String!) { changePassword(currentPassword: $currentPassword, newPassword: $newPassword) }`,
};

export const ORG_API = {
  PRESETS: `query Presets { platformPresets }`,
  GET: `query Org { organization { ${ORG} } }`,
  UPDATE: `mutation UpdateOrg($input: OrganizationInput!) { updateOrganization(input: $input) { ${ORG} } }`,
  UPDATE_SETTINGS: `mutation UpdateSettings($patch: JSON!) { updateSettings(patch: $patch) { ${ORG} } }`,
  ONBOARD: `mutation Onboard($input: OnboardingInput!) { completeOnboarding(input: $input) { ${ORG} } }`,
  AUDIT: `query Audit($entity: String, $limit: Int, $offset: Int) { auditLogs(entity: $entity, limit: $limit, offset: $offset) { id userName action entity entityId meta createdAt } }`,
};

export const LOCATION = {
  LIST: `query Locations($includeInactive: Boolean) { locations(includeInactive: $includeInactive) { ${LOCATION_F} } }`,
  CREATE: `mutation CreateLocation($input: LocationInput!) { createLocation(input: $input) { ${LOCATION_F} } }`,
  UPDATE: `mutation UpdateLocation($id: ID!, $input: LocationInput!) { updateLocation(id: $id, input: $input) { ${LOCATION_F} } }`,
  DELETE: `mutation DeleteLocation($id: ID!) { deleteLocation(id: $id) }`,
  CREATE_STATION: `mutation CreateStation($input: StationInput!) { createStation(input: $input) { id } }`,
  UPDATE_STATION: `mutation UpdateStation($id: ID!, $input: StationInput!) { updateStation(id: $id, input: $input) { id } }`,
  DELETE_STATION: `mutation DeleteStation($id: ID!) { deleteStation(id: $id) }`,
  DEVICES: `query Devices($locationId: ID) { devices(locationId: $locationId) { id name type identifier ipAddress lastSeenAt isActive locationId } }`,
  CREATE_DEVICE: `mutation CreateDevice($input: DeviceInput!) { createDevice(input: $input) { id } }`,
  UPDATE_DEVICE: `mutation UpdateDevice($id: ID!, $input: DeviceInput!) { updateDevice(id: $id, input: $input) { id } }`,
  DELETE_DEVICE: `mutation DeleteDevice($id: ID!) { deleteDevice(id: $id) }`,
  CREATE_DEPT: `mutation CreateDept($locationId: ID!, $name: String!, $description: String) { createDepartment(locationId: $locationId, name: $name, description: $description) { id } }`,
  DELETE_DEPT: `mutation DeleteDept($id: ID!) { deleteDepartment(id: $id) }`,
};

export const STAFF = {
  USERS: `query Users($locationId: ID, $includeInactive: Boolean) { users(locationId: $locationId, includeInactive: $includeInactive) { ${USER} } }`,
  CREATE: `mutation CreateUser($input: UserInput!) { createUser(input: $input) { id } }`,
  UPDATE: `mutation UpdateUser($id: ID!, $input: UserInput!) { updateUser(id: $id, input: $input) { id } }`,
  DELETE: `mutation DeleteUser($id: ID!) { deleteUser(id: $id) }`,
  ROLES: `query Roles { roles { id name description permissions isSystem userCount } permissionCatalog }`,
  CREATE_ROLE: `mutation CreateRole($input: RoleInput!) { createRole(input: $input) { id } }`,
  UPDATE_ROLE: `mutation UpdateRole($id: ID!, $input: RoleInput!) { updateRole(id: $id, input: $input) { id } }`,
  DELETE_ROLE: `mutation DeleteRole($id: ID!) { deleteRole(id: $id) }`,
  TIME_ENTRIES: `query TimeEntries($locationId: ID, $from: DateTime, $to: DateTime) { timeEntries(locationId: $locationId, from: $from, to: $to) { id clockIn clockOut breakMinutes hours userId user { name hourlyRate } } }`,
  MY_TIME: `query MyTime { myTimeEntry { id clockIn } }`,
  CLOCK_IN: `mutation ClockIn($locationId: ID) { clockIn(locationId: $locationId) { id clockIn } }`,
  CLOCK_OUT: `mutation ClockOut($breakMinutes: Int) { clockOut(breakMinutes: $breakMinutes) { id } }`,
  UPDATE_TIME: `mutation UpdateTime($id: ID!, $clockIn: DateTime, $clockOut: DateTime, $breakMinutes: Int) { updateTimeEntry(id: $id, clockIn: $clockIn, clockOut: $clockOut, breakMinutes: $breakMinutes) { id } }`,
};

// ---------------------------------------------------------------- catalog

export const CATALOG = {
  MENU: `query Menu($search: String) {
    categories(includeInactive: true) { id name description color icon sortOrder isActive productCount }
    products(search: $search) { ${PRODUCT_F} }
  }`,
  POS_MENU: `query PosMenu {
    categories { id name color sortOrder }
    products(isActive: true, channel: "POS") { ${PRODUCT_F} }
    discounts(activeOnly: true) { id name type value scope minOrderAmount requiresApproval code }
  }`,
  CREATE_CATEGORY: `mutation CreateCategory($input: CategoryInput!) { createCategory(input: $input) { id } }`,
  UPDATE_CATEGORY: `mutation UpdateCategory($id: ID!, $input: CategoryInput!) { updateCategory(id: $id, input: $input) { id } }`,
  DELETE_CATEGORY: `mutation DeleteCategory($id: ID!) { deleteCategory(id: $id) }`,
  CREATE_PRODUCT: `mutation CreateProduct($input: ProductInput!) { createProduct(input: $input) { id } }`,
  UPDATE_PRODUCT: `mutation UpdateProduct($id: ID!, $input: ProductInput!) { updateProduct(id: $id, input: $input) { id } }`,
  DELETE_PRODUCT: `mutation DeleteProduct($id: ID!) { deleteProduct(id: $id) }`,
  MODIFIER_GROUPS: `query ModGroups { modifierGroups { id name minSelect maxSelect isActive productIds modifiers { id name price isDefault isActive } } }`,
  CREATE_GROUP: `mutation CreateGroup($input: ModifierGroupInput!) { createModifierGroup(input: $input) { id } }`,
  UPDATE_GROUP: `mutation UpdateGroup($id: ID!, $input: ModifierGroupInput!) { updateModifierGroup(id: $id, input: $input) { id } }`,
  DELETE_GROUP: `mutation DeleteGroup($id: ID!) { deleteModifierGroup(id: $id) }`,
  TAX_RATES: `query TaxRates { taxRates { id name rate isDefault isActive } }`,
  CREATE_TAX: `mutation CreateTax($input: TaxRateInput!) { createTaxRate(input: $input) { id } }`,
  UPDATE_TAX: `mutation UpdateTax($id: ID!, $input: TaxRateInput!) { updateTaxRate(id: $id, input: $input) { id } }`,
  DELETE_TAX: `mutation DeleteTax($id: ID!) { deleteTaxRate(id: $id) }`,
  DISCOUNTS: `query Discounts { discounts { id name code type scope value minOrderAmount maxDiscount categoryId requiresApproval autoApply startsAt endsAt daysOfWeek startTime endTime usageCount isActive isCurrentlyValid } categories { id name } }`,
  CREATE_DISCOUNT: `mutation CreateDiscount($input: DiscountRuleInput!) { createDiscount(input: $input) { id } }`,
  UPDATE_DISCOUNT: `mutation UpdateDiscount($id: ID!, $input: DiscountRuleInput!) { updateDiscount(id: $id, input: $input) { id } }`,
  DELETE_DISCOUNT: `mutation DeleteDiscount($id: ID!) { deleteDiscount(id: $id) }`,
};

// ---------------------------------------------------------------- orders

export const ORDERS = {
  LIST: `query Orders($filter: OrderFilter, $limit: Int, $offset: Int) {
    orders(filter: $filter, limit: $limit, offset: $offset) {
      total
      items { id orderNumber ticketNumber status paymentStatus paymentMethod channel orderType total tipAmount refundedAmount guestCount createdAt
        user { name } customer { name } location { name } table { name } }
    }
  }`,
  GET: `query Order($id: ID!) { order(id: $id) { ${ORDER_F} } }`,
  OPEN: `query OpenOrders($locationId: ID) { openOrders(locationId: $locationId) { id orderNumber ticketNumber orderType total balanceDue guestCount createdAt table { name } customer { name } user { name } } }`,
  TABLE_ORDER: `query TableOrder($tableId: ID!) { tableOrder(tableId: $tableId) { ${ORDER_F} } }`,
  CREATE: `mutation CreateOrder($input: OrderInput!) { createOrder(input: $input) { ${ORDER_F} } }`,
  ADD_ITEMS: `mutation AddItems($orderId: ID!, $items: [OrderItemInput!]!, $fire: Boolean) { addOrderItems(orderId: $orderId, items: $items, fire: $fire) { ${ORDER_F} } }`,
  UPDATE: `mutation UpdateOrder($orderId: ID!, $input: OrderUpdateInput!) { updateOrder(orderId: $orderId, input: $input) { ${ORDER_F} } }`,
  FIRE: `mutation Fire($orderId: ID!, $course: Int) { fireOrder(orderId: $orderId, course: $course) { ${ORDER_F} } }`,
  REQUEST_BILL: `mutation RequestBill($orderId: ID!) { requestBill(orderId: $orderId) { id } }`,
  VOID_ITEM: `mutation VoidItem($itemId: ID!, $reason: String!, $approverPin: String) { voidOrderItem(itemId: $itemId, reason: $reason, approverPin: $approverPin) { ${ORDER_F} } }`,
  APPLY_DISCOUNT: `mutation ApplyDiscount($orderId: ID!, $discount: DiscountInput!) { applyDiscount(orderId: $orderId, discount: $discount) { ${ORDER_F} } }`,
  REMOVE_DISCOUNT: `mutation RemoveDiscount($orderId: ID!) { removeDiscount(orderId: $orderId) { ${ORDER_F} } }`,
  ADD_PAYMENT: `mutation AddPayment($orderId: ID!, $payment: PaymentInput!) { addPayment(orderId: $orderId, payment: $payment) { ${ORDER_F} } }`,
  REFUND: `mutation Refund($orderId: ID!, $amount: Float!, $method: PaymentMethod, $reason: String!, $approverPin: String) {
    refundOrder(orderId: $orderId, amount: $amount, method: $method, reason: $reason, approverPin: $approverPin) { ${ORDER_F} } }`,
  CANCEL: `mutation Cancel($orderId: ID!, $reason: String!, $approverPin: String) { cancelOrder(orderId: $orderId, reason: $reason, approverPin: $approverPin) { ${ORDER_F} } }`,
  SPLIT: `mutation Split($orderId: ID!, $itemIds: [ID!]!) { splitOrder(orderId: $orderId, itemIds: $itemIds) { ${ORDER_F} } }`,
  TRANSFER: `mutation Transfer($orderId: ID!, $tableId: ID!) { transferOrder(orderId: $orderId, tableId: $tableId) { ${ORDER_F} } }`,
  KDS: `query Kds($locationId: ID, $stationId: ID) { kitchenTickets(locationId: $locationId, stationId: $stationId) {
    id orderNumber ticketNumber orderType channel guestCount notes createdAt table { name } customer { name } user { name }
    items { id name quantity modifiers notes seat course status firedAt readyAt stationId }
  } }`,
  ITEM_STATUS: `mutation ItemStatus($itemIds: [ID!]!, $status: ItemStatus!) { updateItemStatus(itemIds: $itemIds, status: $status) }`,
  BUMP: `mutation Bump($orderId: ID!, $stationId: ID) { bumpOrder(orderId: $orderId, stationId: $stationId) }`,
};

// ---------------------------------------------------------------- floor & operations

export const TABLE_MANAGEMENT = {
  ZONES: `query Zones($locationId: ID!) {
    zones(locationId: $locationId) {
      id name locationId
      tables { id name capacity shape x y width height status zoneId
        activeSession { id guestCount startTime server { name } }
        currentOrder { id ticketNumber total balanceDue createdAt } }
    }
  }`,
  CREATE_ZONE: `mutation CreateZone($locationId: ID!, $name: String!) { createZone(locationId: $locationId, name: $name) { id name locationId } }`,
  UPDATE_ZONE: `mutation UpdateZone($id: ID!, $name: String!) { updateZone(id: $id, name: $name) { id } }`,
  DELETE_ZONE: `mutation DeleteZone($id: ID!) { deleteZone(id: $id) }`,
  CREATE_TABLE: `mutation CreateTable($zoneId: ID!, $name: String!, $capacity: Int!, $shape: String!, $x: Int!, $y: Int!, $width: Int!, $height: Int!) {
    createTable(zoneId: $zoneId, name: $name, capacity: $capacity, shape: $shape, x: $x, y: $y, width: $width, height: $height) { id name capacity shape x y width height status zoneId } }`,
  UPDATE_TABLE: `mutation UpdateTable($id: ID!, $input: TableInput!) { updateTable(id: $id, input: $input) { id } }`,
  DELETE_TABLE: `mutation DeleteTable($id: ID!) { deleteTable(id: $id) }`,
  UPDATE_STATUS: `mutation UpdateTableStatus($id: ID!, $status: TableStatus!) { updateTableStatus(id: $id, status: $status) { id status } }`,
  SEAT_TABLE: `mutation SeatTable($id: ID!, $guestCount: Int!, $serverUserId: ID) { seatTable(id: $id, guestCount: $guestCount, serverUserId: $serverUserId) { id guestCount startTime tableId } }`,
  CHECKOUT_TABLE: `mutation CheckoutTable($id: ID!) { checkoutTable(id: $id) { id status } }`,
};

export const RESERVATIONS = {
  LIST: `query Reservations($locationId: ID, $from: DateTime, $to: DateTime) { reservations(locationId: $locationId, from: $from, to: $to) {
    id customerName phone email partySize dateTime durationMin quotedWaitMin status notes tableId createdAt table { name } } }`,
  CREATE: `mutation CreateReservation($input: ReservationInput!) { createReservation(input: $input) { id } }`,
  UPDATE: `mutation UpdateReservation($id: ID!, $input: ReservationInput!) { updateReservation(id: $id, input: $input) { id } }`,
  SEAT: `mutation SeatReservation($id: ID!, $tableId: ID!) { seatReservation(id: $id, tableId: $tableId) { id } }`,
};

const SHIFT_F = `id status openingFloat closingCash expectedCash variance notes openedAt closedAt userId locationId user { name } summary
  cashMovements { id type amount reason createdAt }`;

export const CASH = {
  CURRENT: `query CurrentShift($locationId: ID) { currentShift(locationId: $locationId) { ${SHIFT_F} } }`,
  LIST: `query Shifts($locationId: ID, $limit: Int) { shifts(locationId: $locationId, limit: $limit) { id status openingFloat closingCash expectedCash variance openedAt closedAt user { name } } }`,
  GET: `query Shift($id: ID!) { shift(id: $id) { ${SHIFT_F} } }`,
  OPEN: `mutation OpenShift($locationId: ID, $openingFloat: Float!) { openShift(locationId: $locationId, openingFloat: $openingFloat) { id } }`,
  MOVE: `mutation CashMove($shiftId: ID!, $type: CashMovementType!, $amount: Float!, $reason: String) { addCashMovement(shiftId: $shiftId, type: $type, amount: $amount, reason: $reason) { id } }`,
  CLOSE: `mutation CloseShift($shiftId: ID!, $closingCash: Float!, $notes: String) { closeShift(shiftId: $shiftId, closingCash: $closingCash, notes: $notes) { ${SHIFT_F} } }`,
};

// ---------------------------------------------------------------- inventory

export const INVENTORY = {
  PRODUCTS: `query Inventories($locationId: ID!) { inventories(locationId: $locationId) { id quantity minStock maxStock unit productId locationId product { id name sku price category { name } } } }`,
  UPDATE: `mutation UpdateInventory($productId: ID!, $locationId: ID!, $quantity: Int, $minStock: Int, $maxStock: Int) {
    updateInventory(productId: $productId, locationId: $locationId, quantity: $quantity, minStock: $minStock, maxStock: $maxStock) { id } }`,
  ITEMS: `query StockItems($locationId: ID!) { stockItems(includeInactive: true) { id name sku unit category costPerUnit isActive supplierId supplier { name }
    level(locationId: $locationId) { quantity parLevel reorderPoint } } }`,
  CREATE_ITEM: `mutation CreateStockItem($input: StockItemInput!) { createStockItem(input: $input) { id } }`,
  UPDATE_ITEM: `mutation UpdateStockItem($id: ID!, $input: StockItemInput!) { updateStockItem(id: $id, input: $input) { id } }`,
  ADJUST: `mutation Adjust($input: StockAdjustInput!) { adjustStock(input: $input) { id quantity } }`,
  SET_LEVEL: `mutation SetLevel($input: StockLevelInput!) { setStockLevel(input: $input) { id } }`,
  MOVEMENTS: `query Movements($locationId: ID, $limit: Int) { stockMovements(locationId: $locationId, limit: $limit) { id type quantity unitCost reason reference createdAt stockItem { name unit } } }`,
  LOW: `query Low($locationId: ID!) { lowStock(locationId: $locationId) }`,
  SET_RECIPE: `mutation SetRecipe($productId: ID!, $lines: [RecipeLineInput!]!) { setRecipe(productId: $productId, lines: $lines) { id } }`,
  RECIPE: `query Recipe($id: ID!) { product(id: $id) { id name price recipeCost recipe { id quantity stockItemId stockItem { name unit costPerUnit } } } }`,
  SUPPLIERS: `query Suppliers { suppliers { id name contactName phone email address leadTimeDays paymentTerms isActive } }`,
  CREATE_SUPPLIER: `mutation CreateSupplier($input: SupplierInput!) { createSupplier(input: $input) { id } }`,
  UPDATE_SUPPLIER: `mutation UpdateSupplier($id: ID!, $input: SupplierInput!) { updateSupplier(id: $id, input: $input) { id } }`,
  POS: `query POs($locationId: ID) { purchaseOrders(locationId: $locationId) { id number status total notes expectedAt receivedAt createdAt supplier { name } location { name }
    lines { id quantity receivedQty unitCost stockItemId stockItem { name unit } } } }`,
  CREATE_PO: `mutation CreatePO($input: PurchaseOrderInput!) { createPurchaseOrder(input: $input) { id } }`,
  PO_STATUS: `mutation POStatus($id: ID!, $status: PurchaseOrderStatus!) { updatePurchaseOrderStatus(id: $id, status: $status) { id } }`,
  RECEIVE_PO: `mutation ReceivePO($id: ID!, $lines: [ReceiveLineInput!]!) { receivePurchaseOrder(id: $id, lines: $lines) { id } }`,
};

// ---------------------------------------------------------------- CRM & reports

export const CUSTOMERS = {
  LIST: `query Customers($search: String, $limit: Int, $offset: Int) { customers(search: $search, limit: $limit, offset: $offset) {
    total items { id name phone email loyaltyPoints totalSpent visitCount lastVisitAt houseAccount balance tags } } }`,
  GET: `query Customer($id: ID!) { customer(id: $id) { id name phone email birthday notes tags loyaltyPoints totalSpent visitCount lastVisitAt houseAccount balance createdAt
    recentOrders { id ticketNumber orderNumber total status createdAt orderType } } }`,
  CREATE: `mutation CreateCustomer($input: CustomerInput!) { createCustomer(input: $input) { id name phone loyaltyPoints houseAccount } }`,
  UPDATE: `mutation UpdateCustomer($id: ID!, $input: CustomerInput!) { updateCustomer(id: $id, input: $input) { id } }`,
  ADJUST_POINTS: `mutation AdjustPoints($customerId: ID!, $points: Int!, $reason: String!) { adjustLoyalty(customerId: $customerId, points: $points, reason: $reason) { id loyaltyPoints } }`,
};

export const REPORTS = {
  DASHBOARD: `query Dashboard($locationId: ID, $from: DateTime!, $to: DateTime!, $compareFrom: DateTime, $compareTo: DateTime) {
    dashboard(locationId: $locationId, from: $from, to: $to, compareFrom: $compareFrom, compareTo: $compareTo) }`,
  SALES: `query Sales($from: DateTime!, $to: DateTime!, $locationId: ID) { salesReport(from: $from, to: $to, locationId: $locationId) }`,
};
