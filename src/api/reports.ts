import { apiClient, USE_MOCK } from "./client";
import { delay } from "./mockStore";
import { downloadBlob, extensionForFormat } from "../lib/download";
import type {
  ReportRange,
  SalesReportData,
  PurchaseReportData,
  ExpenseReportData,
  ProfitReportData,
  ExportFormat,
} from "../types";

export interface ReportQuery {
  range: ReportRange;
  dateFrom?: string;
  dateTo?: string;
}

const rangeMultiplier: Record<ReportRange, number> = { today: 1, week: 7, month: 30, custom: 5 };

// NOTE for backend integration: expects GET /admin/reports/sales?range=&dateFrom=&dateTo=
// Values below are illustrative mock figures only — the real endpoint must
// return backend-computed sales totals so the UI never invents financial data.
export async function fetchSalesReport(query: ReportQuery): Promise<SalesReportData> {
  if (USE_MOCK) {
    const m = rangeMultiplier[query.range];
    const billCount = 18 * m;
    const totalSales = 1650 * m;
    const revenue = 1780 * m;
    const data: SalesReportData = {
      totalSales,
      revenue,
      billCount,
      averageBillValue: Math.round(revenue / billCount),
      salesTrend: Array.from({ length: Math.min(m, 14) || 1 }, (_, i) => ({ label: `D${i + 1}`, value: Math.round(1400 + Math.sin(i / 2) * 500 + i * 20) })),
      revenueTrend: Array.from({ length: Math.min(m, 14) || 1 }, (_, i) => ({ label: `D${i + 1}`, value: Math.round(1550 + Math.cos(i / 2) * 480 + i * 22) })),
      paymentBreakdown: [
        { label: "Cash", value: Math.round(revenue * 0.52) },
        { label: "UPI", value: Math.round(revenue * 0.28) },
        { label: "Credit", value: Math.round(revenue * 0.14) },
        { label: "Card", value: Math.round(revenue * 0.06) },
      ],
    };
    return delay(data, 550);
  }
  const { data } = await apiClient.get<SalesReportData>("/admin/reports/sales", { params: query });
  return data;
}

// NOTE for backend integration: expects GET /admin/reports/purchases?range=&dateFrom=&dateTo=
export async function fetchPurchaseReport(query: ReportQuery): Promise<PurchaseReportData> {
  if (USE_MOCK) {
    const m = rangeMultiplier[query.range];
    const purchaseCost = 980 * m;
    const data: PurchaseReportData = {
      totalPurchases: Math.max(1, Math.round(m / 3)),
      purchaseCost,
      billCount: Math.max(1, Math.round(m / 3)),
      topSuppliers: [
        { label: "Sri Balaji Poultry Farm", value: Math.round(purchaseCost * 0.55) },
        { label: "Green Valley Eggs", value: Math.round(purchaseCost * 0.3) },
        { label: "Others", value: Math.round(purchaseCost * 0.15) },
      ],
      purchaseTrend: Array.from({ length: Math.min(m, 14) || 1 }, (_, i) => ({ label: `D${i + 1}`, value: Math.round(800 + Math.sin(i / 3) * 300) })),
      supplierDistribution: [
        { label: "Sri Balaji Poultry Farm", value: 55 },
        { label: "Green Valley Eggs", value: 30 },
        { label: "Others", value: 15 },
      ],
    };
    return delay(data, 550);
  }
  const { data } = await apiClient.get<PurchaseReportData>("/admin/reports/purchases", { params: query });
  return data;
}

// NOTE for backend integration: expects GET /admin/reports/expenses?range=&dateFrom=&dateTo=
export async function fetchExpenseReport(query: ReportQuery): Promise<ExpenseReportData> {
  if (USE_MOCK) {
    const m = rangeMultiplier[query.range];
    const totalExpenses = 210 * m;
    const data: ExpenseReportData = {
      totalExpenses,
      topCategory: "Utilities",
      expenseTrend: Array.from({ length: Math.min(m, 14) || 1 }, (_, i) => ({ label: `D${i + 1}`, value: Math.round(150 + Math.cos(i / 2) * 60) })),
      categoryBreakdown: [
        { label: "Utilities", value: Math.round(totalExpenses * 0.38) },
        { label: "Transport", value: Math.round(totalExpenses * 0.24) },
        { label: "Supplies", value: Math.round(totalExpenses * 0.22) },
        { label: "Other", value: Math.round(totalExpenses * 0.16) },
      ],
    };
    return delay(data, 550);
  }
  const { data } = await apiClient.get<ExpenseReportData>("/admin/reports/expenses", { params: query });
  return data;
}

// NOTE for backend integration: expects GET /admin/reports/profit?range=&dateFrom=&dateTo=
// IMPORTANT: profit must be computed by the backend. This mock only
// illustrates the shape of the response — do not ship a frontend formula
// against a real API.
export async function fetchProfitReport(query: ReportQuery): Promise<ProfitReportData> {
  if (USE_MOCK) {
    const m = rangeMultiplier[query.range];
    const revenue = 1780 * m;
    const purchaseCost = 980 * m;
    const expenses = 210 * m;
    return delay({ revenue, purchaseCost, expenses, estimatedProfit: revenue - purchaseCost - expenses }, 550);
  }
  const { data } = await apiClient.get<ProfitReportData>("/admin/reports/profit", { params: query });
  return data;
}

// NOTE for backend integration: expects GET /admin/reports/export?type=sales|purchases|expenses|profit&format=excel|csv|pdf&range=&dateFrom=&dateTo=
// Downloads the real backend-generated file — never fabricates one client-side.
export async function exportReport(reportType: string, format: ExportFormat, query: ReportQuery): Promise<void> {
  if (USE_MOCK) {
    throw { status: 501, message: "Export requires the live backend — turn off demo mode to use it." };
  }
  const response = await apiClient.get("/admin/reports/export", {
    params: { type: reportType, format, ...query },
    responseType: "blob",
  });
  downloadBlob(response.data, response.headers, `${reportType}-report.${extensionForFormat(format)}`);
}
