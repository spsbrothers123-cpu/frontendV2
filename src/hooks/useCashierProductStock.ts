import { useEffect, useState } from "react";
import { fetchProductCashierBreakdown } from "../api/inventory";

/**
 * Cashier-level inventory foundation: a specific cashier's CURRENT
 * quantity for a specific product — never Product.stock (the shop-wide
 * total across every cashier). Used to show an accurate "current stock" /
 * "new stock preview" once both a product and a cashier are chosen in an
 * adjustment flow; before that, there's nothing scoped enough to show.
 */
export function useCashierProductStock(productId: string | null | undefined, cashierId: string | null | undefined) {
  const [quantity, setQuantity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!productId || !cashierId) {
      setQuantity(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchProductCashierBreakdown(productId)
      .then((breakdown) => {
        if (cancelled) return;
        const row = breakdown.byCashier.find((c) => c.cashierId === cashierId);
        setQuantity(row?.quantity ?? 0);
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
  }, [productId, cashierId]);

  return { quantity, isLoading };
}
