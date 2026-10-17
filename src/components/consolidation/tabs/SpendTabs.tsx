import { ShoppingCart, Receipt } from "lucide-react";
import { DataTable } from "../../ui";
import type { Column } from "../../ui";
import { formatCurrency, BreakdownBars } from "../../ui/MiniChart";
import { fetchPurchases, fetchExpenses } from "../../../api/consolidationApi";
import { useConsolidation, useSectionData, dateScopeKey } from "../ConsolidationContext";
import { Panel, SummaryCard, SectionBoundary, ShopTag } from "../shared";
import { fmtNum } from "../format";
import { ShopBarChart, DateBarChart } from "../charts";
import type { DateAmountRow, ShopAmountRow } from "../../../types/consolidation";

interface SpendData {
  total: number;
  count: number;
  byShop: ShopAmountRow[];
  byDate: DateAmountRow[];
  byCategory?: { category: string; amount: number; count: number }[];
}

// Purchases and Expenses have the same shape, so they share one body.
function SpendBody({ data, noun, icon, iconBg, color }: { data: SpendData; noun: "Purchases" | "Expenses"; icon: React.ReactNode; iconBg: string; color: string }) {
  const shopColumns: Column<ShopAmountRow>[] = [
    { key: "shop", header: "Shop", isPrimary: true, render: (r) => <ShopTag shopId={r.shopId} name={r.shopName} /> },
    { key: "amount", header: "Amount", className: "tabular-nums font-semibold", render: (r) => formatCurrency(r.amount) },
    { key: "count", header: "Count", className: "tabular-nums", render: (r) => fmtNum(r.count) },
  ];
  const dateColumns: Column<DateAmountRow>[] = [
    { key: "date", header: "Date", isPrimary: true, render: (r) => r.label },
    { key: "total", header: "Total", className: "tabular-nums font-semibold", render: (r) => formatCurrency(r.total) },
    { key: "count", header: "Count", className: "tabular-nums", render: (r) => fmtNum(r.count) },
  ];
  const categories = data.byCategory ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard icon={icon} iconBg={iconBg} label={`Total ${noun}`} value={formatCurrency(data.total)} />
        <SummaryCard icon={icon} iconBg={iconBg} label={`${noun} Count`} value={fmtNum(data.count)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title={`${noun} by Shop`}>
          <ShopBarChart valueLabel={noun} data={data.byShop.map((s) => ({ id: s.shopId, name: s.shopName, value: s.amount }))} />
        </Panel>
        <Panel title="Date-wise Comparison">
          <DateBarChart valueLabel={noun} color={color} data={data.byDate} />
        </Panel>
      </div>

      {categories.length > 0 && (
        <Panel title="By Category">
          <BreakdownBars slices={categories.map((c) => ({ label: c.category, value: c.amount }))} />
        </Panel>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Shop-wise">
          <DataTable columns={shopColumns} rows={data.byShop} rowKey={(r) => r.shopId} />
        </Panel>
        <Panel title="Date-wise">
          <DataTable columns={dateColumns} rows={data.byDate} rowKey={(r) => r.label} />
        </Panel>
      </div>
    </div>
  );
}

export function PurchasesTab() {
  const { query } = useConsolidation();
  const { state, retry } = useSectionData(
    `purchases|${dateScopeKey(query)}`,
    (signal) => fetchPurchases(query, signal),
    "GET /admin/consolidation/purchases"
  );
  return (
    <SectionBoundary state={state} onRetry={retry} isEmpty={(d) => d.count === 0} emptyTitle="No purchases in this period">
      {(d) => <SpendBody data={d} noun="Purchases" icon={<ShoppingCart size={17} className="text-olive" />} iconBg="bg-olive-soft" color="#5C6B2C" />}
    </SectionBoundary>
  );
}

export function ExpensesTab() {
  const { query } = useConsolidation();
  const { state, retry } = useSectionData(
    `expenses|${dateScopeKey(query)}`,
    (signal) => fetchExpenses(query, signal),
    "GET /admin/consolidation/expenses"
  );
  return (
    <SectionBoundary state={state} onRetry={retry} isEmpty={(d) => d.count === 0} emptyTitle="No expenses in this period">
      {(d) => <SpendBody data={d} noun="Expenses" icon={<Receipt size={17} className="text-amber" />} iconBg="bg-amber-soft" color="#C87F0A" />}
    </SectionBoundary>
  );
}
