import { apiClient, USE_MOCK } from "./client";
import { delay, store, computeLowStock } from "./mockStore";
import type { DashboardKpis, SalesPoint, SalesRange, Transaction, LowStockItem, DateRangeKey } from "../types";

// NOTE for backend integration: expects GET /admin/dashboard/kpis?range=today|week|month
export async function fetchDashboardKpis(range: DateRangeKey): Promise<DashboardKpis> {
  if (USE_MOCK) {
    const base: Record<DateRangeKey, DashboardKpis> = {
      today: { totalSales: 48250, totalSalesTrend: 12.4, totalRevenue: 52430, totalRevenueTrend: 8.2, cashSales: 31200, cashSalesTrend: 14.1, creditSales: 9850, creditSalesTrend: -3.4, comparisonLabel: "vs yesterday" },
      week: { totalSales: 312500, totalSalesTrend: 6.1, totalRevenue: 338900, totalRevenueTrend: 5.4, cashSales: 210300, cashSalesTrend: 7.8, creditSales: 61200, creditSalesTrend: -1.2, comparisonLabel: "vs last week" },
      month: { totalSales: 1284000, totalSalesTrend: 9.8, totalRevenue: 1392500, totalRevenueTrend: 8.9, cashSales: 845000, cashSalesTrend: 10.3, creditSales: 248000, creditSalesTrend: 2.1, comparisonLabel: "vs last month" },
      custom: { totalSales: 0, totalSalesTrend: 0, totalRevenue: 0, totalRevenueTrend: 0, cashSales: 0, cashSalesTrend: 0, creditSales: 0, creditSalesTrend: 0, comparisonLabel: "custom range" },
    };
    return delay(base[range] ?? base.today, 500);
  }
  const { data } = await apiClient.get<DashboardKpis>("/admin/dashboard/kpis", { params: { range } });
  return data;
}

// NOTE for backend integration: expects GET /admin/dashboard/sales?window=7d|30d|3m
export async function fetchSalesOverview(range: SalesRange): Promise<SalesPoint[]> {
  if (USE_MOCK) {
    const weekly: SalesPoint[] = [
      { label: "Mon", value: 8200 }, { label: "Tue", value: 18400 }, { label: "Wed", value: 12100 },
      { label: "Thu", value: 24800 }, { label: "Fri", value: 19700 }, { label: "Sat", value: 26200 },
      { label: "Sun", value: 15600 },
    ];
    if (range === "7d") return delay(weekly, 500);
    if (range === "30d") return delay(Array.from({ length: 30 }, (_, i) => ({ label: `${i + 1}`, value: 5000 + Math.round(Math.sin(i / 3) * 8000 + 15000) })), 500);
    return delay(Array.from({ length: 12 }, (_, i) => ({ label: `W${i + 1}`, value: 60000 + Math.round(Math.cos(i / 2) * 20000 + 40000) })), 500);
  }
  const { data } = await apiClient.get<SalesPoint[]>("/admin/dashboard/sales", { params: { window: range } });
  return data;
}

// NOTE for backend integration: expects GET /admin/dashboard/transactions?limit=
export async function fetchRecentTransactions(limit = 10): Promise<Transaction[]> {
  if (USE_MOCK) return delay(store.transactions.slice(0, limit), 450);
  const { data } = await apiClient.get<Transaction[]>("/admin/dashboard/transactions", { params: { limit } });
  return data;
}

// NOTE for backend integration: expects GET /admin/dashboard/low-stock
export async function fetchLowStock(): Promise<LowStockItem[]> {
  if (USE_MOCK) return delay(computeLowStock(), 450);
  const { data } = await apiClient.get<LowStockItem[]>("/admin/dashboard/low-stock");
  return data;
}
