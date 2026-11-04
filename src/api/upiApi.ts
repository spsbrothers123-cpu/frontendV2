import { apiClient } from "./client";
import type { BranchUpiValues, CommonUpiValues, UpiOverview } from "../types/upi";

// Dedicated UPI Management API service.
//
// Deliberate differences from most api/* modules (same stance as
// consolidationApi.ts):
//   • No USE_MOCK branch and no mockStore import — this module never serves
//     mock data.
//   • Never reads or writes shop-selection state and never calls
//     POST /admin/shops/switch. The shop is addressed explicitly by id.
//   • Never sends an admin id; the backend scopes everything to the
//     authenticated admin.
//
// ⚠ PROVISIONAL ROUTES: the paths below follow the PROPOSED contract in
// UPI_API_CONTRACT.md and are NOT confirmed to exist in BackendV2. They are
// isolated in UPI_ROUTES so finalizing the contract is a one-place edit.
export const UPI_ROUTES = {
  overview: "/admin/upi/overview",
  common: "/admin/upi/common",
  shop: (shopId: string) => `/admin/upi/shops/${encodeURIComponent(shopId)}`,
} as const;

interface Envelope<T> {
  success?: boolean;
  data: T;
  message?: string;
}

// Some backend routes wrap payloads as { success, data }, others don't.
function unwrap<T>(body: Envelope<T> | T): T {
  if (body && typeof body === "object" && "success" in (body as object) && "data" in (body as object)) {
    return (body as Envelope<T>).data;
  }
  return body as T;
}

// GET overview → { common, branches[] } including each branch's effective receiver.
export async function fetchUpiOverview(signal?: AbortSignal): Promise<UpiOverview> {
  const res = await apiClient.get(UPI_ROUTES.overview, { signal });
  const data = unwrap<Partial<UpiOverview> | null>(res.data);
  if (!data || typeof data !== "object" || !Array.isArray(data.branches)) {
    // Surface a real error rather than rendering guessed/empty data.
    throw { status: null, message: "The server returned an unexpected UPI response." };
  }
  return { common: data.common ?? null, branches: data.branches };
}

// PUT common account (create or update). Callers refetch the overview
// afterwards, so no response shape is assumed here.
export async function saveCommonUpi(values: CommonUpiValues): Promise<void> {
  await apiClient.put(UPI_ROUTES.common, {
    upiId: values.upiId.trim(),
    payeeName: values.payeeName.trim(),
    enabled: values.enabled,
  });
}

// PUT branch configuration (create or update). { mode: "COMMON" } keeps any
// saved custom details dormant on the server.
export async function saveBranchUpi(shopId: string, values: BranchUpiValues): Promise<void> {
  const body =
    values.mode === "COMMON"
      ? { mode: "COMMON" }
      : {
          mode: "CUSTOM",
          upiId: values.upiId.trim(),
          payeeName: values.payeeName.trim(),
          enabled: values.enabled,
        };
  await apiClient.put(UPI_ROUTES.shop(shopId), body);
}
