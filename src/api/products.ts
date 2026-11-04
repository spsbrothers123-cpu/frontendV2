import { apiClient, USE_MOCK } from "./client";
import { delay, store, genId } from "./mockStore";
import type { Product, ProductFormValues, Paginated, ProductAssignmentFilter, ProductBranchAssignments } from "../types";

export interface ProductQuery {
  search?: string;
  category?: string;
  status?: string;
  // Phase 2: which assignment state to list for the selected branch.
  assignment?: ProductAssignmentFilter;
  // Stage 3.4: list ANOTHER branch's catalog (Central Admin only; backend
  // validates it). Omitted = the Global Shop Selector's branch, as before.
  shopId?: string;
  page?: number;
  pageSize?: number;
}

// NOTE for backend integration: expects GET /admin/products with query params
// { search, category, status, page, pageSize } -> Paginated<Product>
export async function fetchProducts(query: ProductQuery): Promise<Paginated<Product>> {
  if (USE_MOCK) {
    let items = [...store.products];
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s));
    }
    if (query.category && query.category !== "all") items = items.filter((p) => p.category === query.category);
    if (query.status && query.status !== "all") items = items.filter((p) => p.status === query.status);
    // Mock rows have no per-branch assignment: every row counts as assigned.
    if (query.assignment === "unassigned") items = [];
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return delay({ items: items.slice(start, start + pageSize), total: items.length, page, pageSize }, 500);
  }
  const { data } = await apiClient.get<Paginated<Product>>("/admin/products", { params: query });
  return data;
}

// NOTE for backend integration: expects POST /admin/products
export async function createProduct(values: ProductFormValues): Promise<Product> {
  if (USE_MOCK) {
    const now = new Date().toISOString();
    const product: Product = {
      id: genId("p"),
      name: values.name,
      category: values.category,
      sellingPrice: Number(values.sellingPrice),
      costPrice: values.costPrice ? Number(values.costPrice) : undefined,
      stock: Number(values.stock),
      unit: values.unit,
      lowStockThreshold: Number(values.lowStockThreshold),
      status: values.status,
      createdAt: now,
      updatedAt: now,
    };
    store.products = [product, ...store.products];
    return delay(product, 500);
  }
  const { data } = await apiClient.post<Product>("/admin/products", values);
  return data;
}

