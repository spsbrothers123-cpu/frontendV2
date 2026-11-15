// @vitest-environment jsdom
// Admin Notification Center — Phase 1: Settings panel, Daily Business Summary
// page and shop-independence of the Center. The notification API module is
// replaced by test doubles; no mock data exists in the application.
import { describe, it, expect, vi, afterEach } from "vitest";
import { useEffect } from "react";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const h = vi.hoisted(() => ({
  showToast: vi.fn(), settingsFetch: vi.fn(), settingsSave: vi.fn(), summaryFetch: vi.fn(), setReadSpy: vi.fn(),
  shop: { selectedShopId: "shop-1", isLoading: false },
}));
const { showToast, settingsFetch, settingsSave, summaryFetch, setReadSpy, shop } = h;

vi.mock("../src/context/ToastContext", () => ({ useToast: () => ({ showToast: h.showToast }) }));
vi.mock("../src/context/ShopContext", () => ({ useShop: () => h.shop }));
vi.mock("../src/components/layout/Sidebar", () => ({ DesktopSidebar: () => null, MobileDrawer: () => null }));
vi.mock("../src/components/layout/TopHeader", () => ({ TopHeader: () => null }));
vi.mock("../src/components/layout/RecoveryWarningBanner", () => ({ RecoveryWarningBanner: () => null }));
vi.mock("../src/api/notifications", () => ({
  fetchNotificationSettings: (...a: any[]) => h.settingsFetch(...a),
  saveNotificationSettings: (...a: any[]) => h.settingsSave(...a),
  fetchDailySummary: (...a: any[]) => h.summaryFetch(...a),
  setNotificationRead: (...a: any[]) => h.setReadSpy(...a),
}));

import { NotificationSettingsPanel } from "../src/components/settings/NotificationSettingsPanel";
import DailySummary from "../src/pages/DailySummary";
import { AdminLayout } from "../src/components/layout/AdminLayout";

afterEach(() => {
  cleanup(); showToast.mockClear(); settingsFetch.mockReset(); settingsSave.mockReset(); summaryFetch.mockReset(); setReadSpy.mockReset();
});

