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

// Phase 2 Stage 2.4/2.8: the ONLY way a branch comes into existence (Cashier
// signup can no longer create one). Central Admin only — enforced by the
// backend. It does not change the admin's currently selected shop.
// NOTE: expects POST /admin/shops { location } -> { success, data: Shop }.
export async function createBranch(location: string): Promise<Shop> {
  if (USE_MOCK) throw { status: 501, message: "Creating a branch requires the live backend — turn off demo mode to use it." };
  const { data } = await apiClient.post<ApiEnvelope<Shop>>("/admin/shops", { location });
  return data.data;
}
