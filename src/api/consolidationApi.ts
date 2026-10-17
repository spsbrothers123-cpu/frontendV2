import { apiClient } from "./client";
import { downloadBlob, extensionForFormat } from "../lib/download";
import type {
  ConsolidationQuery,
  ConsolidationSection,
  ConsolidationShop,
  ConsolidationExportFormat,
  ConsolidationExportScope,
  OverviewData,
  SalesData,
  ProductsData,
  CustomersData,
  PurchasesData,
  ExpensesData,
  LowStockData,
} from "../types/consolidation";

// Dedicated Consolidation API service.
//
// Deliberate differences from the other api/* modules:
//   • No USE_MOCK branch and no import of mockStore — Consolidation never
//     serves mock data, not even when VITE_USE_MOCK is unset.
//   • Every call carries an EXPLICIT `shop` param. The rest of the admin API
//     is scoped by the server-side "active shop"; Consolidation must never
//     depend on it, and must never call POST /admin/shops/switch.
//
// See CONSOLIDATION_API_CONTRACT.md for the endpoints this expects.

const BASE = "/admin/consolidation";

interface Envelope<T> {
  success?: boolean;
  data: T;
  message?: string;
}

function unwrap<T>(body: Envelope<T> | T): T {
  if (body && typeof body === "object" && "success" in (body as object) && "data" in (body as object)) {
    return (body as Envelope<T>).data;
  }
  return body as T;
}

function baseParams(q: ConsolidationQuery) {
  return { shop: q.shop, range: q.range, dateFrom: q.dateFrom, dateTo: q.dateTo };
}

// Read-only: lists the shops this admin is authorized for. Calls the endpoint
// directly (not api/shops.ts) so the mock branch can never apply, and so the
// `current` flag — the global selection — is never read.
export async function fetchAuthorizedShops(signal?: AbortSignal): Promise<ConsolidationShop[]> {
  const res = await apiClient.get<Envelope<{ id: string; name: string }[]>>("/admin/shops", { signal });
  return unwrap(res.data).map((s) => ({ id: s.id, name: s.name }));
}

export async function fetchOverview(q: ConsolidationQuery, signal?: AbortSignal): Promise<OverviewData> {
  const res = await apiClient.get(`${BASE}/overview`, { params: baseParams(q), signal });
  return unwrap<OverviewData>(res.data);
}

// Backs both the "Shops" and "Sales" tabs.
export async function fetchSales(q: ConsolidationQuery, signal?: AbortSignal): Promise<SalesData> {
  const res = await apiClient.get(`${BASE}/sales`, { params: baseParams(q), signal });
  return unwrap<SalesData>(res.data);
}

// Stock is live inventory: the date range is intentionally NOT sent.
export async function fetchProducts(
  q: ConsolidationQuery,
  page: number,
  pageSize: number,
  search: string,
  signal?: AbortSignal
): Promise<ProductsData> {
  const res = await apiClient.get(`${BASE}/products`, {
    params: { shop: q.shop, page, pageSize, ...(search ? { search } : {}) },
    signal,
  });
  return unwrap<ProductsData>(res.data);
}

export async function fetchCustomers(
  q: ConsolidationQuery,
  page: number,
  pageSize: number,
  search: string,
  signal?: AbortSignal
): Promise<CustomersData> {
  const res = await apiClient.get(`${BASE}/customers`, {
    params: { ...baseParams(q), page, pageSize, ...(search ? { search } : {}) },
    signal,
  });
  return unwrap<CustomersData>(res.data);
}

export async function fetchPurchases(q: ConsolidationQuery, signal?: AbortSignal): Promise<PurchasesData> {
  const res = await apiClient.get(`${BASE}/purchases`, { params: baseParams(q), signal });
  return unwrap<PurchasesData>(res.data);
}

export async function fetchExpenses(q: ConsolidationQuery, signal?: AbortSignal): Promise<ExpensesData> {
  const res = await apiClient.get(`${BASE}/expenses`, { params: baseParams(q), signal });
  return unwrap<ExpensesData>(res.data);
}

// Live inventory again: no dates.
export async function fetchLowStock(
  q: ConsolidationQuery,
  page: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<LowStockData> {
  const res = await apiClient.get(`${BASE}/low-stock`, {
    params: { shop: q.shop, page, pageSize },
    signal,
  });
  return unwrap<LowStockData>(res.data);
}

// ── Export ─────────────────────────────────────────────
// Downloads the real, backend-generated file for the FULL filtered dataset
// (not just the rows on screen). Never builds a file client-side.
//
// Uses `validateStatus: () => true` so that on failure we still receive the
// JSON error body (with responseType "blob" the shared interceptor would
// only see an unreadable Blob and show a generic message).
export async function exportConsolidation(
  scope: ConsolidationExportScope,
  section: ConsolidationSection,
  format: ConsolidationExportFormat,
  q: ConsolidationQuery
): Promise<void> {
  const res = await apiClient.get<Blob>(`${BASE}/export`, {
    params: { scope, ...(scope === "section" ? { section } : {}), format, ...baseParams(q) },
    responseType: "blob",
    validateStatus: () => true,
  });

  if (res.status < 200 || res.status >= 300) {
    if (res.status === 401) {
      // validateStatus bypassed the interceptor's 401 handling; one cheap
      // call re-triggers the app's normal "session expired" flow.
      apiClient.get("/admin/shops").catch(() => undefined);
    }
    throw { status: res.status, message: await readBlobError(res.data, res.status) };
  }

  const blob = res.data;
  const type = (blob.type || "").toLowerCase();
  if (blob.size === 0 || type.includes("application/json") || type.includes("text/html")) {
    throw { status: res.status, message: "The server did not return a valid file. Please try again." };
  }

  const name = scope === "full" ? "consolidation-report" : `consolidation-${section}`;
  downloadBlob(blob, res.headers as Record<string, unknown>, `${name}.${extensionForFormat(format)}`);
}

async function readBlobError(blob: Blob, status: number): Promise<string> {
  try {
    const parsed = JSON.parse(await blob.text());
    if (parsed?.message && typeof parsed.message === "string") return parsed.message;
  } catch {
    /* fall through to status text */
  }
  if (status === 404) return "The export endpoint isn't available on the server yet.";
  if (status === 403) return "You don't have permission to export this data.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return "Export failed. Please try again.";
}
