import { useState, useRef, useEffect } from "react";
import { ChevronDown, Store, Check } from "lucide-react";
import { useShop } from "../../context/ShopContext";

export function ShopSelector() {
  const { availableShops, selectedShop, isSwitching, setSelectedShop } = useShop();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (availableShops.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-charcoal-muted shrink-0">
        <Store size={15} />
        <span className="hidden sm:inline">No shop assigned</span>
      </div>
    );
  }

  const canSwitch = availableShops.length > 1;

  async function handlePick(shopId: string) {
    setOpen(false);
    await setSelectedShop(shopId);
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => canSwitch && setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={isSwitching || !canSwitch}
        className="flex items-center gap-2 rounded-btn pl-2 pr-2.5 py-1.5 hover:bg-charcoal/6 disabled:hover:bg-transparent transition-colors duration-150 disabled:opacity-70 max-w-[110px] sm:max-w-[220px]"
        title={selectedShop?.name}
      >
        <span className="w-2 h-2 rounded-full bg-olive shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium text-charcoal truncate">{selectedShop?.name ?? "Select shop"}</span>
        {canSwitch && <ChevronDown size={14} className="text-charcoal-muted shrink-0" />}
      </button>

      {open && canSwitch && (
        <div
          role="listbox"
          aria-label="Select shop"
          className="absolute right-0 sm:left-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-card shadow-lift border border-charcoal/6 py-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {availableShops.map((shop) => (
            <button
              key={shop.id}
              role="option"
              aria-selected={shop.id === selectedShop?.id}
              onClick={() => handlePick(shop.id)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-charcoal hover:bg-ivory-soft transition-colors duration-150 text-left"
            >
              <span className="truncate">{shop.name}</span>
              {shop.id === selectedShop?.id && <Check size={15} className="text-olive shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
