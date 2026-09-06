import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  Receipt,
  ShoppingCart,
  Boxes,
  CreditCard,
  BarChart3,
  History,
  MonitorSmartphone,
  UserCog,
  Settings,
  UserCircle,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { ReactElement } from "react";

interface NavItem {
  label: string;
  to?: string;
  icon: ReactElement;
  comingSoon?: boolean;
}

const primaryNav: NavItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: <LayoutDashboard size={19} /> },
  { label: "Products", to: "/admin/products", icon: <Package size={19} /> },
  { label: "Customers", to: "/admin/customers", icon: <Users size={19} /> },
  { label: "Expenses", to: "/admin/expenses", icon: <Receipt size={19} /> },
  { label: "Purchases", to: "/admin/purchases", icon: <ShoppingCart size={19} /> },
];

// Phase 2 is now live — real routes with backend-aware mock data.
const phase2Nav: NavItem[] = [
  { label: "Inventory", to: "/admin/inventory", icon: <Boxes size={19} /> },
  { label: "Credits", to: "/admin/credits", icon: <CreditCard size={19} /> },
  { label: "Reports", to: "/admin/reports", icon: <BarChart3 size={19} /> },
  { label: "History", to: "/admin/history", icon: <History size={19} /> },
  { label: "Sessions", to: "/admin/sessions", icon: <MonitorSmartphone size={19} /> },
  { label: "Cashiers", to: "/admin/cashiers", icon: <UserCog size={19} /> },
];

function EggLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" className="shrink-0" aria-hidden="true">
        <ellipse cx="16" cy="17" rx="12" ry="13.5" fill="#F0B429" />
        <ellipse cx="13" cy="13" rx="4.5" ry="5" fill="#FFF3C4" fillOpacity="0.55" />
      </svg>
      {!collapsed && (
        <div className="min-w-0">
          <p className="font-display font-extrabold text-white text-[15px] leading-tight tracking-tight truncate">EGG MART</p>
          <p className="text-[11px] text-white/50 leading-tight truncate">Admin Panel</p>
        </div>
      )}
    </div>
  );
}

function NavButton({ item, collapsed, onNavigate }: { item: NavItem; collapsed?: boolean; onNavigate?: () => void }) {
  const baseClasses =
    "flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-colors duration-150 min-h-[44px]";

  if (item.comingSoon || !item.to) {
    return (
      <div
        className={`${baseClasses} text-white/25 cursor-not-allowed`}
        title="Coming in Phase 2"
        aria-disabled="true"
      >
        {item.icon}
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && <span className="ml-auto text-[10px] uppercase tracking-wide text-white/20">Soon</span>}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${baseClasses} ${
          isActive ? "bg-yolk-500 text-charcoal font-semibold" : "text-white/70 hover:bg-white/8 hover:text-white"
        }`
      }
    >
      {item.icon}
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
}

function SidebarContent({ collapsed, onNavigate, onToggleCollapse, onCloseMobile }: SidebarContentProps) {
  const { logout, user } = useAuth();

  return (
    <div className="flex flex-col h-full bg-charcoal text-white">
      <div className="flex items-center justify-between px-4 py-5">
        <EggLogo collapsed={collapsed} />
        {onCloseMobile && (
          <button onClick={onCloseMobile} aria-label="Close menu" className="lg:hidden text-white/70 hover:text-white p-1">
            <X size={20} />
          </button>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex text-white/50 hover:text-white p-1"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1" aria-label="Main navigation">
        {primaryNav.map((item) => (
          <NavButton key={item.label} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        <div className="pt-3 mt-3 border-t border-white/8 space-y-1">
          {phase2Nav.map((item) => (
            <NavButton key={item.label} item={item} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-white/8 space-y-1">
        <NavButton item={{ label: "Settings", to: "/admin/settings", icon: <Settings size={19} /> }} collapsed={collapsed} onNavigate={onNavigate} />
        <NavButton item={{ label: user?.name ?? "Admin Profile", to: "/admin/profile", icon: <UserCircle size={19} /> }} collapsed={collapsed} onNavigate={onNavigate} />
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-danger/20 hover:text-white transition-colors duration-150 min-h-[44px]"
        >
          <LogOut size={19} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

export function DesktopSidebar({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 transition-[width] duration-250 ${
        collapsed ? "w-[76px]" : "w-[256px]"
      }`}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </aside>
  );
}

export function MobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div className="absolute inset-0 bg-charcoal/50 animate-in fade-in duration-200" onClick={onClose} aria-hidden="true" />
      <div className="relative w-[260px] h-full animate-in slide-in-from-left duration-250">
        <SidebarContent onNavigate={onClose} onCloseMobile={onClose} />
      </div>
    </div>
  );
}
