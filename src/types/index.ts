// ── Auth ──────────────────────────────────────────────
export type AdminRole = "admin" | "cashier";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl?: string;
}

// ── Shops (Global Admin Shop Selector) ────────────────
// One row per shop this admin is authorized for (backend AdminShopLink).
// `current` reflects the admin's active shop server-side — the frontend
// never decides this on its own.
export interface Shop {
  id: string;
  name: string;
  code: string;
  location: string;
  address?: string | null;
  current: boolean;
}

// ── Shared ────────────────────────────────────────────
export type RequestState = "idle" | "loading" | "success" | "error";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type DateRangeKey = "today" | "week" | "month" | "custom";

// ── Dashboard ─────────────────────────────────────────
export interface DashboardKpis {
  totalSales: number;
  totalSalesTrend: number; // percent, +/-
  totalRevenue: number;
  totalRevenueTrend: number;
  cashSales: number;
  cashSalesTrend: number;
  creditSales: number;
  creditSalesTrend: number;
  comparisonLabel: string; // e.g. "vs yesterday"
}

export interface SalesPoint {
  label: string; // e.g. "Mon", or a date
  value: number;
}

export type SalesRange = "7d" | "30d" | "3m";

export interface Transaction {
  id: string;
  billNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: "Cash" | "UPI" | "Credit" | "Card";
  time: string; // ISO
  status: "Completed" | "Pending" | "Refunded";
}

export interface LowStockItem {
  productId: string;
  productName: string;
  currentStock: number;
  unit: string;
  threshold: number;
  status: "Low Stock" | "Critical";
}

// ── Products ──────────────────────────────────────────
export type ProductStatus = "active" | "inactive";
export type ProductUnit = "kg" | "g" | "litre" | "ml" | "piece" | "tray" | "box";

export interface Product {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  costPrice?: number;
  stock: number;
  unit: ProductUnit;
  lowStockThreshold: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormValues {
  name: string;
  category: string;
  sellingPrice: number | "";
  costPrice?: number | "";
  stock: number | "";
  unit: ProductUnit;
  lowStockThreshold: number | "";
  status: ProductStatus;
  // Cashier-level inventory foundation: who owns the initial `stock` above.
  // Only meaningful (and required by the backend) when creating a brand-new
  // product with stock > 0 — every unit of stock belongs to a specific
  // cashier, never a shop-wide pool. Ignored on edits (editing a product no
  // longer touches stock at all; see ProductFormDrawer's doc comment).
  cashierId?: string;
}

// ── Customers ─────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalPurchases: number;
  billCount: number;
  creditBalance: number;
  createdAt: string;
}

export interface CustomerFormValues {
  name: string;
  phone: string;
}

export interface CustomerPurchaseHistoryItem {
  id: string;
  billNumber: string;
  date: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

export interface CustomerPaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  note?: string;
}

// ── Expenses ──────────────────────────────────────────
export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  createdBy: string;
}

export interface ExpenseFormValues {
  date: string;
  category: string;
  description: string;
  amount: number | "";
}

// ── Purchases ─────────────────────────────────────────
export interface PurchaseLineItem {
  id: string;
  // null -> a "purchase-only" item added via "Add to Purchase List — Not
  // in Catalog": it isn't a Product Catalog record and never will be.
  productId: string | null;
  inCatalog: boolean;
  productName: string;
  quantity: number;
  unit: ProductUnit;
  purchasePrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  purchaseDate: string;
  items: PurchaseLineItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  status: "Received" | "Pending" | "Cancelled";
}

export interface PurchaseFormItemValues {
  // Omitted/undefined -> "Add to Purchase List — Not in Catalog" (no
  // Product Catalog record involved). Present -> "Add Product in Catalog".
  productId?: string;
  productName: string;
  quantity: number;
  unit: ProductUnit;
  purchasePrice: number;
}

