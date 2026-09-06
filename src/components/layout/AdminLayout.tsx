import { useState } from "react";
import { Outlet } from "react-router-dom";
import { DesktopSidebar, MobileDrawer } from "./Sidebar";
import { TopHeader } from "./TopHeader";

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ivory flex">
      <DesktopSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
      <MobileDrawer isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopHeader onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 py-5 sm:py-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
