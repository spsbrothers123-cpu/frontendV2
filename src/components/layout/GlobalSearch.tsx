import { useEffect, useRef, useState } from "react";
import { Search, Package, Users, Receipt, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as searchApi from "../../api/search";
import type { GlobalSearchResults, SearchResultItem } from "../../types";

const emptyResults: GlobalSearchResults = { products: [], customers: [], transactions: [] };

function ResultGroup({
  label,
  icon,
  items,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  items: SearchResultItem[];
  onSelect: (item: SearchResultItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="py-1.5">
      <p className="px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted flex items-center gap-1.5">{icon}{label}</p>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm text-left hover:bg-ivory-soft transition-colors duration-150"
        >
          <span className="font-medium text-charcoal truncate">{item.label}</span>
          {item.subtitle && <span className="text-charcoal-muted text-xs shrink-0">{item.subtitle}</span>}
        </button>
      ))}
    </div>
  );
}

export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(emptyResults);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchApi
        .globalSearch(query)
        .then(setResults)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const hasResults = results.products.length > 0 || results.customers.length > 0 || results.transactions.length > 0;
  return { query, setQuery, results, loading, hasResults };
}

export function GlobalSearchInput({ autoFocus, onNavigated }: { autoFocus?: boolean; onNavigated?: () => void }) {
  const { query, setQuery, results, loading, hasResults } = useGlobalSearch();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(item: SearchResultItem) {
    navigate(item.path);
    setQuery("");
    setOpen(false);
    onNavigated?.();
  }

  return (
    <div className="relative flex-1" ref={containerRef}>
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
      <input
        autoFocus={autoFocus}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search products, bills, customers..."
        aria-label="Search products, bills, customers"
        className="w-full min-h-[44px] rounded-btn border border-charcoal/10 bg-white pl-10 pr-4 py-2.5 text-sm placeholder:text-charcoal-muted focus:border-yolk-500 outline-none transition-colors duration-150"
      />
      {open && query.trim() && (
        <div className="absolute left-0 right-0 mt-2 max-h-[60vh] overflow-y-auto bg-white rounded-card shadow-lift border border-charcoal/6 z-40 animate-in fade-in slide-in-from-top-1 duration-150">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-charcoal-muted">
              <Loader2 size={15} className="animate-spin" /> Searching...
            </div>
          )}
          {!loading && !hasResults && (
            <p className="px-3.5 py-6 text-sm text-charcoal-muted text-center">No matches for "{query}".</p>
          )}
          {!loading && hasResults && (
            <>
              <ResultGroup label="Products" icon={<Package size={12} />} items={results.products} onSelect={handleSelect} />
              <ResultGroup label="Customers" icon={<Users size={12} />} items={results.customers} onSelect={handleSelect} />
              <ResultGroup label="Transactions" icon={<Receipt size={12} />} items={results.transactions} onSelect={handleSelect} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
