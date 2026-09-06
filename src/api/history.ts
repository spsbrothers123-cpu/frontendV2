import { apiClient, USE_MOCK } from "./client";
import { delay, store } from "./mockStore";
import type { Paginated, HistoryRecord, HistoryType, SaleDetails, PurchaseDetails, PaymentDetails } from "../types";

export interface HistoryQuery {
  search?: string;
  type?: HistoryType | "all";
  paymentMethod?: string;
  page?: number;
  pageSize?: number;
}

function buildHistoryFeed(): HistoryRecord[] {
  const sales: HistoryRecord[] = store.transactions.map((t) => ({
    id: `sale-${t.id}`,
    time: t.time,
    type: "Sale",
    reference: t.billNumber,
    party: t.customerName,
    amount: t.amount,
    paymentMethod: t.paymentMethod,
    createdBy: "Admin",
  }));
  const purchases: HistoryRecord[] = store.purchases.map((p) => ({
    id: `purchase-${p.id}`,
    time: `${p.purchaseDate}T00:00:00`,
    type: "Purchase",
    reference: p.invoiceNumber,
    party: p.supplierName,
    amount: p.grandTotal,
    paymentMethod: "—",
    createdBy: "Admin",
  }));
  const payments: HistoryRecord[] = [
    { id: "payment-pay1", time: "2026-08-10T00:00:00", type: "Payment", reference: "PAY-1000", party: "Arjun", amount: 1000, paymentMethod: "Cash", createdBy: "Admin" },
  ];
  return [...sales, ...purchases, ...payments].sort((a, b) => b.time.localeCompare(a.time));
}

// NOTE for backend integration: expects GET /admin/history with query
// { search, type, paymentMethod, dateFrom, dateTo, customer, cashier, page, pageSize }
export async function fetchHistory(query: HistoryQuery): Promise<Paginated<HistoryRecord>> {
  if (USE_MOCK) {
    let items = buildHistoryFeed();
    if (query.type && query.type !== "all") items = items.filter((h) => h.type === query.type);
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter((h) => h.reference.toLowerCase().includes(s) || h.party.toLowerCase().includes(s));
    }
    if (query.paymentMethod && query.paymentMethod !== "all") items = items.filter((h) => h.paymentMethod === query.paymentMethod);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return delay({ items: items.slice(start, start + pageSize), total: items.length, page, pageSize }, 500);
  }
  const { data } = await apiClient.get<Paginated<HistoryRecord>>("/admin/history", { params: query });
  return data;
}

// NOTE for backend integration: expects GET /admin/history/sales/:id
export async function fetchSaleDetails(reference: string): Promise<SaleDetails> {
  if (USE_MOCK) {
    const t = store.transactions.find((x) => x.billNumber === reference);
    return delay(
      {
        billNumber: reference,
        date: t?.time ?? new Date().toISOString(),
        customerName: t?.customerName ?? "Walk-in Customer",
        items: [
          { name: "White Eggs (Tray)", quantity: 4, price: 165 },
          { name: "Egg Carton (30pc)", quantity: 2, price: 45 },
        ],
        paymentMethod: t?.paymentMethod ?? "Cash",
        total: t?.amount ?? 0,
        createdBy: "Admin",
      },
      400
    );
  }
  const { data } = await apiClient.get<SaleDetails>(`/admin/history/sales/${reference}`);
  return data;
}

// NOTE for backend integration: expects GET /admin/history/purchases/:id
export async function fetchPurchaseDetails(reference: string): Promise<PurchaseDetails> {
  if (USE_MOCK) {
    const p = store.purchases.find((x) => x.invoiceNumber === reference);
    return delay(
      {
        invoiceNumber: reference,
        supplierName: p?.supplierName ?? "Unknown Supplier",
        date: p?.purchaseDate ?? new Date().toISOString(),
        items: (p?.items ?? []).map((i) => ({ name: i.productName, quantity: i.quantity, purchasePrice: i.purchasePrice })),
        total: p?.grandTotal ?? 0,
      },
      400
    );
  }
  const { data } = await apiClient.get<PurchaseDetails>(`/admin/history/purchases/${reference}`);
  return data;
}

// NOTE for backend integration: expects GET /admin/history/payments/:id
export async function fetchPaymentDetails(reference: string): Promise<PaymentDetails> {
  if (USE_MOCK) {
    return delay(
      { customerName: "Arjun", amount: 1000, method: "Cash", reference, date: "2026-08-10T00:00:00", createdBy: "Admin" },
      400
    );
  }
  const { data } = await apiClient.get<PaymentDetails>(`/admin/history/payments/${reference}`);
  return data;
}
