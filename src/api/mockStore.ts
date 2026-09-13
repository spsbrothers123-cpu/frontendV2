import type {
  Product,
  Customer,
  Expense,
  Purchase,
  Transaction,
  LowStockItem,
  AdminUser,
  StockMovement,
  CreditBillItem,
  CreditTimelineEvent,
  SessionHistoryItem,
  SessionActivityEntry,
  ShopSettings,
  TaxBillingSettings,
  AppearanceSettings,
  PosSettings,
  SecuritySettings,
  NotificationItem,
  CashierRequest,
  CashierAccount,
  InvitationCode,
  Shop,
} from "../types";

// Simulated network latency + occasional realism. Kept short so the UI
// still feels snappy while loading states remain visible/testable.
export function delay<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const MOCK_ADMIN: AdminUser = {
  id: "admin-1",
  name: "Admin",
  email: "admin@eggmart.local",
  role: "admin",
};

// Dev-mode-only stand-in for the real GET /admin/shops response — never
// used when USE_MOCK is off (see api/shops.ts). Mirrors the shape the
// backend's listShopsForAdmin/toShopResponse actually returns.
let shops: Shop[] = [
  { id: "shop-1", name: "RBR Egg Mart - Veerapandi", code: "veerapandi", location: "Veerapandi", address: "Veerapandi, Coimbatore", current: true },
  { id: "shop-2", name: "RBR Egg Mart - Gandhipuram", code: "gandhipuram", location: "Gandhipuram", address: "Gandhipuram, Coimbatore", current: false },
  { id: "shop-3", name: "RBR Egg Mart - Singanallur", code: "singanallur", location: "Singanallur", address: "Singanallur, Coimbatore", current: false },
];

let products: Product[] = [
  { id: "p1", name: "White Eggs (Tray)", category: "Eggs", sellingPrice: 165, costPrice: 140, stock: 18, unit: "tray", lowStockThreshold: 20, status: "active", createdAt: "2026-06-01", updatedAt: "2026-08-20" },
  { id: "p2", name: "Brown Eggs (Tray)", category: "Eggs", sellingPrice: 185, costPrice: 155, stock: 7, unit: "tray", lowStockThreshold: 15, status: "active", createdAt: "2026-06-01", updatedAt: "2026-08-22" },
  { id: "p3", name: "Country Eggs (Tray)", category: "Eggs", sellingPrice: 240, costPrice: 200, stock: 12, unit: "tray", lowStockThreshold: 15, status: "active", createdAt: "2026-06-01", updatedAt: "2026-08-24" },
  { id: "p4", name: "Egg Carton (30pc)", category: "Packaging", sellingPrice: 45, costPrice: 30, stock: 120, unit: "piece", lowStockThreshold: 30, status: "active", createdAt: "2026-06-10", updatedAt: "2026-08-10" },
  { id: "p5", name: "Duck Eggs (Tray)", category: "Eggs", sellingPrice: 260, costPrice: 220, stock: 4, unit: "tray", lowStockThreshold: 10, status: "inactive", createdAt: "2026-07-01", updatedAt: "2026-08-01" },
];

let customers: Customer[] = [
  { id: "c1", name: "Ravi Kumar", phone: "9876543210", totalPurchases: 24500, billCount: 18, creditBalance: 0, createdAt: "2026-02-10" },
  { id: "c2", name: "Kumar", phone: "9876501234", totalPurchases: 8900, billCount: 9, creditBalance: 0, createdAt: "2026-03-15" },
  { id: "c3", name: "Arjun", phone: "9845098450", totalPurchases: 15600, billCount: 12, creditBalance: 2450, createdAt: "2026-01-22" },
  { id: "c4", name: "Priya S", phone: "9900112233", totalPurchases: 5200, billCount: 5, creditBalance: 600, createdAt: "2026-05-02" },
];

let expenses: Expense[] = [
  { id: "e1", date: "2026-08-26", category: "Transport", description: "Delivery van fuel", amount: 850, createdBy: "Admin" },
  { id: "e2", date: "2026-08-25", category: "Utilities", description: "Electricity bill", amount: 3200, createdBy: "Admin" },
  { id: "e3", date: "2026-08-24", category: "Supplies", description: "Egg trays (packaging)", amount: 1200, createdBy: "Admin" },
];

