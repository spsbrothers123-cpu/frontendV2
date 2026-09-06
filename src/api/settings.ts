import { apiClient, USE_MOCK } from "./client";
import { delay, store } from "./mockStore";
import type { ShopSettings, TaxBillingSettings, AppearanceSettings, PosSettings, SecuritySettings } from "../types";

// NOTE for backend integration: expects GET /admin/settings/shop, PUT to save
export async function fetchShopSettings(): Promise<ShopSettings> {
  if (USE_MOCK) return delay(store.shopSettings, 400);
  const { data } = await apiClient.get<ShopSettings>("/admin/settings/shop");
  return data;
}
export async function saveShopSettings(values: ShopSettings): Promise<ShopSettings> {
  if (USE_MOCK) {
    store.shopSettings = values;
    return delay(values, 450);
  }
  const { data } = await apiClient.put<ShopSettings>("/admin/settings/shop", values);
  return data;
}

// NOTE for backend integration: expects GET/PUT /admin/settings/tax-billing
export async function fetchTaxSettings(): Promise<TaxBillingSettings> {
  if (USE_MOCK) return delay(store.taxSettings, 400);
  const { data } = await apiClient.get<TaxBillingSettings>("/admin/settings/tax-billing");
  return data;
}
export async function saveTaxSettings(values: TaxBillingSettings): Promise<TaxBillingSettings> {
  if (USE_MOCK) {
    store.taxSettings = values;
    return delay(values, 450);
  }
  const { data } = await apiClient.put<TaxBillingSettings>("/admin/settings/tax-billing", values);
  return data;
}

// NOTE for backend integration: expects GET/PUT /admin/settings/appearance
export async function fetchAppearanceSettings(): Promise<AppearanceSettings> {
  if (USE_MOCK) return delay(store.appearanceSettings, 350);
  const { data } = await apiClient.get<AppearanceSettings>("/admin/settings/appearance");
  return data;
}
export async function saveAppearanceSettings(values: AppearanceSettings): Promise<AppearanceSettings> {
  if (USE_MOCK) {
    store.appearanceSettings = values;
    return delay(values, 350);
  }
  const { data } = await apiClient.put<AppearanceSettings>("/admin/settings/appearance", values);
  return data;
}

// NOTE for backend integration: expects GET/PUT /admin/settings/pos
export async function fetchPosSettings(): Promise<PosSettings> {
  if (USE_MOCK) return delay(store.posSettings, 400);
  const { data } = await apiClient.get<PosSettings>("/admin/settings/pos");
  return data;
}
export async function savePosSettings(values: PosSettings): Promise<PosSettings> {
  if (USE_MOCK) {
    store.posSettings = values;
    return delay(values, 450);
  }
  const { data } = await apiClient.put<PosSettings>("/admin/settings/pos", values);
  return data;
}

// NOTE for backend integration: expects GET/PUT /admin/settings/security
export async function fetchSecuritySettings(): Promise<SecuritySettings> {
  if (USE_MOCK) return delay(store.securitySettings, 400);
  const { data } = await apiClient.get<SecuritySettings>("/admin/settings/security");
  return data;
}
export async function saveSecuritySettings(values: SecuritySettings): Promise<SecuritySettings> {
  if (USE_MOCK) {
    store.securitySettings = values;
    return delay(values, 450);
  }
  const { data } = await apiClient.put<SecuritySettings>("/admin/settings/security", values);
  return data;
}
