import { useState, useRef, useEffect } from "react";
import { Menu, Search, ChevronDown, UserCircle, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { GlobalSearchInput } from "./GlobalSearch";
import { NotificationsBell } from "./NotificationsBell";

export function TopHeader({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setProfileOpen(false);
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-sm border-b border-charcoal/6">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open menu"
          className="lg:hidden w-10 h-10 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150 shrink-0"
        >
          <Menu size={20} />
        </button>

        {/* Desktop / tablet search */}
        <div className="hidden sm:flex flex-1 max-w-xl">
          <GlobalSearchInput />
        </div>

        {/* Mobile search icon */}
        <button
          onClick={() => setMobileSearchOpen((v) => !v)}
          aria-label="Search"
          aria-expanded={mobileSearchOpen}
          className="sm:hidden w-10 h-10 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150"
        >
          <Search size={19} />
        </button>

        <div className="flex-1 sm:flex-none" />

        {/* Shop status — text hides on mobile, dot remains */}
        <div className="hidden md:flex items-center gap-1.5 text-sm text-charcoal-muted shrink-0">
          <span className="w-2 h-2 rounded-full bg-olive" />
          <span>Main Shop</span>
          <span className="text-charcoal/20">•</span>
          <span className="text-olive font-medium">Online</span>
        </div>
        <span className="md:hidden w-2 h-2 rounded-full bg-olive shrink-0" aria-label="Shop online" />

        <NotificationsBell />

        <div className="relative shrink-0" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={profileOpen}
            className="flex items-center gap-2 rounded-btn pl-1 pr-2 py-1 hover:bg-charcoal/6 transition-colors duration-150"
          >
            <span className="w-8 h-8 rounded-full bg-yolk-200 flex items-center justify-center text-charcoal">
              <UserCircle size={20} />
            </span>
            <span className="hidden sm:inline text-sm font-medium text-charcoal">{user?.name ?? "Admin"}</span>
            <ChevronDown size={14} className="text-charcoal-muted" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-card shadow-lift border border-charcoal/6 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                onClick={() => { setProfileOpen(false); navigate("/admin/profile"); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-charcoal hover:bg-ivory-soft transition-colors duration-150"
              >
                <UserCircle size={16} /> Admin Profile
              </button>
              <button
                onClick={() => { setProfileOpen(false); navigate("/admin/settings"); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-charcoal hover:bg-ivory-soft transition-colors duration-150"
              >
                <Settings size={16} /> Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-danger hover:bg-danger-soft transition-colors duration-150"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="sm:hidden px-4 pb-3.5">
          <GlobalSearchInput autoFocus onNavigated={() => setMobileSearchOpen(false)} />
        </div>
      )}
    </header>
  );
}
