// Consolidation module — shared types.
//
// These types ARE the frontend's side of the Consolidation API contract
// (see CONSOLIDATION_API_CONTRACT.md at the repo root). They are kept in
// their own file on purpose: the existing `types/index.ts` (and its
// ReportRange/ExportFormat) is not touched by this feature.

export type ConsolidationRangeKey = "today" | "yesterday" | "last7" | "last30" | "custom";

export type ConsolidationSection =
  | "overview"
  | "shops"
  | "products"
  | "customers"
  | "sales"
  | "purchases"
  | "expenses"
  | "low-stock";

export type ConsolidationExportFormat = "excel" | "pdf";
export type ConsolidationExportScope = "section" | "full";

/** An authorized branch, as returned by GET /admin/shops (the `current` flag is ignored). */
export interface ConsolidationShop {
  id: string;
  name: string;
}

/** "all" or a shop id the admin is authorized for. */
export type ConsolidationShopFilter = string;

export interface ConsolidationQuery {
  shop: ConsolidationShopFilter;
  range: ConsolidationRangeKey;
  /** YYYY-MM-DD, always resolved by the frontend from the preset / custom range. */
  dateFrom: string;
  dateTo: string;
}

export interface Paged {
  page: number;
  pageSize: number;
  total: number;
}

// ── Shared row shapes ──────────────────────────────────
export interface ShopSalesRow {
  shopId: string;
  shopName: string;
  salesAmount: number;
  completedBills: number;
  /** Share of total sales in the selected scope, 0–100. */
  contributionPct: number;
}

export interface ShopAmountRow {
  shopId: string;
  shopName: string;
  amount: number;
  count: number;
}

export interface ProductStockRow {
  /** Stable grouping key built by the backend (name + variant + unit). */
  key: string;
  name: string;
  variant?: string | null;
  category?: string | null;
  unit: string;
  totalStock: number;
  /** shopId -> available quantity. A missing/null entry means the shop does not carry the product. */
  perShop: Record<string, number | null>;
}

export interface LowStockRow {
  id: string;
  productName: string;
  unit: string;
  shopId: string;
  shopName: string;
  available: number;
  threshold: number;
  status: "Low Stock" | "Critical" | "Out of Stock";
}

export interface CreditSummary {
  totalOutstanding: number;
  customersWithCredit: number;
  totalCustomers: number;
  byShop: { shopId: string; shopName: string; outstanding: number }[];
}

// ── Section payloads ───────────────────────────────────
export interface OverviewData {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  activeShops: number;
  shopSales: ShopSalesRow[];
  stockPreview: { shops: ConsolidationShop[]; rows: ProductStockRow[] };
  lowStockPreview: LowStockRow[];
  lowStockTotal: number;
  credits: CreditSummary;
  purchaseSummary: { total: number; count: number };
  expenseSummary: { total: number; count: number };
}

export interface SalesTrendPoint {
  label: string;
  total: number;
  /** shopId -> sales amount for that day */
  perShop: Record<string, number>;
}

export interface SalesData {
  totalSales: number;
  totalBills: number;
  shops: ShopSalesRow[];
  trend: SalesTrendPoint[];
}

export interface ProductsData extends Paged {
  shops: ConsolidationShop[];
  rows: ProductStockRow[];
}

export interface CustomerRow {
  id: string;
  name: string;
  phone?: string | null;
  shopId: string;
  shopName: string;
  purchaseCount: number;
  purchaseTotal: number;
  outstandingCredit: number;
}

export interface CustomersData extends Paged {
  summary: CreditSummary;
  rows: CustomerRow[];
}

export interface DateAmountRow {
  label: string;
  total: number;
  count: number;
}

export interface PurchasesData {
  total: number;
  count: number;
  byShop: ShopAmountRow[];
  byDate: DateAmountRow[];
}

export interface ExpensesData {
  total: number;
  count: number;
  byShop: ShopAmountRow[];
  byDate: DateAmountRow[];
  /** Optional — only present when the backend supports categories. */
  byCategory?: { category: string; amount: number; count: number }[];
}

export interface LowStockData extends Paged {
  rows: LowStockRow[];
}
