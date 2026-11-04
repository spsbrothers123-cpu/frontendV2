import { useEffect, useState } from "react";
import { fetchProductCashierBreakdown } from "../api/inventory";

/**
 * Current stock of one product AT THE SELECTED BRANCH — never Product.stock
 * (the all-branch aggregate). Used for the "current stock" / over-removal
 * guard in adjustment flows.
 *
 * Reads `branchStock` from GET /admin/inventory/:id/by-cashier. After the
 * BranchInventory cutover that response has no per-cashier rows, so looking
 * a Cashier up in `byCashier` would wrongly report 0 and block every
 * removal. `totalStock` is the fallback for responses without `branchStock`.
 *
 * `_cashierId` is kept only so existing callers keep compiling; stock is
 * branch-owned and the value is not used.
 */
export function useCashierProductStock(productId: string | null | undefined, _cashierId?: string | null) {
  const [quantity, setQuantity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!productId) {
      setQuantity(null);
      return;
    }
    let cancelled = false;
    setQuantity(null);
    setIsLoading(true);
    fetchProductCashierBreakdown(productId)
      .then((breakdown) => {
        if (cancelled) return;
        setQuantity(breakdown.branchStock ?? breakdown.totalStock);
      })
      .catch(() => {
        if (!cancelled) setQuantity(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return { quantity, isLoading };
}
