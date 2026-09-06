import { apiClient, USE_MOCK } from "./client";
import { delay, store, genId } from "./mockStore";
import type { Product, ProductFormValues, Paginated } from "../types";

export interface ProductQuery {
  search?: string;
  category?: string;
  status?: string;
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

// NOTE for backend integration: expects PATCH /admin/products/:id/adjust-stock { delta, reason }
export async function adjustProductStock(id: string, delta: number): Promise<Product> {
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
  const { data } = await apiClient.patch<Product>(`/admin/products/${id}/adjust-stock`, { delta });
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

export function getProductCategories(): string[] {
  return Array.from(new Set(store.products.map((p) => p.category)));
}
