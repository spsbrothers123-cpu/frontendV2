import { TrendingUp, ShoppingCart, Receipt, Store, ArrowRight } from "lucide-react";
import { Button, EmptyState, StatusBadge } from "../../ui";
import { formatCurrency } from "../../ui/MiniChart";
import { fetchOverview } from "../../../api/consolidationApi";
import { useConsolidation, useSectionData, dateScopeKey } from "../ConsolidationContext";
import { Panel, SummaryCard, SectionBoundary, ShopTag } from "../shared";
import { fmtNum, fmtPct } from "../format";
import { ShopBarChart } from "../charts";
import { ProductStockMatrix } from "../ProductStockMatrix";
import { CreditSummaryPanel } from "../CreditSummaryPanel";
import type { ConsolidationSection } from "../../../types/consolidation";

export function OverviewTab({ onOpenSection }: { onOpenSection: (s: ConsolidationSection) => void }) {
  const { query, shopColor } = useConsolidation();
  const { state, retry } = useSectionData(
    `overview|${dateScopeKey(query)}`,
    (signal) => fetchOverview(query, signal),
    "GET /admin/consolidation/overview"
  );

  return (
    <SectionBoundary state={state} onRetry={retry}>
      {(d) => (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard icon={<TrendingUp size={17} className="text-yolk-700" />} iconBg="bg-yolk-100" label="Total Sales" value={formatCurrency(d.totalSales)} />
            <SummaryCard icon={<ShoppingCart size={17} className="text-olive" />} iconBg="bg-olive-soft" label="Total Purchases" value={formatCurrency(d.totalPurchases)} />
            <SummaryCard icon={<Receipt size={17} className="text-amber" />} iconBg="bg-amber-soft" label="Total Expenses" value={formatCurrency(d.totalExpenses)} />
            <SummaryCard icon={<Store size={17} className="text-danger" />} iconBg="bg-danger-soft" label="Active Shops" value={fmtNum(d.activeShops)} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Panel title="Shop-wise Sales">
              {d.shopSales.length === 0 ? (
                <EmptyState title="No sales in this period" />
              ) : (
                <ShopBarChart valueLabel="Sales" data={d.shopSales.map((s) => ({ id: s.shopId, name: s.shopName, value: s.salesAmount }))} />
              )}
            </Panel>

            <Panel title="Branch Performance">
              {d.shopSales.length === 0 ? (
                <EmptyState title="No sales in this period" />
              ) : (
                <ul className="space-y-4">
                  {d.shopSales.map((s) => (
                    <li key={s.shopId}>
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <ShopTag shopId={s.shopId} name={s.shopName} />
                        <span className="text-sm text-charcoal-muted shrink-0">
                          {fmtNum(s.completedBills)} bills · {fmtPct(s.contributionPct)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-charcoal/6 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, s.contributionPct))}%`, backgroundColor: shopColor(s.shopId) }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel
            title="Product Stock Distribution"
            action={<Button variant="ghost" size="sm" onClick={() => onOpenSection("products")}>View all <ArrowRight size={14} /></Button>}
          >
            {d.stockPreview.rows.length === 0 ? (
              <EmptyState title="No products found" />
            ) : (
              <ProductStockMatrix shops={d.stockPreview.shops} rows={d.stockPreview.rows} selectedShop={query.shop} />
            )}
            <p className="text-xs text-charcoal-muted mt-3">Live inventory — not affected by the date filter.</p>
          </Panel>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Panel
              title={`Low Stock Alerts${d.lowStockTotal ? ` (${fmtNum(d.lowStockTotal)})` : ""}`}
              action={<Button variant="ghost" size="sm" onClick={() => onOpenSection("low-stock")}>View all <ArrowRight size={14} /></Button>}
            >
              {d.lowStockPreview.length === 0 ? (
                <EmptyState title="No low-stock items" description="Every product is above its minimum threshold." />
              ) : (
                <ul className="divide-y divide-charcoal/6">
                  {d.lowStockPreview.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-charcoal truncate">{r.productName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <ShopTag shopId={r.shopId} name={r.shopName} />
                          <span className="text-xs text-charcoal-muted">{fmtNum(r.available)} / min {fmtNum(r.threshold)} {r.unit}</span>
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <CreditSummaryPanel summary={d.credits} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Panel title="Purchase Summary" action={<Button variant="ghost" size="sm" onClick={() => onOpenSection("purchases")}>Details <ArrowRight size={14} /></Button>}>
              <p className="font-display font-extrabold text-2xl text-charcoal">{formatCurrency(d.purchaseSummary.total)}</p>
              <p className="text-sm text-charcoal-muted mt-1">{fmtNum(d.purchaseSummary.count)} purchases</p>
            </Panel>
            <Panel title="Expense Summary" action={<Button variant="ghost" size="sm" onClick={() => onOpenSection("expenses")}>Details <ArrowRight size={14} /></Button>}>
              <p className="font-display font-extrabold text-2xl text-charcoal">{formatCurrency(d.expenseSummary.total)}</p>
              <p className="text-sm text-charcoal-muted mt-1">{fmtNum(d.expenseSummary.count)} expenses</p>
            </Panel>
          </div>
        </div>
      )}
    </SectionBoundary>
  );
}
