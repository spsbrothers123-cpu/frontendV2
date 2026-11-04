import { useEffect, useState } from "react";
import { fetchCashiers } from "../api/cashiers";
import { useShop } from "../context/ShopContext";
import type { CashierAccount } from "../types";

/**
 * Phase 2 (Stage 2.8.1) — resolves the single Cashier recorded as the
 * actor of a stock-changing Admin action (initial stock, adjustment,
 * purchase intake).
 *
 * Architecture: one Central Admin -> branches -> exactly ONE Cashier per
 * branch. Stock belongs to the branch, so this is actor metadata (and, only
 * before the BranchInventory cutover, the legacy stock owner). The hook never
 * decides anything about stock itself; the backend (resolveStockCashier)
 * stays authoritative and re-verifies the id belongs to the branch.
 *
 * Behaviour, for the target branch (`shopIdOverride`, else the Global Shop
 * Selector's current branch):
 *   - exactly one ACTIVE Cashier  -> `cashierId` is that Cashier's id;
 *   - none                        -> `cashierId` stays "" and no error is
 *                                    raised here; the backend validation
 *                                    applies (it requires a cashier only
 *                                    before the cutover);
 *   - more than one ACTIVE        -> legacy-data anomaly. Nothing is chosen
 *                                    silently and no picker is offered:
 *                                    `cashierId` stays "" and `error` says
 *                                    the branch must be fixed first.
 *
 * `needsPicker` and `setPicked` are kept so existing consumers keep
 * compiling, but multi-cashier selection is intentionally NOT supported:
 * `needsPicker` is always false and `setPicked` does nothing.
 *
 * Re-fetches every time it is enabled or the target branch changes (the
 * list gates a real stock-moving action), and ignores any response that
 * belongs to a previous branch/open so a slow request can never apply a
 * stale cashier to the wrong branch.
 */
export interface StockCashierState {
  /** The resolved Cashier id, or "" when none was resolved. */
  cashierId: string;
  /** Active Cashiers found for the target branch (diagnostic; at most one in a healthy branch). */
  cashiers: CashierAccount[];
  isLoading: boolean;
  error: string | null;
  /** Always false — multi-cashier selection is not supported (see above). */
  needsPicker: boolean;
  /** No-op, retained for contract compatibility. */
  setPicked: (cashierId: string) => void;
}

const noopSetPicked = (): void => {};

export function useStockCashier(enabled: boolean, shopIdOverride?: string | null): StockCashierState {
  const { selectedShopId } = useShop();
  const targetShopId = shopIdOverride ?? selectedShopId;

  const [cashiers, setCashiers] = useState<CashierAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Always drop the previous branch's result first, so nothing from an
    // earlier branch/open is ever visible for the new one.
    setCashiers([]);
    setError(null);

    if (!enabled || !targetShopId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    fetchCashiers()
      .then((all) => {
        if (cancelled) return;
        const active = all.filter((c) => c.active && c.shop?.id === targetShopId);
        setCashiers(active);
        if (active.length > 1) {
          setError(
            "This branch has more than one active cashier, which breaks the one-cashier-per-branch rule. " +
              "Resolve it in Cashiers before changing stock here."
          );
        }
      })
      .catch((err: { message?: string }) => {
        if (cancelled) return;
        setError(err?.message || "Couldn't load the branch cashier.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, targetShopId]);

  return {
    cashierId: cashiers.length === 1 ? cashiers[0].id : "",
    cashiers,
    isLoading,
    error,
    needsPicker: false,
    setPicked: noopSetPicked,
  };
}
