import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { DesktopSidebar, MobileDrawer } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { useShop } from "../../context/ShopContext";

// Cashiers and Sessions are deliberate exceptions to the Global Shop
// Selector (Phase 3 spec §1/§2): both span every shop the admin owns and
// never depend on which shop is currently active, so switching shops must
// not remount them or wipe their own local state (active tab, selected
// cashier filter, page number, etc).
const SHOP_INDEPENDENT_PATHS = ["/admin/cashiers", "/admin/sessions"];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoading, selectedShopId } = useShop();
  const { pathname } = useLocation();
  const isShopIndependentPage = SHOP_INDEPENDENT_PATHS.some((p) => pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-ivory flex">
      <DesktopSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
      <MobileDrawer isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopHeader onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 py-5 sm:py-6 max-w-[1600px] w-full mx-auto">
          {isLoading ? (
            <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading shop">
              <Loader2 className="animate-spin text-yolk-500" size={26} />
            </div>
          ) : (
            // Keyed on the selected shop: switching shops remounts the
            // current admin page fresh, so every shop-dependent page
            // (Dashboard, Products, Customers, Purchases, Expenses,
            // Inventory, Credits, Reports, History, ...) refetches for
            // the newly selected shop with no per-page selector or
            // per-page shopId plumbing, and no leftover filters/rows
            // from the previous shop lingering in local state.
            //
            // Cashiers and Sessions opt out via a constant key instead —
            // see SHOP_INDEPENDENT_PATHS above.
            <Outlet key={isShopIndependentPage ? "shop-independent" : selectedShopId ?? "no-shop"} />
          )}
        </main>
      </div>
    </div>
  );
}
