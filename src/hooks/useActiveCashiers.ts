import { useEffect, useState } from "react";
import { fetchCashiers } from "../api/cashiers";
import { useShop } from "../context/ShopContext";
import type { CashierAccount } from "../types";

/**
 * Cashier-level inventory foundation: every stock-affecting admin action
 * (purchase intake, manual adjustment, initial product stock) needs the
 * admin to pick a specific cashier to own the change. This is the one
 * place that list is loaded from, so every picker across Products,
 * Inventory, and Purchases stays consistent (same cashiers, same "active
 * only" filter, same loading/error handling).
 *
 * Since Phase 3, GET /admin/cashiers spans every shop the admin owns (it's
 * a deliberate exception to the Global Shop Selector on the Cashiers page
 * itself). But these drawers act on the *currently active* shop's stock,
 * so the list here is further filtered down to the selected shop — the
 * backend would reject a cross-shop pick anyway (CASHIER_NOT_IN_SHOP), but
 * filtering here means the picker only ever offers valid choices.
 *
 * Deliberately re-fetches every time a consuming drawer/modal opens
 * (`enabled`) rather than caching globally — cashier accounts can be
 * added/suspended between one drawer open and the next, and this list
 * gates a real stock-moving action, so it should always be current.
 */
export function useActiveCashiers(enabled: boolean) {
  const { selectedShopId } = useShop();
  const [cashiers, setCashiers] = useState<CashierAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchCashiers()
      .then((all) => {
        if (cancelled) return;
        setCashiers(all.filter((c) => c.active && c.shop?.id === selectedShopId));
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message || "Couldn't load cashiers.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, selectedShopId]);

  return { cashiers, isLoading, error };
}
