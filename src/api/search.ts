import { apiClient, USE_MOCK } from "./client";
import { delay, store } from "./mockStore";
import type { GlobalSearchResults } from "../types";

// NOTE for backend integration: expects GET /admin/search?q=
// Returns grouped, backend-searched entities. This must never be
// simulated as a client-side fuzzy filter once wired to a real API —
// the "global search" scope only exists for entities the backend indexes.
export async function globalSearch(query: string): Promise<GlobalSearchResults> {
  const empty: GlobalSearchResults = { products: [], customers: [], transactions: [] };
  if (!query.trim()) return empty;

  if (USE_MOCK) {
    const q = query.toLowerCase();
    const products = store.products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({ id: p.id, label: p.name, subtitle: p.category, path: "/admin/products" }));
    const customers = store.customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 5)
      .map((c) => ({ id: c.id, label: c.name, subtitle: c.phone, path: "/admin/customers" }));
    const transactions = store.transactions
      .filter((t) => t.billNumber.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({ id: t.id, label: t.billNumber, subtitle: t.customerName, path: "/admin/history" }));
    return delay({ products, customers, transactions }, 350);
  }
  const { data } = await apiClient.get<GlobalSearchResults>("/admin/search", { params: { q: query } });
  return data;
}
