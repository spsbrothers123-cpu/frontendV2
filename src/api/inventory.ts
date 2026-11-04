import { apiClient, USE_MOCK } from "./client";
import { delay, store, genId, computeLowStock } from "./mockStore";
import { fetchProducts } from "./products";
import type {
  Product,
  Paginated,
  InventoryKpis,
  StockMovement,
  StockAdjustmentFormValues,
  LowStockItem,
  BranchStockBreakdown,
} from "../types";

export interface InventoryQuery {
  search?: string;
  category?: string;
  status?: string; // in_stock | low_stock | out_of_stock | all
  page?: number;
  pageSize?: number;
}

function productStatusLabel(p: Product): "In Stock" | "Low Stock" | "Out of Stock" {
  if (p.stock <= 0) return "Out of Stock";
  if (p.stock <= p.lowStockThreshold) return "Low Stock";
  return "In Stock";
}

// NOTE for backend integration: expects GET /admin/inventory/kpis
export async function fetchInventoryKpis(): Promise<InventoryKpis> {
  if (USE_MOCK) {
    const items = store.products.filter((p) => p.status === "active");
    const kpis: InventoryKpis = {
      totalItems: items.length,
      lowStock: items.filter((p) => productStatusLabel(p) === "Low Stock").length,
      outOfStock: items.filter((p) => productStatusLabel(p) === "Out of Stock").length,
      stockValue: items.reduce((sum, p) => sum + p.stock * (p.costPrice ?? p.sellingPrice), 0),
    };
    return delay(kpis, 450);
  }
  const { data } = await apiClient.get<InventoryKpis>("/admin/inventory/kpis");
  return data;
}

// NOTE for backend integration: expects GET /admin/inventory with the
// same shape as GET /admin/products, plus a derived stock-status filter.
export async function fetchInventoryOverview(query: InventoryQuery): Promise<Paginated<Product>> {
  if (USE_MOCK) {
    let items = store.products.filter((p) => p.status === "active");
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s));
    }
    if (query.category && query.category !== "all") items = items.filter((p) => p.category === query.category);
    if (query.status && query.status !== "all") {
      items = items.filter((p) => {
        const label = productStatusLabel(p);
        return (
          (query.status === "in_stock" && label === "In Stock") ||
          (query.status === "low_stock" && label === "Low Stock") ||
          (query.status === "out_of_stock" && label === "Out of Stock")
        );
      });
    }
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return delay({ items: items.slice(start, start + pageSize), total: items.length, page, pageSize }, 500);
  }
  const { data } = await apiClient.get<Paginated<Product>>("/admin/inventory", { params: query });
  return data;
}

export function getInventoryStatusLabel(p: Product) {
  return productStatusLabel(p);
}

// NOTE for backend integration: expects GET /admin/inventory/movements
// with query { search, product, type, dateFrom, dateTo, page, pageSize }
export async function fetchStockMovements(query: {
  search?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<StockMovement>> {
  if (USE_MOCK) {
    let items = [...store.stockMovements].sort((a, b) => b.date.localeCompare(a.date));
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter((m) => m.productName.toLowerCase().includes(s) || m.reason.toLowerCase().includes(s));
    }
    if (query.type && query.type !== "all") items = items.filter((m) => m.type === query.type);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return delay({ items: items.slice(start, start + pageSize), total: items.length, page, pageSize }, 500);
  }
  const { data } = await apiClient.get<Paginated<StockMovement>>("/admin/inventory/movements", { params: query });
  return data;
}

// NOTE for backend integration: expects POST /admin/inventory/adjustments
// { productId, adjustmentType, quantity, reason, notes } -> updated Product.
// The backend is the sole source of truth for stock — this call must never
// be simulated as "succeeded" purely on the frontend once wired to a real API.
export async function submitStockAdjustment(values: StockAdjustmentFormValues): Promise<Product> {
  if (USE_MOCK) {
    const product = store.products.find((p) => p.id === values.productId);
    if (!product) return Promise.reject({ status: 404, message: "Product not found." });
    const qty = Number(values.quantity);
    if (!qty || qty <= 0) return Promise.reject({ status: 422, message: "Enter a quantity greater than zero." });
    const delta = values.adjustmentType === "add" ? qty : -qty;
    const previousStock = product.stock;
    const newStock = Math.max(0, previousStock + delta);
    let updated: Product | undefined;
    store.products = store.products.map((p) => {
      if (p.id !== product.id) return p;
      updated = { ...p, stock: newStock, updatedAt: new Date().toISOString() };
      return updated;
    });
    store.stockMovements = [
      {
        id: genId("sm"),
        date: new Date().toISOString(),
        productId: product.id,
        productName: product.name,
        type: "ADJUSTMENT",
        quantity: delta,
        previousStock,
        newStock,
        reason: values.reason,
        user: "Admin",
      },
      ...store.stockMovements,
    ];
    return delay(updated!, 500);
  }
  const { data } = await apiClient.post<Product>("/admin/inventory/adjustments", values);
  return data;
}

// NOTE for backend integration: expects GET /admin/inventory/alerts
export async function fetchLowStockAlerts(): Promise<LowStockItem[]> {
  if (USE_MOCK) {
    return delay(computeLowStock(), 450);
  }
  const { data } = await apiClient.get<LowStockItem[]>("/admin/inventory/alerts");
  return data;
}

// One product's stock AT THE SELECTED BRANCH, plus whether the branch has an
// inventory record for it. Stock belongs to the branch — never derive it from
// CashierInventory or from `byCashier`.
//
// Backend: GET /admin/inventory/:productId/by-cashier (legacy path name).
export async function fetchBranchStock(productId: string): Promise<BranchStockBreakdown> {
  if (USE_MOCK) {
    // The mock store only models one shop-wide number.
    const product = store.products.find((p) => p.id === productId);
    return delay(
      {
        productId,
        productName: product?.name ?? "",
        totalStock: product?.stock ?? 0,
        branchStock: product?.stock ?? 0,
        inventoryRecorded: true,
        byCashier: [],
      },
      350
    );
  }
  const { data } = await apiClient.get<BranchStockBreakdown>(`/admin/inventory/${productId}/by-cashier`);
  return data;
}

// Products the stock-adjustment form can offer: every product assigned to the
// selected branch, with that branch's stock. The backend caps pageSize at 200,
// so this walks the pages instead of asking for one oversized page (which the
// backend rejects). Bounded so a bad `total` can never loop.
const ADJUSTABLE_PAGE_SIZE = 200;
const ADJUSTABLE_MAX_PAGES = 50;

export async function fetchAdjustableProducts(): Promise<Product[]> {
  const all: Product[] = [];
  for (let page = 1; page <= ADJUSTABLE_MAX_PAGES; page++) {
    const res = await fetchProducts({ assignment: "assigned", page, pageSize: ADJUSTABLE_PAGE_SIZE });
    all.push(...res.items);
    if (res.items.length === 0 || page * ADJUSTABLE_PAGE_SIZE >= res.total) break;
  }
  return all;
}
