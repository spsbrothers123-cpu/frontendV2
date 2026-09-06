import { apiClient, USE_MOCK } from "./client";
import { delay, store, getSessionActivity } from "./mockStore";
import type { ActiveSession, Paginated, SessionHistoryItem, SessionDetails } from "../types";

// NOTE for backend integration: expects GET /admin/sessions/active
// Returns an array since more than one register/cashier may be open at once.
export async function fetchActiveSessions(): Promise<ActiveSession[]> {
  if (USE_MOCK) {
    const active: ActiveSession = {
      id: "ses-active-1",
      cashier: "Meena",
      shop: "Main Shop",
      openingTime: "2026-08-27T08:00:00",
      openingCash: 2000,
      sales: 14250,
      cashSales: 8100,
      upiSales: 4200,
      cardSales: 900,
      creditSales: 1050,
      expectedClosingCash: 10100,
      actualClosingCash: null,
      cashDifference: null,
      status: "Open",
    };
    return delay([active], 450);
  }
  const { data } = await apiClient.get<ActiveSession[]>("/admin/sessions/active");
  return data;
}

export interface SessionHistoryQuery {
  cashier?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

// NOTE for backend integration: expects GET /admin/sessions/history
export async function fetchSessionHistory(query: SessionHistoryQuery): Promise<Paginated<SessionHistoryItem>> {
  if (USE_MOCK) {
    let items = [...store.sessionHistory];
    if (query.cashier && query.cashier !== "all") items = items.filter((s) => s.cashier === query.cashier);
    if (query.status && query.status !== "all") items = items.filter((s) => s.status === query.status);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return delay({ items: items.slice(start, start + pageSize), total: items.length, page, pageSize }, 500);
  }
  const { data } = await apiClient.get<Paginated<SessionHistoryItem>>("/admin/sessions/history", { params: query });
  return data;
}

// NOTE for backend integration: expects GET /admin/sessions/:id
export async function fetchSessionDetails(id: string): Promise<SessionDetails> {
  if (USE_MOCK) {
    const base = store.sessionHistory.find((s) => s.id === id);
    if (!base) return Promise.reject({ status: 404, message: "Session not found." });
    const details: SessionDetails = {
      ...base,
      cashSales: Math.round(base.sales * 0.55),
      upiSales: Math.round(base.sales * 0.28),
      cardSales: Math.round(base.sales * 0.09),
      creditSales: Math.round(base.sales * 0.08),
      expectedClosingCash: base.openingCash + Math.round(base.sales * 0.55) - base.cashDifference,
      activity: getSessionActivity(id),
    };
    return delay(details, 450);
  }
  const { data } = await apiClient.get<SessionDetails>(`/admin/sessions/${id}`);
  return data;
}