// ═════════════════════════════════════════════════════════════════════
describe("Notification settings", () => {
  const server = [
    { category: "inventory", enabled: true },
    { category: "cashier", enabled: true },
    { category: "credit", enabled: false },
    { category: "sales_purchases", enabled: true },
    { category: "security", enabled: true },
    { category: "daily_summary", enabled: true },
  ];

  it("lists the six categories; Security Alerts is locked on with no switch", async () => {
    settingsFetch.mockResolvedValue({ categories: server });
    render(<NotificationSettingsPanel />);
    const list = await screen.findByRole("list", { name: "Notification categories" });
    const names = within(list).getAllByRole("listitem").map((li) => li.textContent);
    expect(names).toHaveLength(6);
    expect(within(list).getByText("Always on")).toBeTruthy();
    expect(within(list).getByText("Critical security alerts can't be turned off.")).toBeTruthy();
    // Five switches, none for Security Alerts.
    expect(within(list).getAllByRole("switch")).toHaveLength(5);
    expect(screen.getByText(/kept for 90 days/)).toBeTruthy();
  });

  it("Save is disabled until something changes, then saves with Security forced on", async () => {
    settingsFetch.mockResolvedValue({ categories: server.map((c) => (c.category === "security" ? { ...c, enabled: false } : c)) });
    settingsSave.mockImplementation(async (v: any) => v);
    const user = userEvent.setup();
    render(<NotificationSettingsPanel />);
    await screen.findByRole("list", { name: "Notification categories" });
    const save = screen.getByRole("button", { name: "Save Changes" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    await user.click(screen.getByRole("switch", { name: "Inventory Alerts" }));
    expect(save.disabled).toBe(false);
    await user.click(save);
    await waitFor(() => expect(settingsSave).toHaveBeenCalledTimes(1));
    const sent = settingsSave.mock.calls[0][0].categories;
    expect(sent.find((c: any) => c.category === "inventory").enabled).toBe(false);
    expect(sent.find((c: any) => c.category === "security").enabled).toBe(true);
    expect(showToast).toHaveBeenCalledWith("Notification settings saved.");
  });

  it("keeps the admin's unsaved choices when saving fails", async () => {
    settingsFetch.mockResolvedValue({ categories: server });
    settingsSave.mockRejectedValue({ status: 500, message: "Save failed on server" });
    const user = userEvent.setup();
    render(<NotificationSettingsPanel />);
    await screen.findByRole("list", { name: "Notification categories" });
    await user.click(screen.getByRole("switch", { name: "Cashier Activity" }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Save failed on server")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Cashier Activity" }).getAttribute("aria-checked")).toBe("false");
    expect((screen.getByRole("button", { name: "Save Changes" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows an error with retry when settings cannot be loaded", async () => {
    settingsFetch.mockRejectedValueOnce({ status: 500, message: "Settings down" }).mockResolvedValueOnce({ categories: server });
    const user = userEvent.setup();
    render(<NotificationSettingsPanel />);
    expect(await screen.findByText("Settings down")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await screen.findByRole("list", { name: "Notification categories" })).toBeTruthy();
  });

  it("shows an extra category the backend adds later", async () => {
    settingsFetch.mockResolvedValue({ categories: [...server, { category: "stock_transfer", enabled: true }] });
    render(<NotificationSettingsPanel />);
    expect(await screen.findByRole("switch", { name: "Stock transfer" })).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════════════════════════
describe("Daily Business Summary page", () => {
  const summary = {
    id: "2026-11-05", businessDate: "2026-11-05",
    windowStart: "2026-11-04T18:30:00Z", windowEnd: "2026-11-05T16:30:00Z", generatedAt: "2026-11-05T16:30:00Z",
    metrics: [
      { key: "sales", label: "Net sales", value: 125000, format: "currency" },
      { key: "bills", label: "Bills", value: 310, format: "count" },
    ],
    branches: [
      { branch: { id: "s1", name: "Main Shop" }, metrics: [{ key: "sales", label: "Net sales", value: 80000, format: "currency" }] },
      { branch: { id: "s2", name: "RBR Annex" }, metrics: [{ key: "sales", label: "Net sales", value: 45000, format: "currency" }] },
    ],
  };
  const renderPage = () => render(
    <MemoryRouter initialEntries={["/admin/daily-summaries/2026-11-05"]}>
      <Routes>
        <Route path="/admin/daily-summaries/:summaryId" element={<DailySummary />} />
        <Route path="/admin/notifications" element={<div>Center page</div>} />
      </Routes>
    </MemoryRouter>
  );

  it("shows the 12 AM–10 PM IST window, generation time, totals and per-branch figures", async () => {
    summaryFetch.mockResolvedValue(summary);
    renderPage();
    expect(await screen.findByText("Daily Business Summary")).toBeTruthy();
    expect(summaryFetch).toHaveBeenCalledWith("2026-11-05");
    expect(screen.getByText(/12:00 am IST/i)).toBeTruthy();   // window start in IST
    expect(screen.getByText(/10:00 pm IST/i, { selector: "p" })).toBeTruthy(); // window end / generated in IST
    expect(screen.getByText("₹1,25,000")).toBeTruthy();
    expect(screen.getByText("310")).toBeTruthy();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Main Shop")).toBeTruthy();
    expect(within(table).getByText("₹45,000")).toBeTruthy();
  });

  it("falls back to the approved window text when the API omits timestamps", async () => {
    summaryFetch.mockResolvedValue({ ...summary, windowStart: null, windowEnd: null, generatedAt: null });
    renderPage();
    expect(await screen.findByText(/12:00 AM – 10:00 PM IST/)).toBeTruthy();
  });

  it("viewing a summary never marks its notification read", async () => {
    summaryFetch.mockResolvedValue(summary);
    renderPage();
    await screen.findByText("Daily Business Summary");
    expect(setReadSpy).not.toHaveBeenCalled();
  });

  it("shows an error state with retry, then recovers", async () => {
    summaryFetch.mockRejectedValueOnce({ status: 404, message: "We couldn't find what you were looking for." }).mockResolvedValueOnce(summary);
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText("We couldn't find what you were looking for.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await screen.findByText("₹1,25,000")).toBeTruthy();
  });

  it("links back to the Notification Center", async () => {
    summaryFetch.mockResolvedValue(summary);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("link", { name: /Back to notifications/ }));
    expect(await screen.findByText("Center page")).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════════════════════════
// Notifications must stay put when the header's shop changes: the Center and
// the Summary page are shop-independent in AdminLayout (no remount, so filters
// and loaded rows survive). Ordinary shop pages still remount.
describe("AdminLayout — shop independence", () => {
  it("does not remount the Notification Center or Daily Summary on a shop switch, but still remounts shop pages", async () => {
    const mounts: Record<string, number> = {};
    const Probe = ({ name }: { name: string }) => { useEffect(() => { mounts[name] = (mounts[name] ?? 0) + 1; }, [name]); return <div>{name}</div>; };

    const tree = (path: string) => (
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="notifications" element={<Probe name="center" />} />
            <Route path="daily-summaries/:id" element={<Probe name="summary" />} />
            <Route path="products" element={<Probe name="products" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    for (const [path, name, expectedMounts] of [
      ["/admin/notifications", "center", 1], ["/admin/daily-summaries/x", "summary", 1], ["/admin/products", "products", 2],
    ] as const) {
      shop.selectedShopId = "shop-1";
      mounts[name] = 0;
      const { rerender, unmount } = render(tree(path));
      await screen.findByText(name);
      shop.selectedShopId = "shop-2";
      rerender(tree(path));
      expect(mounts[name], `${name} mount count after shop switch`).toBe(expectedMounts);
      unmount();
    }
  });
});