// NOTE for backend integration: expects PUT /admin/products/:id
export async function updateProduct(id: string, values: ProductFormValues): Promise<Product> {
  if (USE_MOCK) {
    let updated: Product | undefined;
    store.products = store.products.map((p) => {
      if (p.id !== id) return p;
      updated = {
        ...p,
        name: values.name,
        category: values.category,
        sellingPrice: Number(values.sellingPrice),
        costPrice: values.costPrice ? Number(values.costPrice) : undefined,
        stock: Number(values.stock),
        unit: values.unit,
        lowStockThreshold: Number(values.lowStockThreshold),
        status: values.status,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) return Promise.reject({ status: 404, message: "Product not found." });
    return delay(updated, 500);
  }
  const { data } = await apiClient.put<Product>(`/admin/products/${id}`, values);
  return data;
}

// NOTE for backend integration: expects PATCH /admin/products/:id/adjust-stock { delta, cashierId }
// cashierId is required — every adjustment targets a specific cashier's
// own inventory, never a shop-wide pool.
export async function adjustProductStock(id: string, delta: number, cashierId?: string): Promise<Product> {
  if (USE_MOCK) {
    let updated: Product | undefined;
    store.products = store.products.map((p) => {
      if (p.id !== id) return p;
      updated = { ...p, stock: Math.max(0, p.stock + delta), updatedAt: new Date().toISOString() };
      return updated;
    });
    if (!updated) return Promise.reject({ status: 404, message: "Product not found." });
    return delay(updated, 400);
  }
  const { data } = await apiClient.patch<Product>(`/admin/products/${id}/adjust-stock`, { delta, cashierId });
  return data;
}

// NOTE for backend integration: expects DELETE /admin/products/:id (soft delete —
// backend should flag inactive rather than remove the row).
export async function softDeleteProduct(id: string): Promise<void> {
  if (USE_MOCK) {
    store.products = store.products.map((p) => (p.id === id ? { ...p, status: "inactive" as const } : p));
    return delay(undefined, 400);
  }
  await apiClient.delete(`/admin/products/${id}`);
}

// MOCK-STORE ONLY. This reads the in-memory demo store, so against the live
// backend it returns demo categories, not real ones. The Products page uses
// fetchProductCategories() below; Inventory still calls this (Stage 3.3).
export function getProductCategories(): string[] {
  return Array.from(new Set(store.products.map((p) => p.category)));
}

// The backend has no categories endpoint, so the real list is derived from
// GET /admin/products. The backend caps pageSize at 200, so this walks every
// page (assignment=all, so unassigned products' categories are included)
// instead of trusting a single page. Bounded so a bad `total` can never loop.
const CATEGORY_PAGE_SIZE = 200;
const CATEGORY_MAX_PAGES = 50;

export async function fetchProductCategories(): Promise<string[]> {
  if (USE_MOCK) return getProductCategories().sort((a, b) => a.localeCompare(b));
  const seen = new Set<string>();
  for (let page = 1; page <= CATEGORY_MAX_PAGES; page++) {
    const res = await fetchProducts({ assignment: "all", page, pageSize: CATEGORY_PAGE_SIZE });
    for (const p of res.items) {
      const c = p.category?.trim();
      if (c) seen.add(c);
    }
    if (res.items.length === 0 || page * CATEGORY_PAGE_SIZE >= res.total) break;
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

// Phase 2 Stage 2.8 — per-branch assignment & price override. Central Admin
// only (enforced by the backend; a 403 is surfaced as a normal error). These
// act on ANY branch and are independent of the Global Shop Selector.
// No mock path: this must never pretend an assignment or price was saved.
function requireLive(): void {
  if (USE_MOCK) throw { status: 501, message: "This requires the live backend — turn off demo mode to use it." };
}

// GET /admin/branch-products/:productId
export async function fetchProductBranchAssignments(productId: string): Promise<ProductBranchAssignments> {
  requireLive();
  const { data } = await apiClient.get<ProductBranchAssignments>(`/admin/branch-products/${productId}`);
  return data;
}

// PUT /admin/branch-products/:productId/:shopId { assigned }
// Unassigning hides the product at that branch; stock and history are kept.
export async function setProductAssignment(productId: string, shopId: string, assigned: boolean): Promise<{ assigned: boolean; changed: boolean }> {
  requireLive();
  const { data } = await apiClient.put(`/admin/branch-products/${productId}/${shopId}`, { assigned });
  return data;
}

// PUT /admin/branch-products/:productId/:shopId/price { priceOverride }
// number sets the override, null clears it (branch inherits the common price).
export async function setBranchPriceOverride(
  productId: string,
  shopId: string,
  priceOverride: number | null
): Promise<{ priceOverride: number | null; effectivePrice: number; changed: boolean }> {
  requireLive();
  const { data } = await apiClient.put(`/admin/branch-products/${productId}/${shopId}/price`, { priceOverride });
  return data;
}

// Stage 3.4 — every product ASSIGNED to one branch, for the purchase form's
// product picker. The receiving branch is chosen explicitly and may differ from
// the Global Shop Selector, so this passes `shopId` (GET /admin/products?shopId=,
// Central Admin only); the backend re-checks each product against the receiving
// branch when the purchase is saved. Walks every page (backend caps pageSize at
// 200), bounded so a bad `total` can never loop. Demo mode returns the demo
// store, exactly as fetchProducts does.
const CATALOG_PAGE_SIZE = 200;
const CATALOG_MAX_PAGES = 50;

export async function fetchBranchCatalog(shopId: string): Promise<Product[]> {
  if (USE_MOCK) return [...store.products];
  const all: Product[] = [];
  for (let page = 1; page <= CATALOG_MAX_PAGES; page++) {
    const res = await fetchProducts({ shopId, assignment: "assigned", page, pageSize: CATALOG_PAGE_SIZE });
    all.push(...res.items);
    if (res.items.length === 0 || page * CATALOG_PAGE_SIZE >= res.total) break;
  }
  return all;
}
