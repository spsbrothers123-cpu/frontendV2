import { apiClient, USE_MOCK } from "./client";
import { delay, store, getCreditBills, getCreditTimeline } from "./mockStore";
import type {
  Paginated,
  CreditSummary,
  CustomerCredit,
  CreditBillItem,
  CreditTimelineEvent,
  PaymentCollectionFormValues,
  Customer,
} from "../types";

// NOTE for backend integration: expects GET /admin/credits/summary
export async function fetchCreditSummary(): Promise<CreditSummary> {
  if (USE_MOCK) {
    const withCredit = store.customers.filter((c) => c.creditBalance > 0);
    const totalCredit = withCredit.reduce((s, c) => s + c.creditBalance, 0) + 4250; // includes already-collected history
    const pending = withCredit.reduce((s, c) => s + c.creditBalance, 0);
    return delay({ totalCredit, collected: totalCredit - pending, pending }, 450);
  }
  const { data } = await apiClient.get<CreditSummary>("/admin/credits/summary");
  return data;
}

function toCustomerCredit(c: Customer): CustomerCredit {
  const bills = getCreditBills(c.id);
  const paid = bills.reduce((s, b) => s + b.paidAmount, 0);
  const totalCredit = bills.reduce((s, b) => s + b.amount, 0) || c.creditBalance;
  const lastPaymentEvent = getCreditTimeline(c.id).filter((e) => e.type === "payment" || e.type === "partial_payment").slice(-1)[0];
  return {
    customerId: c.id,
    customerName: c.name,
    totalCredit: totalCredit || c.creditBalance,
    paid,
    pending: c.creditBalance,
    lastPayment: lastPaymentEvent?.date ?? null,
  };
}

// NOTE for backend integration: expects GET /admin/credits with query
// { search, page, pageSize } -> Paginated<CustomerCredit>
export async function fetchCustomerCredits(query: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<CustomerCredit>> {
  if (USE_MOCK) {
    let items = store.customers.filter((c) => c.creditBalance > 0).map(toCustomerCredit);
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter((c) => c.customerName.toLowerCase().includes(s));
    }
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return delay({ items: items.slice(start, start + pageSize), total: items.length, page, pageSize }, 500);
  }
  const { data } = await apiClient.get<Paginated<CustomerCredit>>("/admin/credits", { params: query });
  return data;
}

// NOTE for backend integration: expects GET /admin/credits/:customerId/bills
export async function fetchCreditBills(customerId: string): Promise<CreditBillItem[]> {
  if (USE_MOCK) return delay(getCreditBills(customerId), 400);
  const { data } = await apiClient.get<CreditBillItem[]>(`/admin/credits/${customerId}/bills`);
  return data;
}

// NOTE for backend integration: expects GET /admin/credits/:customerId/timeline
export async function fetchCreditTimeline(customerId: string): Promise<CreditTimelineEvent[]> {
  if (USE_MOCK) return delay(getCreditTimeline(customerId), 400);
  const { data } = await apiClient.get<CreditTimelineEvent[]>(`/admin/credits/${customerId}/timeline`);
  return data;
}

// NOTE for backend integration: expects POST /admin/credits/:customerId/collect-payment
// { amount, method, reference, notes } -> updated CustomerCredit.
// THIS ENDPOINT DOES NOT EXIST ON THE BACKEND YET (see api/customers.ts,
// collectCustomerPayment) — keep this wired for when it's confirmed, but
// never fabricate a success response in the meantime.
export async function collectPayment(
  _customerId: string,
  _values: PaymentCollectionFormValues
): Promise<CustomerCredit> {
  if (USE_MOCK) {
    return Promise.reject({ status: 501, message: "Payment collection isn't connected to the backend yet." });
  }
  const { data } = await apiClient.post<CustomerCredit>(`/admin/credits/${_customerId}/collect-payment`, _values);
  return data;
}
