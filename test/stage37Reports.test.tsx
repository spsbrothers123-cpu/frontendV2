// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("../src/context/ToastContext", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

let kpis: any;
vi.mock("../src/api/dashboard", () => ({
  fetchDashboardKpis: vi.fn(async () => kpis),
  fetchSalesOverview: vi.fn(async () => []),
  fetchRecentTransactions: vi.fn(async () => []),
  fetchLowStock: vi.fn(async () => []),
}));
vi.mock("../src/api/reports", () => ({
  fetchSalesReport: vi.fn(async () => ({ totalSales: 900, revenue: 900, billCount: 3, averageBillValue: 300, salesTrend: [], paymentBreakdown: [] })),
  fetchPurchaseReport: vi.fn(), fetchExpenseReport: vi.fn(), fetchProfitReport: vi.fn(), exportReport: vi.fn(),
}));

import Dashboard from "../src/pages/Dashboard";
import Reports from "../src/pages/Reports";

const base = { totalSales: 1000, totalSalesTrend: 5, totalRevenue: 1000, totalRevenueTrend: 5, cashSales: 600, cashSalesTrend: 0, creditSales: 400, creditSalesTrend: 0, comparisonLabel: "vs yesterday" };

afterEach(() => { cleanup(); });

describe("Stage 3.7 — sales figures are net of cancelled bills", () => {
  it("labels the Dashboard sales card Net Sales (the backend sums PAID bills only)", async () => {
    kpis = base;
    render(<Dashboard />);
    expect(await screen.findByText("Net Sales")).toBeTruthy();
    expect(screen.queryByText("Total Sales")).toBeNull();
    expect(screen.getAllByText("₹1,000").length).toBeGreaterThan(0); // value shown exactly as the backend returned it
  });

  it("shows a falling revenue trend with a minus sign, not '+-'", async () => {
    kpis = { ...base, totalRevenueTrend: -12.5 };
    render(<Dashboard />);
    await screen.findByText("Net Sales");
    expect(await screen.findByText("(−12.5%)")).toBeTruthy();
    expect(screen.queryByText(/\+-/)).toBeNull();
  });

  it("shows a rising revenue trend with a plus sign", async () => {
    kpis = base;
    render(<Dashboard />);
    expect(await screen.findByText("(+5%)")).toBeTruthy();
  });

  it("labels the Sales report card Net Sales and shows the backend's number unchanged", async () => {
    render(<Reports />);
    expect(await screen.findByText("Net Sales")).toBeTruthy();
    expect(screen.getAllByText("₹900").length).toBeGreaterThan(0);
  });
});
