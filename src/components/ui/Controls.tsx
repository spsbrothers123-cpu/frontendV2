import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

// ── Pagination ──────────────────────────────────────────
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-3 flex-wrap">
      <p className="text-xs text-charcoal-muted">
        {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="w-9 h-9 rounded-btn border border-charcoal/12 flex items-center justify-center disabled:opacity-40 hover:bg-charcoal/5 transition-colors duration-150"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="w-9 h-9 rounded-btn border border-charcoal/12 flex items-center justify-center disabled:opacity-40 hover:bg-charcoal/5 transition-colors duration-150"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { label: string; value: string }[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="tablist" className="flex items-center gap-1 bg-charcoal/5 rounded-btn p-1 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-3.5 py-1.5 rounded-[9px] text-sm font-medium transition-all duration-150 ${
            active === tab.value ? "bg-white text-charcoal shadow-soft" : "text-charcoal-muted hover:text-charcoal"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── SearchBar (debounced) ─────────────────────────────
export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full min-h-[44px] rounded-btn border border-charcoal/12 bg-white pl-10 pr-3.5 py-2.5 text-sm placeholder:text-charcoal-muted focus:border-yolk-500 outline-none transition-colors duration-150"
      />
    </div>
  );
}

// ── FilterBar (wraps filter controls responsively) ────
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

// ── Switch (toggle) ────────────────────────────────────
export function Switch({
  checked,
  onChange,
  label,
  hint,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  hint?: string;
  id?: string;
}) {
  const switchId = id ?? label?.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      {(label || hint) && (
        <div>
          {label && <label htmlFor={switchId} className="text-sm font-medium text-charcoal cursor-pointer">{label}</label>}
          {hint && <p className="text-xs text-charcoal-muted mt-0.5">{hint}</p>}
        </div>
      )}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${checked ? "bg-olive" : "bg-charcoal/15"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}
