import { useEffect, useState, useCallback } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Wallet, TrendingUp, Banknote, CreditCard, Download, ChevronRight, AlertTriangle } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { StatCard, Button, StatusBadge, CardSkeleton, ErrorState, EmptyState, Tabs } from "../components/ui";
import * as dashboardApi from "../api/dashboard";
import type { DashboardKpis, SalesPoint, SalesRange, Transaction, LowStockItem, DateRangeKey } from "../types";
import { useToast } from "../context/ToastContext";

const rangeTabs: { label: string; value: DateRangeKey }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
];

const salesRangeTabs: { label: string; value: SalesRange }[] = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "3 Months", value: "3m" },
];

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export default function Dashboard() {
  const { showToast } = useToast();
  const [dateRange, setDateRange] = useState<DateRangeKey>("today");
  const [salesRange, setSalesRange] = useState<SalesRange>("7d");

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [kpisState, setKpisState] = useState<"loading" | "success" | "error">("loading");

  const [salesData, setSalesData] = useState<SalesPoint[]>([]);
  const [salesState, setSalesState] = useState<"loading" | "success" | "error">("loading");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txState, setTxState] = useState<"loading" | "success" | "error">("loading");

  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [lowStockState, setLowStockState] = useState<"loading" | "success" | "error">("loading");

  const loadKpis = useCallback(async (range: DateRangeKey) => {
    setKpisState("loading");
    try {
      const data = await dashboardApi.fetchDashboardKpis(range);
      setKpis(data);
      setKpisState("success");
    } catch {
      setKpisState("error");
    }
  }, []);

  const loadSales = useCallback(async (range: SalesRange) => {
    setSalesState("loading");
    try {
      const data = await dashboardApi.fetchSalesOverview(range);
      setSalesData(data);
      setSalesState("success");
    } catch {
      setSalesState("error");
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxState("loading");
    try {
      const data = await dashboardApi.fetchRecentTransactions(6);
      setTransactions(data);
      setTxState("success");
    } catch {
      setTxState("error");
    }
  }, []);

  const loadLowStock = useCallback(async () => {
    setLowStockState("loading");
    try {
      const data = await dashboardApi.fetchLowStock();
      setLowStock(data);
      setLowStockState("success");
    } catch {
      setLowStockState("error");
    }
  }, []);

  useEffect(() => { loadKpis(dateRange); }, [dateRange, loadKpis]);
  useEffect(() => { loadSales(salesRange); }, [salesRange, loadSales]);
  useEffect(() => { loadTransactions(); loadLowStock(); }, [loadTransactions, loadLowStock]);

  function handleExport() {
    showToast("Export isn't connected to the backend yet.", "info");
  }

  return (
    <div>
      <PageHeader
        title="Good morning, Admin 👋"
        subtitle="Here's what's happening with your shop today."
        actions={
          <>
            <Tabs tabs={rangeTabs} active={dateRange} onChange={(v) => setDateRange(v as DateRangeKey)} />
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download size={15} /> Export Report
            </Button>
          </>
        }
      />

      {/* KPI cards */}
      {kpisState === "loading" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}
      {kpisState === "error" && (
        <div className="mb-6 rounded-card bg-white shadow-soft"><ErrorState message="Couldn't load your sales summary." onRetry={() => loadKpis(dateRange)} /></div>
      )}
      {kpisState === "success" && kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Wallet size={17} className="text-yolk-700" />} iconBg="bg-yolk-100" label="Total Sales" value={formatCurrency(kpis.totalSales)} trend={kpis.totalSalesTrend} comparisonLabel={kpis.comparisonLabel} />
          <StatCard icon={<TrendingUp size={17} className="text-olive" />} iconBg="bg-olive-soft" label="Total Revenue" value={formatCurrency(kpis.totalRevenue)} trend={kpis.totalRevenueTrend} comparisonLabel={kpis.comparisonLabel} />
          <StatCard icon={<Banknote size={17} className="text-amber" />} iconBg="bg-amber-soft" label="Cash Sales" value={formatCurrency(kpis.cashSales)} trend={kpis.cashSalesTrend} comparisonLabel={kpis.comparisonLabel} />
          <StatCard icon={<CreditCard size={17} className="text-danger" />} iconBg="bg-danger-soft" label="Credit Sales" value={formatCurrency(kpis.creditSales)} trend={kpis.creditSalesTrend} comparisonLabel={kpis.comparisonLabel} />
        </div>
      )}

      {/* Sales overview chart */}
      <div className="rounded-card bg-white shadow-soft p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-4">
            <h2 className="font-display font-bold text-lg text-charcoal">Sales Overview</h2>
          </div>
          <div className="flex items-center gap-4">
            <Tabs tabs={salesRangeTabs} active={salesRange} onChange={(v) => setSalesRange(v as SalesRange)} />
            {kpis && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-charcoal-muted">Revenue</p>
                <p className="font-display font-bold text-charcoal">
                  {formatCurrency(kpis.totalRevenue)}{" "}
                  <span className="text-olive text-sm font-semibold">(+{kpis.totalRevenueTrend}%)</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {salesState === "loading" && <div className="h-[280px] animate-pulse bg-charcoal/5 rounded-btn mt-4" />}
        {salesState === "error" && <ErrorState message="Couldn't load the sales chart." onRetry={() => loadSales(salesRange)} />}
        {salesState === "success" && (
          <div className="h-[280px] mt-2 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F0B429" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F0B429" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#23231A0F" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B6459" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12, fill: "#6B6459" }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v ?? 0)), "Sales"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #23231A14", fontSize: 13 }}
                />
                <Area type="monotone" dataKey="value" stroke="#231F1A" strokeWidth={2} fill="url(#salesFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent transactions */}
        <div className="xl:col-span-2 rounded-card bg-white shadow-soft p-5">
          <h2 className="font-display font-bold text-lg text-charcoal mb-4">Recent Transactions</h2>
          {txState === "loading" && <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>}
          {txState === "error" && <ErrorState message="Couldn't load recent transactions." onRetry={loadTransactions} />}
          {txState === "success" && transactions.length === 0 && (
            <EmptyState title="No transactions yet" description="Sales will show up here as they come in." />
          )}
          {txState === "success" && transactions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-charcoal-muted uppercase tracking-wide border-b border-charcoal/8">
                    <th className="py-2.5 px-2">Bill</th>
                    <th className="py-2.5 px-2 hidden sm:table-cell">Customer</th>
                    <th className="py-2.5 px-2">Amount</th>
                    <th className="py-2.5 px-2 hidden md:table-cell">Payment</th>
                    <th className="py-2.5 px-2 hidden lg:table-cell">Time</th>
                    <th className="py-2.5 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-charcoal/6 last:border-0">
                      <td className="py-3 px-2 font-medium text-charcoal">{t.billNumber}</td>
                      <td className="py-3 px-2 hidden sm:table-cell text-charcoal-muted truncate max-w-[120px]">{t.customerName}</td>
                      <td className="py-3 px-2 font-semibold">{formatCurrency(t.amount)}</td>
                      <td className="py-3 px-2 hidden md:table-cell text-charcoal-muted">{t.paymentMethod}</td>
                      <td className="py-3 px-2 hidden lg:table-cell text-charcoal-muted">{formatTime(t.time)}</td>
                      <td className="py-3 px-2"><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="rounded-card bg-white shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-charcoal">Low Stock Alerts</h2>
            <AlertTriangle size={17} className="text-amber" />
          </div>
          {lowStockState === "loading" && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>}
          {lowStockState === "error" && <ErrorState message="Couldn't load stock alerts." onRetry={loadLowStock} />}
          {lowStockState === "success" && lowStock.length === 0 && (
            <EmptyState title="Stock levels look healthy" description="No products are below their threshold right now." />
          )}
          {lowStockState === "success" && lowStock.length > 0 && (
            <div className="space-y-2">
              {lowStock.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-3 rounded-btn hover:bg-ivory-soft px-2 py-2.5 transition-colors duration-150">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{item.productName}</p>
                    <p className="text-xs text-charcoal-muted">{item.currentStock} {item.unit}s · threshold {item.threshold}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))}
              <button className="w-full flex items-center justify-center gap-1 text-sm font-medium text-yolk-700 hover:text-yolk-800 pt-2 transition-colors duration-150">
                View all products <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