let purchases: Purchase[] = [
  {
    id: "pu1",
    invoiceNumber: "INV-1042",
    supplierName: "Sri Balaji Poultry Farm",
    purchaseDate: "2026-08-24",
    items: [
      { id: "li1", productId: "p1", inCatalog: true, productName: "White Eggs (Tray)", quantity: 40, unit: "tray", purchasePrice: 140, total: 5600 },
      { id: "li2", productId: "p2", inCatalog: true, productName: "Brown Eggs (Tray)", quantity: 20, unit: "tray", purchasePrice: 155, total: 3100 },
    ],
    subtotal: 8700,
    tax: 0,
    grandTotal: 8700,
    status: "Received",
  },
  {
    id: "pu2",
    invoiceNumber: "INV-1039",
    supplierName: "Green Valley Eggs",
    purchaseDate: "2026-08-20",
    items: [{ id: "li3", productId: "p3", inCatalog: true, productName: "Country Eggs (Tray)", quantity: 15, unit: "tray", purchasePrice: 200, total: 3000 }],
    subtotal: 3000,
    tax: 0,
    grandTotal: 3000,
    status: "Received",
  },
];

const transactions: Transaction[] = [
  { id: "t1", billNumber: "#1042", customerName: "Ravi Kumar", amount: 1250, paymentMethod: "Cash", time: "2026-08-26T10:42:00", status: "Completed" },
  { id: "t2", billNumber: "#1041", customerName: "Kumar", amount: 890, paymentMethod: "UPI", time: "2026-08-26T10:21:00", status: "Completed" },
  { id: "t3", billNumber: "#1040", customerName: "Arjun", amount: 2450, paymentMethod: "Credit", time: "2026-08-26T09:58:00", status: "Pending" },
];

let stockMovements: StockMovement[] = [
  { id: "sm1", date: "2026-08-24T09:15:00", productId: "p1", productName: "White Eggs (Tray)", type: "IN", quantity: 40, previousStock: 8, newStock: 48, reason: "Purchase received (INV-1042)", user: "Admin" },
  { id: "sm2", date: "2026-08-24T09:15:00", productId: "p2", productName: "Brown Eggs (Tray)", type: "IN", quantity: 20, previousStock: 7, newStock: 27, reason: "Purchase received (INV-1042)", user: "Admin" },
  { id: "sm3", date: "2026-08-25T14:02:00", productId: "p1", productName: "White Eggs (Tray)", type: "OUT", quantity: 30, previousStock: 48, newStock: 18, reason: "Sales (bill #1030–#1041)", user: "System" },
  { id: "sm4", date: "2026-08-25T18:40:00", productId: "p2", productName: "Brown Eggs (Tray)", type: "OUT", quantity: 20, previousStock: 27, newStock: 7, reason: "Sales (bill #1030–#1041)", user: "System" },
  { id: "sm5", date: "2026-08-26T11:00:00", productId: "p5", productName: "Duck Eggs (Tray)", type: "ADJUSTMENT", quantity: -2, previousStock: 6, newStock: 4, reason: "Breakage during transport", user: "Admin" },
];

const creditBillsByCustomer: Record<string, CreditBillItem[]> = {
  c3: [
    { id: "cb1", billNumber: "#1040", date: "2026-08-26", amount: 2450, paidAmount: 0, status: "Pending" },
    { id: "cb2", billNumber: "#0988", date: "2026-07-30", amount: 1800, paidAmount: 1800, status: "Paid" },
  ],
  c4: [
    { id: "cb3", billNumber: "#1015", date: "2026-08-15", amount: 600, paidAmount: 0, status: "Pending" },
  ],
};

const creditTimelineByCustomer: Record<string, CreditTimelineEvent[]> = {
  c3: [
    { id: "ce1", type: "bill_created", date: "2026-08-26T09:58:00", description: "Bill #1040 created on credit", amount: 2450 },
    { id: "ce2", type: "bill_created", date: "2026-07-30T12:10:00", description: "Bill #0988 created on credit", amount: 1800 },
    { id: "ce3", type: "payment", date: "2026-08-05T16:20:00", description: "Full payment received for #0988", amount: 1800 },
    { id: "ce4", type: "balance_updated", date: "2026-08-05T16:20:00", description: "Credit balance updated to ₹2,450" },
  ],
  c4: [
    { id: "ce5", type: "bill_created", date: "2026-08-15T10:30:00", description: "Bill #1015 created on credit", amount: 600 },
    { id: "ce6", type: "partial_payment", date: "2026-08-20T09:00:00", description: "Partial payment received", amount: 0 },
  ],
};

