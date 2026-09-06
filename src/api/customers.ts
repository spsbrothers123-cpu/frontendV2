import { apiClient, USE_MOCK } from "./client";
import { delay, store, genId } from "./mockStore";
import { downloadBlob, extensionForFormat } from "../lib/download";
import type {
  Customer,
  CustomerFormValues,
  Paginated,
  CustomerPurchaseHistoryItem,
  CustomerPaymentRecord,
  ExportFormat,
} from "../types";

export interface CustomerQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

// NOTE for backend integration: expects GET /admin/customers
export async function fetchCustomers(query: CustomerQuery): Promise<Paginated<Customer>> {
  if (USE_MOCK) {
    let items = [...store.customers];
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter((c) => c.name.toLowerCase().includes(s) || c.phone.includes(s));
    }
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return delay({ items: items.slice(start, start + pageSize), total: items.length, page, pageSize }, 500);
  }
  const { data } = await apiClient.get<Paginated<Customer>>("/admin/customers", { params: query });
  return data;
}

// NOTE for backend integration: expects POST /admin/customers
export async function createCustomer(values: CustomerFormValues): Promise<Customer> {
  if (USE_MOCK) {
    const customer: Customer = {
      id: genId("c"),
      name: values.name,
      phone: values.phone,
      totalPurchases: 0,
      billCount: 0,
      creditBalance: 0,
      createdAt: new Date().toISOString(),
    };
    store.customers = [customer, ...store.customers];
    return delay(customer, 500);
  }
  const { data } = await apiClient.post<Customer>("/admin/customers", values);
  return data;
}

// NOTE for backend integration: expects PUT /admin/customers/:id
export async function updateCustomer(id: string, values: CustomerFormValues): Promise<Customer> {
  if (USE_MOCK) {
    let updated: Customer | undefined;
    store.customers = store.customers.map((c) => {
      if (c.id !== id) return c;
      updated = { ...c, name: values.name, phone: values.phone };
      return updated;
    });
    if (!updated) return Promise.reject({ status: 404, message: "Customer not found." });
    return delay(updated, 500);
  }
  const { data } = await apiClient.put<Customer>(`/admin/customers/${id}`, values);
  return data;
}

// NOTE for backend integration: expects GET /admin/customers/:id/purchase-history
export async function fetchCustomerPurchaseHistory(id: string): Promise<CustomerPurchaseHistoryItem[]> {
  if (USE_MOCK) {
    const mock: CustomerPurchaseHistoryItem[] = [
      { id: "h1", billNumber: "#1040", date: "2026-08-26", amount: 2450, paymentMethod: "Credit", status: "Pending" },
      { id: "h2", billNumber: "#1012", date: "2026-08-14", amount: 1120, paymentMethod: "Cash", status: "Completed" },
      { id: "h3", billNumber: "#0988", date: "2026-07-30", amount: 3400, paymentMethod: "UPI", status: "Completed" },
    ];
    return delay(mock, 450);
  }
  const { data } = await apiClient.get<CustomerPurchaseHistoryItem[]>(`/admin/customers/${id}/purchase-history`);
  return data;
}

// NOTE for backend integration: expects GET /admin/customers/:id/payments
// This endpoint may not exist yet on the backend — if fetch fails with 404,
// the UI shows "Payment history isn't available yet" rather than fabricating data.
export async function fetchCustomerPayments(id: string): Promise<CustomerPaymentRecord[]> {
  if (USE_MOCK) {
    return delay([
      { id: "pay1", date: "2026-08-10", amount: 1000, method: "Cash", note: "Partial credit settlement" },
    ], 450);
  }
  const { data } = await apiClient.get<CustomerPaymentRecord[]>(`/admin/customers/${id}/payments`);
  return data;
}

// NOTE for backend integration: expects POST /admin/customers/:id/collect-payment
// { amount, method }. THIS ENDPOINT DOES NOT EXIST ON THE BACKEND YET —
// keep the "Collect Payment" action disabled with a "coming soon" tooltip
// until it's confirmed and wired up. Do not fabricate success responses.
export async function collectCustomerPayment(_id: string, _amount: number): Promise<never> {
  throw { status: 501, message: "Payment collection isn't connected to the backend yet." };
}

// NOTE for backend integration: expects GET /admin/customers/export (format=excel|csv)
// Downloads real backend-generated data — never fabricates a file client-side.
export async function exportCustomers(query: Omit<CustomerQuery, "page" | "pageSize">, format: ExportFormat = "excel"): Promise<void> {
  if (USE_MOCK) {
    throw { status: 501, message: "Export requires the live backend — turn off demo mode to use it." };
  }
  const response = await apiClient.get("/admin/customers/export", {
    params: { ...query, format },
    responseType: "blob",
  });
  downloadBlob(response.data, response.headers, `Customers.${extensionForFormat(format)}`);
}