export interface PurchaseFormValues {
  supplierName: string;
  invoiceNumber: string;
  purchaseDate: string;
  // Cashier-level inventory foundation: every catalog item in this
  // purchase increases THIS cashier's own inventory — never a shop-wide
  // pool, even though a single purchase covers the whole invoice.
  cashierId: string;
  items: PurchaseFormItemValues[];
}

// ── Inventory ─────────────────────────────────────────
export type StockMovementType = "IN" | "OUT" | "ADJUSTMENT";

export interface InventoryKpis {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  stockValue: number;
}

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  user: string;
}

export type AdjustmentType = "add" | "remove";

export interface StockAdjustmentFormValues {
  productId: string;
  // Cashier-level inventory foundation: every adjustment targets a
  // specific cashier's own inventory — never a shop-wide pool.
  cashierId: string;
  adjustmentType: AdjustmentType;
  quantity: number | "";
  reason: string;
  notes?: string;
}

// Cashier-level inventory foundation: one product's stock, broken down by
// the cashier who owns each portion of it. Never merge these into a single
// number in the UI — that's exactly the leakage the isolation requirement
// forbids. Powers the "which cashier?" pickers and any per-cashier detail
// view.
export interface CashierStockBreakdown {
  productId: string;
  productName: string;
  totalStock: number;
  byCashier: { cashierId: string; cashierName: string; quantity: number }[];
}

// ── Credits ───────────────────────────────────────────
export interface CreditSummary {
  totalCredit: number;
  collected: number;
  pending: number;
}

export interface CustomerCredit {
  customerId: string;
  customerName: string;
  totalCredit: number;
  paid: number;
  pending: number;
  lastPayment: string | null;
}

export interface CreditBillItem {
  id: string;
  billNumber: string;
  date: string;
  amount: number;
  paidAmount: number;
  status: "Pending" | "Partially Paid" | "Paid";
}

export type CreditTimelineEventType = "bill_created" | "partial_payment" | "payment" | "balance_updated";

export interface CreditTimelineEvent {
  id: string;
  type: CreditTimelineEventType;
  date: string;
  description: string;
  amount?: number;
}

export type PaymentMethod = "Cash" | "UPI" | "Card" | "Credit" | "Other";

