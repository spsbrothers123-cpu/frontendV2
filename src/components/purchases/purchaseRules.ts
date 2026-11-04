// Stage 3.4 — small pure rules shared by the purchase form, its modals and the tests.

/** Backend (reverseSchema): reason is trimmed, min 3, max 500 characters. */
export const REVERSAL_REASON_MIN = 3;
export const REVERSAL_REASON_MAX = 500;

export function validateReversalReason(raw: string): string | null {
  const reason = raw.trim();
  if (reason.length < REVERSAL_REASON_MIN) return `Enter a reason of at least ${REVERSAL_REASON_MIN} characters.`;
  if (reason.length > REVERSAL_REASON_MAX) return `Keep the reason under ${REVERSAL_REASON_MAX} characters.`;
  return null;
}

/**
 * PurchaseItem.quantity is a whole number in the database, but the backend
 * route accepts any positive number, so a fraction would fail with a server
 * error instead of a clear message. The form therefore only allows whole,
 * positive quantities.
 */
export function quantityError(value: number | ""): string | null {
  if (value === "" || !Number.isFinite(Number(value)) || Number(value) <= 0) return "Required";
  if (!Number.isInteger(Number(value))) return "Whole numbers only";
  return null;
}

interface LineLike { mode: "catalog" | "one-time"; productId: string; productName: string }

/** Catalog lines that already point at a product — the ones a branch change would discard. */
export function catalogLinesAtRisk<T extends LineLike>(items: T[]): T[] {
  return items.filter((it) => it.mode === "catalog" && !!it.productId);
}
