import { useCallback, useEffect, useState } from "react";
import { TrendingUp, Receipt, ShoppingCart, Wallet, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Tabs, StatCard, CardSkeleton, ErrorState, Button } from "../components/ui";
import { MiniAreaChart, BreakdownBars, formatCurrency } from "../components/ui/MiniChart";
import * as reportsApi from "../api/reports";
import type {
  ReportRange, SalesReportData, PurchaseReportData, ExpenseReportData, ProfitReportData, ExportFormat,
} from "../types";
import { useToast } from "../context/ToastContext";

type ReportTab = "sales" | "purchases" | "expenses" | "profit";

const rangeTabs: { label: string; value: ReportRange }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Custom Range", value: "custom" },
];

function ExportButtons({ reportType, range }: { reportType: string; range: ReportRange }) {
  const { showToast } = useToast();
  const [pending, setPending] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    setPending(format);
    try {
      await reportsApi.exportReport(reportType, format, { range });
      showToast("Export downloaded.", "success");
    } catch (err: any) {
      showToast(err?.message || "Export failed. Please try again.", "error");
    } finally {
      setPending(null);
    }
  }
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" disabled={pending !== null} onClick={() => handleExport("excel")}>
        <FileSpreadsheet size={14} /> {pending === "excel" ? "Exporting…" : "Excel"}
      </Button>
      <Button variant="secondary" size="sm" disabled={pending !== null} onClick={() => handleExport("csv")}>
        <FileDown size={14} /> {pending === "csv" ? "Exporting…" : "CSV"}
      </Button>
      <Button variant="secondary" size="sm" disabled={pending !== null} onClick={() => handleExport("pdf")}>
        <FileText size={14} /> {pending === "pdf" ? "Exporting…" : "PDF"}
      </Button>
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>("sales");
  const [range, setRange] = useState<ReportRange>("week");

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Sales, purchases, expenses, and profit at a glance."
        actions={<Tabs tabs={rangeTabs} active={range} onChange={(v) => setRange(v as ReportRange)} />}
      />

      <div className="mb-5"><Tabs tabs={[
        { label: "Sales", value: "sales" },
        { label: "Purchases", value: "purchases" },
        { label: "Expenses", value: "expenses" },
        { label: "Profit", value: "profit" },
      ]} active={tab} onChange={(v) => setTab(v as ReportTab)} /></div>

      {tab === "sales" && <SalesReportTab range={range} />}
      {tab === "purchases" && <PurchaseReportTab range={range} />}
      {tab === "expenses" && <ExpenseReportTab range={range} />}
      {tab === "profit" && <ProfitReportTab range={range} />}
    </div>
  );
}

function SalesReportTab({ range }: { range: ReportRange }) {
  const [data, setData] = useState<SalesReportData | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await reportsApi.fetchSalesReport({ range }));
      setState("success");
    } catch {
      setState("error");
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>;
  if (state === "error" || !data) return <div className="rounded-card bg-white shadow-soft"><ErrorState message="Couldn't load the sales report." onRetry={load} /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4"><ExportButtons reportType="sales" range={range} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<ShoppingCart size={17} className="text-yolk-700" />} iconBg="bg-yolk-100" label="Total Sales" value={formatCurrency(data.totalSales)} trend={0} />
        <StatCard icon={<TrendingUp size={17} className="text-olive" />} iconBg="bg-olive-soft" label="Revenue" value={formatCurrency(data.revenue)} trend={0} />
        <StatCard icon={<Receipt size={17} className="text-amber" />} iconBg="bg-amber-soft" label="Number of Bills" value={String(data.billCount)} trend={0} />
        <StatCard icon={<Wallet size={17} className="text-danger" />} iconBg="bg-danger-soft" label="Average Bill Value" value={formatCurrency(data.averageBillValue)} trend={0} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-card bg-white shadow-soft p-5">
          <h2 className="font-display font-bold text-lg text-charcoal mb-3">Sales Trend</h2>
          <MiniAreaChart data={data.salesTrend} valueLabel="Sales" />
        </div>
        <div className="rounded-card bg-white shadow-soft p-5">
          <h2 className="font-display font-bold text-lg text-charcoal mb-3">Revenue Trend</h2>
          <MiniAreaChart data={data.revenueTrend} color="#5C6B2C" valueLabel="Revenue" />
        </div>
      </div>
      <div className="rounded-card bg-white shadow-soft p-5 mt-6">
        <h2 className="font-display font-bold text-lg text-charcoal mb-4">Payment Breakdown</h2>
        <BreakdownBars slices={data.paymentBreakdown} />
      </div>
    </div>
  );
}

