import type { BillCancellationResult } from "../../types";

/**
 * Stage 3.6 — bill cancellation (Central Admin only). The backend owns the
 * transaction: stock restoration to the bill's original branch, credit
 * reversal and the exactly-once guarantee. Nothing here touches stock or
 * credit; this only validates the reason, words the outcome, and recognises
 * the "already done" refusals so a double click never looks like a failure.
 */

/** Mirrors the backend rule: trimmed, 3–500 characters. */
export function validateCancelReason(reason: string): string | null {
  const t = reason.trim();
  if (t.length < 3) return "A reason is required (at least 3 characters).";
  if (t.length > 500) return "Keep the reason under 500 characters.";
  return null;
}

/** The bill already left the "paid" state — reload it instead of showing a failure. */
export function isAlreadyCancelled(err: unknown): boolean {
  const code = (err as { code?: string } | null | undefined)?.code;
  return code === "BILL_ALREADY_CANCELLED" || code === "BILL_NOT_CANCELLABLE";
}

export function cancelBillError(err: unknown, fallback = "Couldn't cancel the bill."): string {
  const e = err as { status?: number | null; code?: string; message?: string } | null | undefined;
  // The backend's own 403 wording already says who may cancel; keep it when present.
  if (e?.status === 403) return e.message || "You don't have permission to cancel bills. Only the central administrator can.";
  if (e?.code === "BILL_NOT_FOUND") return "This bill could not be found.";
  // The backend message explains what to resolve (customer already paid down the credit).
  if (e?.code === "CREDIT_REVERSAL_EXCEEDS_BALANCE") {
    return e.message || "The customer has already paid down part of this credit, so it can't be reversed automatically.";
  }
  return e?.message || fallback;
}

export function creditReversalLabel(r: Pick<BillCancellationResult, "creditReversed">): string {
  return r.creditReversed > 0
    ? `Credit reversed: ₹${r.creditReversed.toLocaleString("en-IN")}`
    : "No credit to reverse";
}

export function cancelSuccessMessage(r: BillCancellationResult): string {
  const stock = r.stockRestored > 0 ? "Stock restored to its branch." : "";
  const credit = r.creditReversed > 0 ? ` Credit reversed: ₹${r.creditReversed.toLocaleString("en-IN")}.` : "";
  return `Bill ${r.billNumber} cancelled. ${stock}${credit}`.trim();
}

/** Payment methods that may include a credit charge (the backend doesn't return the reversal on reads). */
export function mayHaveCredit(paymentMethod: string): boolean {
  return /credit|split/i.test(paymentMethod);
}
