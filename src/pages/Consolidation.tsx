import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Tabs, ErrorState, EmptyState, Skeleton } from "../components/ui";
import { ConsolidationProvider } from "../components/consolidation/ConsolidationContext";
import { ConsolidationFilters } from "../components/consolidation/ConsolidationFilters";
import { ExportMenu } from "../components/consolidation/ExportMenu";
import { OverviewTab } from "../components/consolidation/tabs/OverviewTab";
import { ShopsTab } from "../components/consolidation/tabs/ShopsTab";
import { ProductsTab } from "../components/consolidation/tabs/ProductsTab";
import { CustomersTab } from "../components/consolidation/tabs/CustomersTab";
import { SalesTab } from "../components/consolidation/tabs/SalesTab";
import { PurchasesTab, ExpensesTab } from "../components/consolidation/tabs/SpendTabs";
import { LowStockTab } from "../components/consolidation/tabs/LowStockTab";
import { fetchAuthorizedShops } from "../api/consolidationApi";
import { resolveRange } from "../lib/consolidationDates";
import type {
  ConsolidationQuery,
  ConsolidationRangeKey,
  ConsolidationSection,
  ConsolidationShop,
} from "../types/consolidation";

const SECTIONS: { label: string; value: ConsolidationSection }[] = [
  { label: "Overview", value: "overview" },
  { label: "Shops", value: "shops" },
  { label: "Products", value: "products" },
  { label: "Customers", value: "customers" },
  { label: "Sales", value: "sales" },
  { label: "Purchases", value: "purchases" },
  { label: "Expenses", value: "expenses" },
  { label: "Low Stock Alerts", value: "low-stock" },
];

// Live-inventory sections ignore the date filter entirely.
const DATE_INDEPENDENT: ConsolidationSection[] = ["products", "low-stock"];

// ─────────────────────────────────────────────────────────────────────────
// Consolidation has its OWN shop filter. `consolidationSelectedShop` is plain
// local state: it never reads ShopContext's selection, never calls
// setSelectedShop / switchShop, and is never written to localStorage or
// sessionStorage. Changing it here cannot affect any other page, and the
// header's global shop stays exactly as the admin left it.
// ─────────────────────────────────────────────────────────────────────────
export default function Consolidation() {
  const [shops, setShops] = useState<ConsolidationShop[]>([]);
  const [shopsStatus, setShopsStatus] = useState<"loading" | "success" | "error">("loading");
  const [shopsError, setShopsError] = useState("");
  const [shopsTick, setShopsTick] = useState(0);

  const [consolidationSelectedShop, setConsolidationSelectedShop] = useState<string>("all");
  const [range, setRange] = useState<ConsolidationRangeKey>("last7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [section, setSection] = useState<ConsolidationSection>("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  // Per-visit section cache (switching tabs never refetches); emptied by Refresh.
  const cacheRef = useRef<Map<string, unknown>>(new Map());

  // Authorized branch list straight from the backend (read-only).
  useEffect(() => {
    const controller = new AbortController();
    setShopsStatus("loading");
    fetchAuthorizedShops(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        setShops(list);
        setShopsStatus("success");
      })
      .catch((err: { message?: string }) => {
        if (controller.signal.aborted) return;
        setShopsError(err?.message || "Couldn't load your shops.");
        setShopsStatus("error");
      });
    return () => controller.abort();
  }, [shopsTick]);

  // If a previously chosen shop is no longer authorized, fall back to All Shops.
  useEffect(() => {
    if (shopsStatus === "success" && consolidationSelectedShop !== "all" && !shops.some((s) => s.id === consolidationSelectedShop)) {
      setConsolidationSelectedShop("all");
    }
  }, [shops, shopsStatus, consolidationSelectedShop]);

  const resolved = useMemo(() => resolveRange(range, customFrom, customTo), [range, customFrom, customTo]);

  const rangeError =
    range === "custom" && !resolved
      ? customFrom && customTo
        ? "The start date must be on or before the end date."
        : "Choose both a start and an end date."
      : null;

  const query = useMemo<ConsolidationQuery>(
    () => ({
      shop: consolidationSelectedShop,
      range,
      dateFrom: resolved?.dateFrom ?? "",
      dateTo: resolved?.dateTo ?? "",
    }),
    [consolidationSelectedShop, range, resolved]
  );

  const handleRefresh = useCallback(() => {
    cacheRef.current.clear();
    setRefreshKey((n) => n + 1);
  }, []);

  const sectionLabel = SECTIONS.find((s) => s.value === section)?.label ?? "";
  const dateIndependent = DATE_INDEPENDENT.includes(section);
  const needsDates = !dateIndependent && !resolved;

  function renderSection() {
    if (needsDates) {
      return (
        <div className="rounded-card bg-white shadow-soft">
          <EmptyState title="Choose a date range" description="Select a valid start and end date to see this section." />
        </div>
      );
    }
    // key={shop}: tab-local state (page number, search) resets when the
    // Consolidation shop filter changes. Fetched data stays cached.
    const k = consolidationSelectedShop;
    switch (section) {
      case "overview": return <OverviewTab key={k} onOpenSection={setSection} />;
      case "shops": return <ShopsTab key={k} />;
      case "products": return <ProductsTab key={k} />;
      case "customers": return <CustomersTab key={k} />;
      case "sales": return <SalesTab key={k} />;
      case "purchases": return <PurchasesTab key={k} />;
      case "expenses": return <ExpensesTab key={k} />;
      case "low-stock": return <LowStockTab key={k} />;
    }
  }

  return (
    <div>
      <PageHeader
        title="Consolidation"
        subtitle="Cross-shop view with its own filters — independent of the shop selected in the header."
        actions={
          <ExportMenu
            section={section}
            sectionLabel={sectionLabel}
            query={query}
            canExportSection={dateIndependent || !!resolved}
            canExportFull={!!resolved}
          />
        }
      />

      {shopsStatus === "loading" && (
        <div className="space-y-4" role="status" aria-label="Loading shops">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {shopsStatus === "error" && (
        <div className="rounded-card bg-white shadow-soft">
          <ErrorState message={shopsError} onRetry={() => setShopsTick((n) => n + 1)} />
        </div>
      )}

      {shopsStatus === "success" && (
        <div className="space-y-5">
          <ConsolidationFilters
            shops={shops}
            shop={consolidationSelectedShop}
            onShopChange={setConsolidationSelectedShop}
            range={range}
            onRangeChange={setRange}
            customFrom={customFrom}
            customTo={customTo}
            onCustomChange={(from, to) => { setCustomFrom(from); setCustomTo(to); }}
            rangeError={rangeError}
            onRefresh={handleRefresh}
          />

          <div className="overflow-x-auto pb-1 [&>div]:min-w-max [&_button]:whitespace-nowrap">
            <Tabs tabs={SECTIONS} active={section} onChange={(v) => setSection(v as ConsolidationSection)} />
          </div>

          <ConsolidationProvider query={query} shops={shops} cache={cacheRef} refreshKey={refreshKey}>
            {renderSection()}
          </ConsolidationProvider>
        </div>
      )}
    </div>
  );
}
