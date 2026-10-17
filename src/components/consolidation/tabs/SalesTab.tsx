import { TrendingUp, Receipt, Store } from "lucide-react";
import { DataTable } from "../../ui";
import type { Column } from "../../ui";
import { formatCurrency } from "../../ui/MiniChart";
import { fetchSales } from "../../../api/consolidationApi";
import { useConsolidation, useSectionData, dateScopeKey } from "../ConsolidationContext";
import { Panel, SummaryCard, SectionBoundary } from "../shared";
import { fmtNum } from "../format";
import { ShopTrendChart } from "../charts";
import type { SalesTrendPoint } from "../../../types/consolidation";

export function SalesTab() {
  const { query } = useConsolidation();
  const { state, retry } = useSectionData(
    `sales|${dateScopeKey(query)}`,
    (signal) => fetchSales(query, signal),
    "GET /admin/consolidation/sales"
  );

  return (
    <SectionBoundary state={state} onRetry={retry} isEmpty={(d) => d.trend.length === 0 && d.totalBills === 0}>
      {(d) => {
        const shops = d.shops.map((s) => ({ id: s.shopId, name: s.shopName }));
        const columns: Column<SalesTrendPoint>[] = [
          { key: "date", header: "Date", isPrimary: true, render: (r) => r.label },
          { key: "total", header: "Total", className: "tabular-nums font-semibold", render: (r) => formatCurrency(r.total) },
          ...shops.map((s) => ({
            key: s.id,
            header: s.name,
            className: "tabular-nums",
            render: (r: SalesTrendPoint) => formatCurrency(r.perShop[s.id] ?? 0),
          })),
        ];
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard icon={<TrendingUp size={17} className="text-yolk-700" />} iconBg="bg-yolk-100" label="Total Sales" value={formatCurrency(d.totalSales)} />
              <SummaryCard icon={<Receipt size={17} className="text-olive" />} iconBg="bg-olive-soft" label="Completed Bills" value={fmtNum(d.totalBills)} />
              <SummaryCard icon={<Store size={17} className="text-amber" />} iconBg="bg-amber-soft" label="Shops in view" value={fmtNum(d.shops.length)} />
            </div>
            <Panel title="Sales Trend">
              <ShopTrendChart points={d.trend} shops={shops} />
            </Panel>
            <Panel title="Date-wise Sales">
              <DataTable columns={columns} rows={d.trend} rowKey={(r) => r.label} />
            </Panel>
          </div>
        );
      }}
    </SectionBoundary>
  );
}
