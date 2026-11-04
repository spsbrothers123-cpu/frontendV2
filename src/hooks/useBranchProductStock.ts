import { useEffect, useState } from "react";
import { fetchBranchStock } from "../api/inventory";

export interface BranchProductStock {
  /** The selected branch's quantity; null while loading or if it could not be read. */
  quantity: number | null;
  /** false = the branch has no inventory record (not the same as a genuine 0); undefined = unknown. */
  inventoryRecorded: boolean | undefined;
  isLoading: boolean;
  /** true when the read failed — `quantity` is then unknown, NOT zero. */
  failed: boolean;
}

/**
 * Current stock of one product AT THE SELECTED BRANCH — never Product.stock
 * (the all-branch aggregate) and never anything derived from CashierInventory.
 * Used for the "current stock" / over-removal guard in adjustment flows.
 *
 * Reads `branchStock` from GET /admin/inventory/:id/by-cashier. `totalStock`
 * (also the branch total) is the fallback for responses without `branchStock`.
 */
export function useBranchProductStock(productId: string | null | undefined): BranchProductStock {
  const [state, setState] = useState<BranchProductStock>({ quantity: null, inventoryRecorded: undefined, isLoading: false, failed: false });

  useEffect(() => {
    if (!productId) {
      setState({ quantity: null, inventoryRecorded: undefined, isLoading: false, failed: false });
      return;
    }
    let cancelled = false;
    setState({ quantity: null, inventoryRecorded: undefined, isLoading: true, failed: false });
    fetchBranchStock(productId)
      .then((b) => {
        if (cancelled) return;
        setState({ quantity: b.branchStock ?? b.totalStock, inventoryRecorded: b.inventoryRecorded, isLoading: false, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ quantity: null, inventoryRecorded: undefined, isLoading: false, failed: true });
      });
    return () => { cancelled = true; };
  }, [productId]);

  return state;
}
