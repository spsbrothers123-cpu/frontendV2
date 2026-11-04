import type { AdjustmentType } from "../../types";

export const ADJUSTMENT_REASONS = ["Breakage / damage", "Stock count correction", "Expired / spoiled", "Returned by customer", "Other"];
export const OTHER_REASON = "Other";

export interface AdjustmentInput {
  productId: string;
  adjustmentType: AdjustmentType;
  quantity: number | "";
  reason: string;
  notes: string;
  /** This branch's current quantity; null while loading or if it could not be read. */
  currentStock: number | null;
  stockLoading: boolean;
  unit: string;
}

/**
 * Client-side checks that mirror what the backend enforces (and stop obviously
 * invalid requests before they are sent). The backend remains the authority:
 * a passing result here never implies the adjustment will be accepted.
 * Returns the first problem as a user-facing message, or null.
 */
export function validateAdjustment(i: AdjustmentInput): string | null {
  if (!i.productId) return "Choose a product.";
  if (!i.reason.trim()) return "Choose a reason for this adjustment.";
  if (i.reason === OTHER_REASON && !i.notes.trim()) return "Describe the reason in the notes — “Other” needs an explanation.";
  const qty = Number(i.quantity);
  if (i.quantity === "" || !Number.isFinite(qty) || qty <= 0) return "Enter a quantity greater than zero.";
  if (!Number.isInteger(qty)) return "Enter a whole number — stock is counted in whole units.";
  if (i.adjustmentType === "remove") {
    if (i.stockLoading) return "Still loading this branch's current stock — try again in a moment.";
    if (i.currentStock != null && qty > i.currentStock) {
      return `This branch only has ${i.currentStock} ${i.unit}(s) in stock, so ${qty} can't be removed.`;
    }
  }
  return null;
}
