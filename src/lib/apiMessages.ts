/**
 * Shared wording for backend refusals, so every stage that talks to the
 * Central-Admin-only endpoints (assignments, prices, stock) says the same
 * thing. The backend stays the authority — this only words its answer; no
 * role is inferred on the client.
 */
export function friendlyError(err: unknown, fallback: string): string {
  const e = err as { status?: number | null; code?: string; message?: string } | null | undefined;
  if (e?.status === 403) {
    return "You don't have permission to do this. Only the central administrator can change branch assignments, prices and stock.";
  }
  if (e?.code === "INSUFFICIENT_STOCK") {
    // The backend message names the product and what is available.
    return e.message || "There isn't enough stock at this branch to remove that quantity.";
  }
  if (e?.code === "BRANCH_PRODUCT_NOT_FOUND") {
    return "This product has no price record at that branch yet. Assign it to the branch first, then set the price.";
  }
  if (e?.code === "PRODUCT_NOT_FOUND") {
    return "This product isn't assigned to the selected branch, so its stock can't be changed here.";
  }
  return e?.message || fallback;
}
