import { apiClient, USE_MOCK } from "./client";
import { delay, store } from "./mockStore";
import type { Shop } from "../types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

// NOTE for backend integration: expects GET /admin/shops -> { success, data: Shop[] }.
// This IS the source of truth for the shop list — every shop this admin
// is authorized for, straight from the database (AdminShopLink). Never
// hardcode a shop list; if this call fails, the Shop Selector shows
// nothing rather than falling back to fabricated data.
export async function fetchShops(): Promise<Shop[]> {
  if (USE_MOCK) return delay([...store.shops], 350);
  const { data } = await apiClient.get<ApiEnvelope<Shop[]>>("/admin/shops");
  return data.data;
}

// NOTE for backend integration: expects POST /admin/shops/switch { shopId }
// -> { success, data: Shop }. The backend re-checks that this admin
// actually owns shopId (AdminShopLink) before switching — the frontend
// selector is a convenience, not the authorization boundary.
export async function switchShop(shopId: string): Promise<Shop> {
  if (USE_MOCK) {
    const match = store.shops.find((s) => s.id === shopId);
    if (!match) {
      return Promise.reject({ status: 403, message: "You don't have access to that shop." });
    }
    store.shops = store.shops.map((s) => ({ ...s, current: s.id === shopId }));
    return delay({ ...match, current: true }, 300);
  }
  const { data } = await apiClient.post<ApiEnvelope<Shop>>("/admin/shops/switch", { shopId });
  return data.data;
}
