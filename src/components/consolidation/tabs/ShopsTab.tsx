import { DataTable } from "../../ui";
import type { Column } from "../../ui";
import { formatCurrency } from "../../ui/MiniChart";
import { fetchSales } from "../../../api/consolidationApi";
import { useConsolidation, useSectionData, dateScopeKey } from "../ConsolidationContext";
import { Panel, SectionBoundary, ShopTag } from "../shared";
import { fmtNum, fmtPct } from "../format";
import { ShopBarChart } from "../charts";
import type { ShopSalesRow } from "../../../types/consolidation";

// Shop-wise comparison. Shares its request (and cache entry) with the Sales tab.
export function ShopsTab() {
  const { query, shopColor } = useConsolidation();
  const { state, retry } = useSectionData(
    `sales|${dateScopeKey(query)}`,
    (signal) => fetchSales(query, signal),
    "GET /admin/consolidation/sales"
  );

  const columns: Column<ShopSalesRow>[] = [
    { key: "shop", header: "Shop", isPrimary: true, render: (r) => <ShopTag shopId={r.shopId} name={r.shopName} /> },
    { key: "sales", header: "Sales", className: "tabular-nums", render: (r) => formatCurrency(r.salesAmount) },
    { key: "bills", header: "Completed Bills", className: "tabular-nums", render: (r) => fmtNum(r.completedBills) },
    {
      key: "contribution",
      header: "Contribution",
      render: (r) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="h-2 flex-1 rounded-full bg-charcoal/6 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, r.contributionPct))}%`, backgroundColor: shopColor(r.shopId) }} />
          </div>
          <span className="text-xs text-charcoal-muted tabular-nums w-12 text-right">{fmtPct(r.contributionPct)}</span>
        </div>
      ),
    },
  ];

  return (
    <SectionBoundary state={state} onRetry={retry} isEmpty={(d) => d.shops.length === 0} emptyTitle="No shops to compare" emptyDescription="No sales were recorded for this selection.">
      {(d) => (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Panel title="Sales by Shop">
              <ShopBarChart valueLabel="Sales" data={d.shops.map((s) => ({ id: s.shopId, name: s.shopName, value: s.salesAmount }))} />
            </Panel>
            <Panel title="Completed Bills by Shop">
              <ShopBarChart valueLabel="Completed bills" money={false} data={d.shops.map((s) => ({ id: s.shopId, name: s.shopName, value: s.completedBills }))} />
            </Panel>
          </div>
          <Panel title="Shop Comparison">
            <DataTable columns={columns} rows={d.shops} rowKey={(r) => r.shopId} />
          </Panel>
        </div>
      )}
    </SectionBoundary>
  );
}