export interface PaymentCollectionFormValues {
  amount: number | "";
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

// ── Reports ───────────────────────────────────────────
export type ReportRange = "today" | "week" | "month" | "custom";
export type ExportFormat = "excel" | "csv" | "pdf";

export interface BreakdownSlice {
  label: string;
  value: number;
}

export interface SalesReportData {
  totalSales: number;
  revenue: number;
  billCount: number;
  averageBillValue: number;
  salesTrend: SalesPoint[];
  revenueTrend: SalesPoint[];
  paymentBreakdown: BreakdownSlice[];
}

export interface PurchaseReportData {
  totalPurchases: number;
  purchaseCost: number;
  billCount: number;
  topSuppliers: BreakdownSlice[];
  purchaseTrend: SalesPoint[];
  supplierDistribution: BreakdownSlice[];
}

export interface ExpenseReportData {
  totalExpenses: number;
  topCategory: string;
  expenseTrend: SalesPoint[];
  categoryBreakdown: BreakdownSlice[];
}

export interface ProfitReportData {
  revenue: number;
  purchaseCost: number;
  expenses: number;
  estimatedProfit: number;
}

// ── History ───────────────────────────────────────────
export type HistoryType = "Sale" | "Purchase" | "Payment";

export interface HistoryRecord {
  id: string;
  time: string;
  type: HistoryType;
  reference: string;
  party: string; // customer or supplier name
  amount: number;
  paymentMethod: string;
  createdBy: string;
}

export interface SaleDetails {
  billNumber: string;
  date: string;
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  paymentMethod: string;
  total: number;
  createdBy: string;
}

export interface PurchaseDetails {
  invoiceNumber: string;
  supplierName: string;
  date: string;
  items: { name: string; quantity: number; purchasePrice: number }[];
  total: number;
}

export interface PaymentDetails {
  customerName: string;
  amount: number;
  method: string;
  reference?: string;
  date: string;
  createdBy: string;
}

// ── Sessions ──────────────────────────────────────────
export type SessionStatus = "Open" | "Closed" | "Discrepancy";

export interface ActiveSession {
  id: string;
  cashier: string;
  shop: string;
  openingTime: string;
  openingCash: number;
  sales: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  creditSales: number;
  expectedClosingCash: number;
  actualClosingCash: number | null;
  cashDifference: number | null;
  status: SessionStatus;
}

export interface SessionHistoryItem {
  id: string;
  cashier: string;
  openingTime: string;
  closingTime: string;
  openingCash: number;
  closingCash: number;
  sales: number;
  cashDifference: number;
  status: SessionStatus;
}

export interface SessionActivityEntry {
  id: string;
  time: string;
  description: string;
}

export interface SessionDetails extends SessionHistoryItem {
  cashSales: number;
  upiSales: number;
  cardSales: number;
  creditSales: number;
  expectedClosingCash: number;
  activity: SessionActivityEntry[];
}

// ── Settings ──────────────────────────────────────────
export interface ShopSettings {
  shopName: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
}

export interface TaxBillingSettings {
  gstEnabled: boolean;
  gstPercentage: number;
  invoicePrefix: string;
  invoiceFooterNote: string;
}

export type ThemePreference = "light" | "dark" | "system";
export type ProductDisplayMode = "grid" | "list";

export interface AppearanceSettings {
  theme: ThemePreference;
  productDisplay: ProductDisplayMode;
}

export interface PosSettings {
  receiptFooter: string;
  printerName: string;
  autoPrintReceipt: boolean;
  invoiceFormat: "A4" | "Thermal 80mm" | "Thermal 58mm";
}

export interface SecuritySettings {
  sessionTimeoutMinutes: number;
  requireConfirmationForRefunds: boolean;
}

// ── Admin Profile ─────────────────────────────────────
export interface AdminProfile extends AdminUser {
  lastLogin: string;
}

export interface AdminProfileFormValues {
  name: string;
  email: string;
}

// ── Global Search ─────────────────────────────────────
export interface SearchResultItem {
  id: string;
  label: string;
  subtitle?: string;
  path: string;
}

export interface GlobalSearchResults {
  products: SearchResultItem[];
  customers: SearchResultItem[];
  transactions: SearchResultItem[];
}

// ── Notifications ─────────────────────────────────────
export type NotificationType = "low_stock" | "payment_pending" | "session_event" | "system";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

// ── Invitation codes ────────────────────────────────────
export type InvitationCodeStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";

export interface InvitationCode {
  id: string;
  code: string;
  status: InvitationCodeStatus;
  createdAt: string;
  expiresAt: string;
}

// ── Cashier management ─────────────────────────────────
export type CashierRequestStatus = "PENDING_ADMIN_APPROVAL" | "REJECTED";

export interface CashierRequest {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string | null;
  shop: { id: string; name: string } | null;
  // Branch the cashier entered on signup. Optional/nullable because the
  // backend doesn't return this field yet (Phase 2) — render a placeholder
  // rather than assuming it's always present.
  branchName?: string | null;
  // Masked representation only (e.g. "••••31") — the backend never sends
  // the full invitation code back once a signup request has been created.
  invitationCodeMasked: string;
  signupDate: string;
  status: CashierRequestStatus;
}

export type CashierAccountStatus = "active" | "suspended";

export interface CashierAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  // Same not-yet-backed field as CashierRequest.branchName above.
  branchName?: string | null;
  role: AdminRole;
  active: boolean;
  shop: { id: string; name: string; location?: string } | null;
}

export interface CashierUpdateValues {
  name: string;
  email: string;
  phone: string;
}