function PurchaseReportTab({ range }: { range: ReportRange }) {
  const [data, setData] = useState<PurchaseReportData | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await reportsApi.fetchPurchaseReport({ range }));
      setState("success");
    } catch {
      setState("error");
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>;
  if (state === "error" || !data) return <div className="rounded-card bg-white shadow-soft"><ErrorState message="Couldn't load the purchase report." onRetry={load} /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4"><ExportButtons reportType="purchases" range={range} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<ShoppingCart size={17} className="text-yolk-700" />} iconBg="bg-yolk-100" label="Total Purchases" value={String(data.totalPurchases)} trend={0} />
        <StatCard icon={<Wallet size={17} className="text-olive" />} iconBg="bg-olive-soft" label="Purchase Cost" value={formatCurrency(data.purchaseCost)} trend={0} />
        <StatCard icon={<Receipt size={17} className="text-amber" />} iconBg="bg-amber-soft" label="Purchase Bills" value={String(data.billCount)} trend={0} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-card bg-white shadow-soft p-5">
          <h2 className="font-display font-bold text-lg text-charcoal mb-3">Purchase Trend</h2>
          <MiniAreaChart data={data.purchaseTrend} color="#C87F0A" valueLabel="Purchases" />
        </div>
        <div className="rounded-card bg-white shadow-soft p-5">
          <h2 className="font-display font-bold text-lg text-charcoal mb-4">Supplier Distribution</h2>
          <BreakdownBars slices={data.supplierDistribution} formatValue={(v) => `${v}%`} />
        </div>
      </div>
      <div className="rounded-card bg-white shadow-soft p-5 mt-6">
        <h2 className="font-display font-bold text-lg text-charcoal mb-4">Top Suppliers</h2>
        <BreakdownBars slices={data.topSuppliers} />
      </div>
    </div>
  );
}

function ExpenseReportTab({ range }: { range: ReportRange }) {
  const [data, setData] = useState<ExpenseReportData | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await reportsApi.fetchExpenseReport({ range }));
      setState("success");
    } catch {
      setState("error");
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}</div>;
  if (state === "error" || !data) return <div className="rounded-card bg-white shadow-soft"><ErrorState message="Couldn't load the expense report." onRetry={load} /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4"><ExportButtons reportType="expenses" range={range} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard icon={<Wallet size={17} className="text-danger" />} iconBg="bg-danger-soft" label="Total Expenses" value={formatCurrency(data.totalExpenses)} trend={0} />
        <StatCard icon={<Receipt size={17} className="text-amber" />} iconBg="bg-amber-soft" label="Top Expense Category" value={data.topCategory} trend={0} />
      </div>
      <div className="rounded-card bg-white shadow-soft p-5 mb-6">
        <h2 className="font-display font-bold text-lg text-charcoal mb-3">Expense Trend</h2>
        <MiniAreaChart data={data.expenseTrend} color="#C15B4A" valueLabel="Expenses" />
      </div>
      <div className="rounded-card bg-white shadow-soft p-5">
        <h2 className="font-display font-bold text-lg text-charcoal mb-4">Category Breakdown</h2>
        <BreakdownBars slices={data.categoryBreakdown} />
      </div>
    </div>
  );
}

function ProfitReportTab({ range }: { range: ReportRange }) {
  const [data, setData] = useState<ProfitReportData | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await reportsApi.fetchProfitReport({ range }));
      setState("success");
    } catch {
      setState("error");
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>;
  if (state === "error" || !data) return <div className="rounded-card bg-white shadow-soft"><ErrorState message="Couldn't load the profit report." onRetry={load} /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4"><ExportButtons reportType="profit" range={range} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-2">
        <StatCard icon={<TrendingUp size={17} className="text-olive" />} iconBg="bg-olive-soft" label="Revenue" value={formatCurrency(data.revenue)} trend={0} />
        <StatCard icon={<ShoppingCart size={17} className="text-amber" />} iconBg="bg-amber-soft" label="Purchase Cost" value={formatCurrency(data.purchaseCost)} trend={0} />
        <StatCard icon={<Receipt size={17} className="text-danger" />} iconBg="bg-danger-soft" label="Expenses" value={formatCurrency(data.expenses)} trend={0} />
        <StatCard icon={<Wallet size={17} className="text-yolk-700" />} iconBg="bg-yolk-100" label="Estimated Profit" value={formatCurrency(data.estimatedProfit)} trend={0} />
      </div>
      <p className="text-xs text-charcoal-muted mt-2">Figures are calculated by the backend. Once the real profit endpoint is connected, these labels and values come directly from it — no separate frontend formula is applied.</p>
    </div>
  );
}
