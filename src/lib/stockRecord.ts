import type { Product } from "../types";

/**
 * Stage 3.3 — a quantity of 0 can mean two different things at a branch:
 *   "zero"  a BranchInventory row exists and holds 0 (a genuine zero);
 *   "none"  no row exists: the product has never been stocked, counted,
 *           purchased or sold here.
 * Only the backend knows which (`inventoryRecorded`); this never guesses from
 * the quantity. `stocked` and `unknown` need no special wording.
 *
 * A missing row with a non-zero quantity cannot occur once BranchInventory is
 * authoritative; it only appears before the cutover (stock then comes from
 * CashierInventory), where "no record" would be misleading — so it is "stocked".
 */
export type StockRecordState = "stocked" | "zero" | "none" | "unknown";

export function getStockRecordState(p: Pick<Product, "stock" | "inventoryRecorded">, stock: number = p.stock): StockRecordState {
  if (p.inventoryRecorded === undefined) return "unknown"; // older backend / mock data
  if (stock > 0) return "stocked";
  return p.inventoryRecorded ? "zero" : "none";
}

export const NO_RECORD_HINT = "No inventory record yet — one is created by the first purchase, sale or stock adjustment at this branch.";