let sessionHistory: SessionHistoryItem[] = [
  { id: "ses1", cashier: "Meena", shop: "Main Shop", openingTime: "2026-08-26T08:00:00", closingTime: "2026-08-26T20:15:00", openingCash: 2000, closingCash: 33450, sales: 31200, cashDifference: 250, status: "Discrepancy" },
  { id: "ses2", cashier: "Raghav", shop: "Main Shop", openingTime: "2026-08-25T08:00:00", closingTime: "2026-08-25T20:05:00", openingCash: 2000, closingCash: 28900, sales: 26900, cashDifference: 0, status: "Closed" },
  { id: "ses3", cashier: "Meena", shop: "Main Shop", openingTime: "2026-08-24T08:00:00", closingTime: "2026-08-24T20:20:00", openingCash: 1500, closingCash: 24100, sales: 22600, cashDifference: 0, status: "Closed" },
];

const sessionActivityById: Record<string, SessionActivityEntry[]> = {
  ses1: [
    { id: "a1", time: "2026-08-26T08:00:00", description: "Session opened with ₹2,000 float" },
    { id: "a2", time: "2026-08-26T12:30:00", description: "Mid-day cash count: ₹18,400" },
    { id: "a3", time: "2026-08-26T20:15:00", description: "Session closed — cash short by ₹250" },
  ],
};

let shopSettings: ShopSettings = {
  shopName: "RBR Egg Mart",
  address: "MadhanathaPuram",
  gstin: "",
  phone: "",
  email: "admin@eggmart.local",
};

let taxSettings: TaxBillingSettings = {
  gstEnabled: false,
  gstPercentage: 0,
  invoicePrefix: "INV-",
  invoiceFooterNote: "Thank you for shopping with us!",
};

let appearanceSettings: AppearanceSettings = {
  theme: "light",
  productDisplay: "grid",
};

let posSettings: PosSettings = {
  receiptFooter: "Thank you for shopping with us!",
  printerName: "",
  autoPrintReceipt: false,
  invoiceFormat: "Thermal 80mm",
};

let securitySettings: SecuritySettings = {
  sessionTimeoutMinutes: 30,
  requireConfirmationForRefunds: true,
};

let notifications: NotificationItem[] = [
  { id: "n1", type: "low_stock", title: "Low stock", message: "Brown Eggs (Tray) is running low (7 left).", time: "2026-08-26T10:00:00", read: false },
  { id: "n2", type: "payment_pending", title: "Credit pending", message: "Arjun has ₹2,450 in pending credit.", time: "2026-08-26T09:58:00", read: false },
  { id: "n3", type: "session_event", title: "Session closed with discrepancy", message: "Meena's session closed ₹250 short.", time: "2026-08-26T20:15:00", read: true },
];

let cashierRequests: CashierRequest[] = [
  {
    id: "req1",
    name: "Suresh Babu",
    email: "suresh.babu@example.com",
    username: "suresh.b",
    phone: "9812345670",
    shop: { id: "shop-1", name: "Main Shop" },
    invitationCodeMasked: "••••31",
    signupDate: "2026-08-27T09:12:00",
    status: "PENDING_ADMIN_APPROVAL",
  },
  {
    id: "req2",
    name: "Divya R",
    email: "divya.r@example.com",
    username: "divya.r",
    phone: "9845567890",
    shop: { id: "shop-1", name: "Main Shop" },
    invitationCodeMasked: "••••31",
    signupDate: "2026-08-28T14:40:00",
    status: "PENDING_ADMIN_APPROVAL",
  },
  {
    id: "req3",
    name: "Ganesh N",
    email: "ganesh.n@example.com",
    username: "ganesh.n",
    phone: null,
    shop: { id: "shop-1", name: "Main Shop" },
    invitationCodeMasked: "••••08",
    signupDate: "2026-08-15T11:05:00",
    status: "REJECTED",
  },
];

