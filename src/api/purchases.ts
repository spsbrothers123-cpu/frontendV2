import { apiClient, USE_MOCK } from "./client";
import { delay, store, genId } from "./mockStore";
import { downloadBlob, extensionForFormat } from "../lib/download";
import type { Purchase, PurchaseFormValues, Paginated, ExportFormat } from "../types";

export interface PurchaseQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

// NOTE for backend integration: expects GET /admin/purchases
export async function fetchPurchases(query: PurchaseQuery): Promise<Paginated<Purchase>> {
  if (USE_MOCK) {
    let items = [...store.purchases];
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter((p) => p.supplierName.toLowerCase().includes(s) || p.invoiceNumber.toLowerCase().includes(s));
    }
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return delay({ items: items.slice(start, start + pageSize), total: items.length, page, pageSize }, 500);
  }
  const { data } = await apiClient.get<Paginated<Purchase>>("/admin/purchases", { params: query });
  return data;
}

// NOTE for backend integration: expects POST /admin/purchases
// { supplierName, invoiceNumber, purchaseDate, items: [{ productId, quantity, unit, purchasePrice }] }
// Backend is expected to compute totals and update product stock server-side.
export async function createPurchase(values: PurchaseFormValues): Promise<Purchase> {
  if (USE_MOCK) {
    const items = values.items.map((it) => ({
      id: genId("li"),
      ...it,
      productId: it.productId ?? null,
      inCatalog: !!it.productId,
      total: it.quantity * it.purchasePrice,
    }));
    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const purchase: Purchase = {
      id: genId("pu"),
      invoiceNumber: values.invoiceNumber,
      supplierName: values.supplierName,
      purchaseDate: values.purchaseDate,
      items,
      subtotal,
      tax: 0,
      grandTotal: subtotal,
      status: "Received",
    };
    store.purchases = [purchase, ...store.purchases];
    // mirror stock increase, matching what the real backend would do
    store.products = store.products.map((p) => {
      const match = items.find((it) => it.productId === p.id);
      return match ? { ...p, stock: p.stock + match.quantity } : p;
    });
    return delay(purchase, 550);
  }
  const { data } = await apiClient.post<Purchase>("/admin/purchases", values);
  return data;
}

export function getSupplierSuggestions(): string[] {
  return Array.from(new Set(store.purchases.map((p) => p.supplierName)));
}

// NOTE for backend integration: expects GET /admin/purchases/export (format=excel|csv)
// Downloads real backend-generated data — never fabricates a file client-side.
export async function exportPurchases(query: Omit<PurchaseQuery, "page" | "pageSize">, format: ExportFormat = "excel"): Promise<void> {
  if (USE_MOCK) {
    throw { status: 501, message: "Export requires the live backend — turn off demo mode to use it." };
  }
  const response = await apiClient.get("/admin/purchases/export", {
    params: { ...query, format },
    responseType: "blob",
  });
  downloadBlob(response.data, response.headers, `Purchases.${extensionForFormat(format)}`);
}
