import { apiClient, USE_MOCK } from "./client";
import type { BillCancellationResult } from "../types";

// Phase 2 Stage 2.7/2.8: POST /admin/bills/:id/cancel { reason }
// Central Admin only. Reason is mandatory. The backend restores stock to the
// bill's ORIGINAL branch exactly once, reverses any credit transactionally,
// and keeps the bill (it is never deleted). Safe to retry: a second cancel is
// rejected, never applied twice. There is no mock path on purpose — a
// cancellation must never be simulated on the frontend.
export async function cancelBill(billId: string, reason: string): Promise<BillCancellationResult> {
  if (USE_MOCK) throw { status: 501, message: "Cancelling a bill requires the live backend — turn off demo mode to use it." };
  const { data } = await apiClient.post<BillCancellationResult>(`/admin/bills/${billId}/cancel`, { reason });
  return data;
}
