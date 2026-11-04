import type { Product } from "../../types";

export type ProductStateLabel = "Active" | "Inactive" | "Unassigned" | "Zero stock";

/**
 * Stage 3.1 — the three conditions an admin must be able to tell apart:
 *   Inactive    catalog-wide flag (hidden from billing at EVERY branch);
 *   Unassigned  hidden at the SELECTED branch only (stock/history preserved);
 *   Zero stock  the selected branch holds none (independent of the other two).
 * "Active" only appears when neither Inactive nor Unassigned applies.
 *
 * `assigned` is optional on Product (create/update responses omit it), so only
 * an explicit `false` counts as unassigned.
 */
export function getProductStates(p: Pick<Product, "status" | "assigned" | "stock">): ProductStateLabel[] {
  const states: ProductStateLabel[] = [];
  if (p.status === "inactive") states.push("Inactive");
  if (p.assigned === false) states.push("Unassigned");
  if (states.length === 0) states.push("Active");
  if (p.stock === 0) states.push("Zero stock");
  return states;
}
