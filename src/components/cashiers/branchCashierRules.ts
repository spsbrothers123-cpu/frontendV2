import type { CashierAccount } from "../../types";

/**
 * Stage 3.5 — one Cashier per branch. The backend is the authority (it holds a
 * per-branch lock and answers 409 BRANCH_HAS_CASHIER); this only lets the
 * Admin see the conflict before clicking, and words the backend's refusals.
 * Cashiers are always compared by THEIR OWN branch, never the Global Shop
 * Selector's current branch — the Cashiers page is independent of it.
 */

/** The active Cashier already holding `shopId`, ignoring `excludeId`. */
export function activeCashierAtBranch(
  cashiers: CashierAccount[],
  shopId: string | null | undefined,
  excludeId?: string
): CashierAccount | null {
  if (!shopId) return null;
  return cashiers.find((c) => c.active && c.shop?.id === shopId && c.id !== excludeId) ?? null;
}

export function branchCashierError(err: unknown, fallback: string): string {
  const e = err as { status?: number | null; code?: string; message?: string } | null | undefined;
  if (e?.code === "BRANCH_HAS_CASHIER") {
    return "This branch already has a cashier. Suspend the current cashier first to replace them.";
  }
  if (e?.code === "REPLACEMENT_REQUIRES_BRANCH_INVENTORY") {
    return "This branch's stock is still assigned to its previous cashier. Complete the branch inventory cutover before replacing a cashier.";
  }
  if (e?.code === "REQUEST_NOT_PENDING") return "This request is no longer awaiting approval. Refresh to see its current state.";
  if (e?.code === "CASHIER_NOT_FOUND" || e?.code === "REQUEST_NOT_FOUND") return "This cashier is no longer available. Refresh the list.";
  if (e?.status === 403) return "You don't have permission to manage cashiers.";
  return e?.message || fallback;
}
