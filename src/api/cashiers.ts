import { apiClient, USE_MOCK } from "./client";
import { delay, store } from "./mockStore";
import type { CashierRequest, CashierAccount, CashierUpdateValues } from "../types";

// NOTE for backend integration: cashier-requests and cashiers are the two
// Phase-1 (auth/onboarding) endpoint groups. Unlike every other /admin/*
// route added in Phase 2, these two wrap their payload as
// { success, data, message } instead of returning the bare object/array —
// that's a real backend inconsistency, not a typo here. Each call below
// unwraps `.data` to give the rest of the app a consistent shape.
//
// Neither endpoint currently returns `branchName` (see types/index.ts) —
// the UI renders a "—" placeholder until the backend adds it to both
// GET /admin/cashier-requests and GET /admin/cashiers responses.

// ── Cashier signup requests ────────────────────────────────────────────

// expects GET /admin/cashier-requests?status=
export async function fetchCashierRequests(status?: string): Promise<CashierRequest[]> {
  if (USE_MOCK) {
    const all = store.cashierRequests;
    if (!status || status === "ALL") return delay(all, 400);
    return delay(all.filter((r) => r.status === status), 400);
  }
  const { data } = await apiClient.get<{ data: CashierRequest[] }>("/admin/cashier-requests", {
    params: status && status !== "ALL" ? { status } : undefined,
  });
  return data.data;
}

// expects POST /admin/cashier-requests/:id/approve
export async function approveCashierRequest(id: string): Promise<void> {
  if (USE_MOCK) {
    const request = store.cashierRequests.find((r) => r.id === id);
    store.cashierRequests = store.cashierRequests.filter((r) => r.id !== id);
    if (request) {
      store.cashiers = [
        ...store.cashiers,
        { id: request.id, name: request.name, email: request.email, role: "cashier", active: true, shop: request.shop ?? null },
      ];
    }
    return delay(undefined, 400);
  }
  await apiClient.post(`/admin/cashier-requests/${id}/approve`);
}

// expects POST /admin/cashier-requests/:id/reject { reason }
export async function rejectCashierRequest(id: string, reason?: string): Promise<void> {
  if (USE_MOCK) {
    store.cashierRequests = store.cashierRequests.map((r) =>
      r.id === id ? { ...r, status: "REJECTED" as const } : r
    );
    return delay(undefined, 400);
  }
  await apiClient.post(`/admin/cashier-requests/${id}/reject`, { reason });
}

// ── Active/suspended cashiers ───────────────────────────────────────────

// expects GET /admin/cashiers
export async function fetchCashiers(): Promise<CashierAccount[]> {
  if (USE_MOCK) return delay(store.cashiers, 400);
  const { data } = await apiClient.get<{ data: CashierAccount[] }>("/admin/cashiers");
  return data.data;
}

// expects PATCH /admin/cashiers/:id { name?, phone?, email? }
// Never sends or receives password data — profile fields only.
export async function updateCashier(id: string, values: CashierUpdateValues): Promise<CashierAccount> {
  if (USE_MOCK) {
    store.cashiers = store.cashiers.map((c) =>
      c.id === id ? { ...c, name: values.name, email: values.email, phone: values.phone || undefined } : c
    );
    const updated = store.cashiers.find((c) => c.id === id)!;
    return delay(updated, 400);
  }
  const { data } = await apiClient.patch<{ data: CashierAccount }>(`/admin/cashiers/${id}`, {
    name: values.name,
    phone: values.phone,
    email: values.email,
  });
  return data.data;
}

// expects PATCH /admin/cashiers/:id/status { status: "ACTIVE" | "SUSPENDED" }
export async function setCashierStatus(id: string, active: boolean): Promise<CashierAccount> {
  if (USE_MOCK) {
    store.cashiers = store.cashiers.map((c) => (c.id === id ? { ...c, active } : c));
    const updated = store.cashiers.find((c) => c.id === id)!;
    return delay(updated, 350);
  }
  const { data } = await apiClient.patch<{ data: CashierAccount }>(`/admin/cashiers/${id}/status`, {
    status: active ? "ACTIVE" : "SUSPENDED",
  });
  return data.data;
}