// The mock backend keeps at most one invitation code alive at a time,
// mirroring the real invalidate-previous-on-generate rule.
let invitationCode: InvitationCode | null = null;

let cashiers: CashierAccount[] = [
  { id: "u1", name: "Meena", email: "meena@eggmart.local", phone: "9876500001", role: "cashier", active: true, shop: { id: "shop-1", name: "Main Shop" } },
  { id: "u2", name: "Karthik", email: "karthik@eggmart.local", phone: "9876500002", role: "cashier", active: true, shop: { id: "shop-1", name: "Main Shop" } },
  { id: "u3", name: "Lakshmi", email: "lakshmi@eggmart.local", role: "cashier", active: false, shop: { id: "shop-1", name: "Main Shop" } },
];

// ── generic helpers ────────────────────────────────────
export function genId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export const store = {
  get shops() { return shops; },
  set shops(v: Shop[]) { shops = v; },
  get products() { return products; },
  set products(v: Product[]) { products = v; },
  get customers() { return customers; },
  set customers(v: Customer[]) { customers = v; },
  get expenses() { return expenses; },
  set expenses(v: Expense[]) { expenses = v; },
  get purchases() { return purchases; },
  set purchases(v: Purchase[]) { purchases = v; },
  get transactions() { return transactions; },
  get stockMovements() { return stockMovements; },
  set stockMovements(v: StockMovement[]) { stockMovements = v; },
  get sessionHistory() { return sessionHistory; },
  set sessionHistory(v: SessionHistoryItem[]) { sessionHistory = v; },
  get shopSettings() { return shopSettings; },
  set shopSettings(v: ShopSettings) { shopSettings = v; },
  get taxSettings() { return taxSettings; },
  set taxSettings(v: TaxBillingSettings) { taxSettings = v; },
  get appearanceSettings() { return appearanceSettings; },
  set appearanceSettings(v: AppearanceSettings) { appearanceSettings = v; },
  get posSettings() { return posSettings; },
  set posSettings(v: PosSettings) { posSettings = v; },
  get securitySettings() { return securitySettings; },
  set securitySettings(v: SecuritySettings) { securitySettings = v; },
  get notifications() { return notifications; },
  set notifications(v: NotificationItem[]) { notifications = v; },
  get cashierRequests() { return cashierRequests; },
  set cashierRequests(v: CashierRequest[]) { cashierRequests = v; },
  get cashiers() { return cashiers; },
  set cashiers(v: CashierAccount[]) { cashiers = v; },
  get invitationCode() { return invitationCode; },
  set invitationCode(v: InvitationCode | null) { invitationCode = v; },
};

export function getCreditBills(customerId: string): CreditBillItem[] {
  return creditBillsByCustomer[customerId] ?? [];
}

export function getCreditTimeline(customerId: string): CreditTimelineEvent[] {
  return creditTimelineByCustomer[customerId] ?? [];
}

export function getSessionActivity(sessionId: string): SessionActivityEntry[] {
  return sessionActivityById[sessionId] ?? [
    { id: genId("a"), time: sessionHistory.find((s) => s.id === sessionId)?.openingTime ?? new Date().toISOString(), description: "Session opened" },
  ];
}

// Lazily flips a stale ACTIVE code to EXPIRED once its expiry has passed.
// The real backend does this by clock at read time too — expiry isn't an
// event that has to be pushed, just a fact checked on access.
export function getEffectiveInvitationCode(): InvitationCode | null {
  if (invitationCode && invitationCode.status === "ACTIVE" && new Date(invitationCode.expiresAt).getTime() <= Date.now()) {
    invitationCode = { ...invitationCode, status: "EXPIRED" };
  }
  return invitationCode;
}

export function computeLowStock(): LowStockItem[] {
  return products
    .filter((p) => p.status === "active" && p.stock <= p.lowStockThreshold)
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      currentStock: p.stock,
      unit: p.unit,
      threshold: p.lowStockThreshold,
      status: p.stock <= p.lowStockThreshold * 0.5 ? "Critical" : "Low Stock",
    }));
}
