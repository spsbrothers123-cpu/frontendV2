import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import * as shopsApi from "../api/shops";
import type { Shop } from "../types";
import { useToast } from "./ToastContext";

interface ShopContextValue {
  availableShops: Shop[];
  selectedShop: Shop | null;
  selectedShopId: string | null;
  isLoading: boolean;
  isSwitching: boolean;
  setSelectedShop: (shopId: string) => Promise<void>;
  refreshShops: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

// One common Shop Selector's state lives here (see TopHeader/ShopSelector)
// instead of on every shop-dependent page. Mounted once, above the
// routed <Outlet>, for the whole authenticated Admin app.
export function ShopProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  // The database (via GET /admin/shops) is the only source of truth for
  // both "which shops can this admin see" and "which one is active" —
  // this never trusts a locally cached/stored shopId. If the shop the
  // backend last had active isn't in the list it just returned (revoked
  // access, deleted link, etc.), none of the returned rows come back
  // flagged `current`, and we self-heal onto the first shop that's still
  // authorized instead of ever showing a dangling selection.
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const shops = await shopsApi.fetchShops();
      const flagged = shops.find((s) => s.current) ?? null;

      if (flagged) {
        setAvailableShops(shops);
        setSelectedShopId(flagged.id);
      } else if (shops.length > 0) {
        try {
          const switched = await shopsApi.switchShop(shops[0].id);
          setAvailableShops(shops.map((s) => ({ ...s, current: s.id === switched.id })));
          setSelectedShopId(switched.id);
        } catch {
          // Even if telling the backend fails, still show something
          // sensible locally — the next real action will surface any
          // auth problem properly.
          setAvailableShops(shops);
          setSelectedShopId(shops[0].id);
        }
      } else {
        setAvailableShops([]);
        setSelectedShopId(null);
      }
    } catch {
      showToast("Couldn't load your shops.", "error");
      setAvailableShops([]);
      setSelectedShopId(null);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const setSelectedShop = useCallback(async (shopId: string) => {
    if (shopId === selectedShopId) return;
    setIsSwitching(true);
    try {
      const shop = await shopsApi.switchShop(shopId);
      setAvailableShops((prev) => prev.map((s) => ({ ...s, current: s.id === shop.id })));
      setSelectedShopId(shop.id);
    } catch (err: any) {
      showToast(err?.message || "Couldn't switch shops. Please try again.", "error");
    } finally {
      setIsSwitching(false);
    }
  }, [selectedShopId, showToast]);

  const selectedShop = availableShops.find((s) => s.id === selectedShopId) ?? null;

  return (
    <ShopContext.Provider
      value={{
        availableShops,
        selectedShop,
        selectedShopId,
        isLoading,
        isSwitching,
        setSelectedShop,
        refreshShops: load,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}
