// @vitest-environment jsdom
// Admin Notification Center — Phase 1 (bell + Notification Center page).
// The API module is replaced by a TEST-LEVEL fake server below; no mock data
// exists in the application itself.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const showToast = vi.fn();
vi.mock("../src/context/ToastContext", () => ({ useToast: () => ({ showToast }) }));

// The header's selected shop is "shop-2" throughout — notifications must ignore it.
vi.mock("../src/context/ShopContext", () => ({
  useShop: () => ({
    selectedShopId: "shop-2",
    availableShops: [
      { id: "shop-1", name: "Main Shop", code: "M", location: "A", current: false },
      { id: "shop-2", name: "RBR Annex", code: "R", location: "B", current: true },
    ],
  }),
}));

// ── Test-level fake server ───────────────────────────────────────────
type Item = {
  id: string; category: string; type: string; severity: "info" | "warning" | "critical";
  title: string; message: string; createdAt: string; read: boolean;
  branch: { id: string; name: string } | null;
  target: { kind: string; id: string | null; route: string | null } | null;
};

let db: Item[] = [];
let failList = 0;
let failMutations = false;
let forcedItems: Item[] | null = null;
let unreadOverride: number | null = null;

const make = (id: string, o: Partial<Item> = {}): Item => ({
  id, category: "inventory", type: "inventory.low_stock", severity: "warning",
  title: `Title ${id}`, message: `Message ${id}`, createdAt: "2026-11-05T09:00:00Z", read: false,
  branch: { id: "shop-1", name: "Main Shop" }, target: null, ...o,
});

const boom = () => ({ status: 500, message: "Server exploded" });

const fetchMock = vi.fn(async (q: any = {}) => {
  if (failList > 0) { failList--; throw boom(); }
  let rows = forcedItems ?? db;
  if (q.status === "unread") rows = rows.filter((n) => !n.read);
  if (q.status === "read") rows = rows.filter((n) => n.read);
  if (q.category && q.category !== "all") rows = rows.filter((n) => n.category === q.category);
  if (q.branchId && q.branchId !== "all") rows = rows.filter((n) => n.branch?.id === q.branchId);
  if (q.dateFrom) rows = rows.filter((n) => n.createdAt.slice(0, 10) >= q.dateFrom);
  if (q.dateTo) rows = rows.filter((n) => n.createdAt.slice(0, 10) <= q.dateTo);
  rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const page = q.page ?? 1; const size = q.pageSize ?? 15;
  return {
    items: rows.slice((page - 1) * size, page * size), total: rows.length, page, pageSize: size,
    unreadCount: unreadOverride ?? db.filter((n) => !n.read).length,
  };
});
const setReadMock = vi.fn(async (id: string, read: boolean) => {
  if (failMutations) throw boom();
  db = db.map((n) => (n.id === id ? { ...n, read } : n));
});
const deleteMock = vi.fn(async (id: string) => {
  if (failMutations) throw boom();
  db = db.filter((n) => n.id !== id);
});
const clearReadMock = vi.fn(async () => {
  if (failMutations) throw boom();
  const deletedCount = db.filter((n) => n.read).length;
  db = db.filter((n) => !n.read);
  return { deletedCount };
});
const markAllMock = vi.fn(async () => {
  if (failMutations) throw boom();
  db = db.map((n) => ({ ...n, read: true }));
});

vi.mock("../src/api/notifications", () => ({
  fetchNotifications: (...a: any[]) => (fetchMock as any)(...a),
  setNotificationRead: (...a: any[]) => (setReadMock as any)(...a),
  deleteNotification: (...a: any[]) => (deleteMock as any)(...a),
  clearReadNotifications: () => clearReadMock(),
  markAllNotificationsRead: () => markAllMock(),
}));

import { NotificationsProvider } from "../src/context/NotificationsContext";
import { NotificationsBell } from "../src/components/layout/NotificationsBell";
import Notifications from "../src/pages/Notifications";

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname}{l.search}</div>;
}

function renderApp(route = "/admin/notifications") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <NotificationsProvider>
        <NotificationsBell />
        <Where />
        <Routes>
          <Route path="/admin/notifications" element={<Notifications />} />
          <Route path="*" element={<div>elsewhere</div>} />
        </Routes>
      </NotificationsProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  db = []; failList = 0; failMutations = false; forcedItems = null; unreadOverride = null;
});
afterEach(() => {
  cleanup(); showToast.mockClear();
  fetchMock.mockClear(); setReadMock.mockClear(); deleteMock.mockClear(); clearReadMock.mockClear(); markAllMock.mockClear();
});

const bellButton = () => screen.getByRole("button", { name: /^Notifications/ });
const rows = () => screen.queryAllByTestId("notification-row");

describe("Bell — unread counter", () => {
  it("shows the server's numeric unread count, not the number of loaded rows", async () => {
    db = [make("a"), make("b")];
    unreadOverride = 12;
    renderApp();
    expect((await screen.findByTestId("unread-badge")).textContent).toBe("12");
    expect(bellButton().getAttribute("aria-label")).toBe("Notifications (12 unread)");
  });

  it("caps the badge at 99+ but keeps the exact count for assistive tech", async () => {
    db = [make("a")];
    unreadOverride = 150;
    renderApp();
    expect((await screen.findByTestId("unread-badge")).textContent).toBe("99+");
    expect(bellButton().getAttribute("aria-label")).toBe("Notifications (150 unread)");
  });

  it("shows no badge when everything is read", async () => {
    db = [make("a", { read: true })];
    renderApp();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await screen.findByRole("list", { name: "Notifications" });
    expect(screen.queryByTestId("unread-badge")).toBeNull();
  });

  it("requests notifications for ALL branches — never scoped to the selected shop", async () => {
    db = [make("a")];
    renderApp("/admin/other");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    for (const [q] of fetchMock.mock.calls) expect(q.branchId).toBeUndefined();
  });
});

describe("Bell — recent dropdown", () => {
  it("lists recent notifications and has a View all link to the Center", async () => {
    db = [make("a", { title: "Brown eggs low" }), make("b", { title: "Cashier signed up", category: "cashier" })];
    const user = userEvent.setup();
    renderApp("/admin/other");
    await screen.findByTestId("unread-badge");
    await user.click(bellButton());
    expect(await screen.findByText("Brown eggs low")).toBeTruthy();
    expect(screen.getByText("Cashier signed up")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "View all notifications" }));
    expect(screen.getByTestId("where").textContent).toBe("/admin/notifications");
  });

  it("opening a notification navigates to its record but does NOT mark it read", async () => {
    db = [make("a", { title: "Dozen sold", category: "sales_purchases", target: { kind: "bill", id: "b1", route: null } })];
    const user = userEvent.setup();
    renderApp("/admin/other");
    await screen.findByTestId("unread-badge");
    await user.click(bellButton());
    await user.click(await screen.findByRole("button", { name: /Open History: Dozen sold/ }));
    expect(screen.getByTestId("where").textContent).toBe("/admin/history");
    expect(setReadMock).not.toHaveBeenCalled();
    expect(db[0].read).toBe(false);
    expect(screen.getByTestId("unread-badge").textContent).toBe("1");
  });

  it("a notification without a target falls back to the Notification Center", async () => {
    db = [make("a", { title: "General note", target: null })];
    const user = userEvent.setup();
    renderApp("/admin/other");
    await screen.findByTestId("unread-badge");
    await user.click(bellButton());
    await user.click(await screen.findByRole("button", { name: /Open notifications: General note/ }));
    expect(screen.getByTestId("where").textContent).toBe("/admin/notifications");
    expect(setReadMock).not.toHaveBeenCalled();
  });

  it("read state changes only through the manual toggle, and the counter follows", async () => {
    db = [make("a", { title: "Low stock" }), make("b", { title: "Credit due", read: true })];
    const user = userEvent.setup();
    renderApp("/admin/other");
    await screen.findByTestId("unread-badge");
    await user.click(bellButton());

    await user.click(await screen.findByRole("button", { name: "Mark as read: Low stock" }));
    await waitFor(() => expect(setReadMock).toHaveBeenCalledWith("a", true));
    await waitFor(() => expect(screen.queryByTestId("unread-badge")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Mark as unread: Credit due" }));
    await waitFor(() => expect(setReadMock).toHaveBeenCalledWith("b", false));
    await waitFor(() => expect(screen.getByTestId("unread-badge").textContent).toBe("1"));
  });

  it("keeps the list and counter unchanged when marking read fails", async () => {
    db = [make("a", { title: "Low stock" })];
    const user = userEvent.setup();
    renderApp("/admin/other");
    await screen.findByTestId("unread-badge");
    await user.click(bellButton());
    failMutations = true;
    await user.click(await screen.findByRole("button", { name: "Mark as read: Low stock" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Server exploded", "error"));
    expect(screen.getByText("Low stock")).toBeTruthy();
    expect(screen.getByTestId("unread-badge").textContent).toBe("1");
    expect(screen.getByRole("button", { name: "Mark as read: Low stock" })).toBeTruthy();
  });

  it("shows an empty state", async () => {
    const user = userEvent.setup();
    renderApp("/admin/other");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await user.click(bellButton());
    expect(await screen.findByText("You're all caught up.")).toBeTruthy();
  });

  it("shows an error state with retry, then recovers", async () => {
    db = [make("a", { title: "Low stock" })];
    failList = 1;
    const user = userEvent.setup();
    renderApp("/admin/other");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(bellButton());
    expect(await screen.findByText("Couldn't load notifications")).toBeTruthy();
    expect(screen.getByText("Server exploded")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await screen.findByText("Low stock")).toBeTruthy();
  });

  it("closes on Escape", async () => {
    db = [make("a")];
    const user = userEvent.setup();
    renderApp("/admin/other");
    await screen.findByTestId("unread-badge");
    await user.click(bellButton());
    await screen.findByText("View all notifications");
    await user.keyboard("{Escape}");
    expect(screen.queryByText("View all notifications")).toBeNull();
  });
});

describe("Notification Center — list and filters", () => {
  it("shows notifications from every branch even though the header shop is shop-2", async () => {
    db = [
      make("a", { title: "Main shop alert", branch: { id: "shop-1", name: "Main Shop" } }),
      make("b", { title: "Annex alert", branch: { id: "shop-2", name: "RBR Annex" } }),
      make("c", { title: "Company wide", branch: null, category: "daily_summary" }),
    ];
    renderApp();
    expect(await screen.findByText("Main shop alert")).toBeTruthy();
    expect(screen.getByText("Annex alert")).toBeTruthy();
    expect(screen.getByText("Company wide")).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "Branch" }) as HTMLSelectElement).value).toBe("all");
    // The page's own request defaults to "all branches"; the header's selected shop is never sent.
    const pageCall = fetchMock.mock.calls.find(([q]) => q.pageSize === 15)!;
    expect(pageCall[0].branchId).toBe("all");
    for (const [q] of fetchMock.mock.calls) expect(q.branchId).not.toBe("shop-2");
  });

  it("Unread tab asks for unread only and hides read rows", async () => {
    db = [make("a", { title: "Unread one" }), make("b", { title: "Read one", read: true })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Read one");
    await user.click(screen.getByRole("tab", { name: "Unread" }));
    await waitFor(() => expect(screen.queryByText("Read one")).toBeNull());
    expect(screen.getByText("Unread one")).toBeTruthy();
    expect(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0].status).toBe("unread");
    await user.click(screen.getByRole("tab", { name: "All" }));
    expect(await screen.findByText("Read one")).toBeTruthy();
  });

  it("offers all six categories and filters by the chosen one", async () => {
    db = [make("a", { title: "Stock item" }), make("b", { title: "Cashier item", category: "cashier" })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Stock item");
    const select = screen.getByRole("combobox", { name: "Category" });
    const labels = within(select).getAllByRole("option").map((o) => o.textContent);
    expect(labels).toEqual([
      "All categories", "Inventory Alerts", "Cashier Activity", "Credit Management",
      "Sales & Purchases", "Security Alerts", "Daily Business Summary",
    ]);
    await user.selectOptions(select, "cashier");
    await waitFor(() => expect(screen.queryByText("Stock item")).toBeNull());
    expect(screen.getByText("Cashier item")).toBeTruthy();
    expect(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0].category).toBe("cashier");
  });

  it("filters by branch using the shop list, as a filter only", async () => {
    db = [
      make("a", { title: "Main item", branch: { id: "shop-1", name: "Main Shop" } }),
      make("b", { title: "Annex item", branch: { id: "shop-2", name: "RBR Annex" } }),
    ];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Main item");
    await user.selectOptions(screen.getByRole("combobox", { name: "Branch" }), "shop-1");
    await waitFor(() => expect(screen.queryByText("Annex item")).toBeNull());
    expect(screen.getByText("Main item")).toBeTruthy();
    // Back to all branches: nothing was ever hidden by access rules.
    await user.selectOptions(screen.getByRole("combobox", { name: "Branch" }), "all");
    expect(await screen.findByText("Annex item")).toBeTruthy();
  });

  it("filters by date range", async () => {
    db = [
      make("a", { title: "Old", createdAt: "2026-10-01T09:00:00Z" }),
      make("b", { title: "New", createdAt: "2026-11-05T09:00:00Z" }),
    ];
    renderApp();
    await screen.findByText("Old");
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-11-01" } });
    await waitFor(() => expect(screen.queryByText("Old")).toBeNull());
    expect(screen.getByText("New")).toBeTruthy();
    const last = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0];
    expect(last.dateFrom).toBe("2026-11-01");
  });

  it("does not request anything for an inverted date range and says why", async () => {
    db = [make("a")];
    renderApp();
    await screen.findByText("Title a");
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-11-05" } });
    await screen.findByText("Title a");
    fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-11-01" } });
    expect(await screen.findByText("The start date must be on or before the end date.")).toBeTruthy();
    // Wait out any in-flight work, then confirm no request ever carried the invalid pair.
    await new Promise((r) => setTimeout(r, 50));
    const sentInverted = fetchMock.mock.calls.some(([q]) => q.dateFrom && q.dateTo && q.dateFrom > q.dateTo);
    expect(sentInverted).toBe(false);
    expect(fetchMock.mock.calls.some(([q]) => q.dateFrom === "2026-11-05" && q.dateTo === "2026-11-01")).toBe(false);
  });

  it("empty state differs with and without filters, and Reset filters restores the list", async () => {
    db = [make("a", { title: "Stock item" })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Stock item");
    await user.selectOptions(screen.getByRole("combobox", { name: "Category" }), "security");
    expect(await screen.findByText("No notifications match these filters")).toBeTruthy();
    await user.click(screen.getAllByRole("button", { name: "Reset filters" })[0]);
    expect(await screen.findByText("Stock item")).toBeTruthy();
  });

  it("empty state with no filters", async () => {
    renderApp();
    expect(await screen.findByText("No notifications yet")).toBeTruthy();
  });

  it("paginates and returns to page 1 when a filter changes", async () => {
    db = Array.from({ length: 20 }, (_, i) => make(`n${i}`, { createdAt: `2026-11-05T${String(10 + (i % 10)).padStart(2, "0")}:00:${String(i).padStart(2, "0")}Z` }));
    const user = userEvent.setup();
    renderApp();
    await waitFor(() => expect(rows().length).toBe(15));
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(rows().length).toBe(5));
    await user.click(screen.getByRole("tab", { name: "Unread" }));
    await waitFor(() => expect(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0]).toMatchObject({ status: "unread", page: 1 }));
  });
});

describe("Notification Center — states and failures", () => {
  it("shows an error state, retries, and recovers", async () => {
    db = [make("a", { title: "Recovered" })];
    failList = 1;
    const user = userEvent.setup();
    renderApp();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("Server exploded")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await screen.findByText("Recovered")).toBeTruthy();
  });

  it("a failed manual Refresh keeps the rows already on screen", async () => {
    db = [make("a", { title: "Still here" })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Still here");
    failList = 1;
    await user.click(screen.getByRole("button", { name: "Refresh notifications" }));
    expect(await screen.findByText(/Server exploded/)).toBeTruthy();
    expect(screen.getByText("Still here")).toBeTruthy();
  });

  it("shows a loading state before data arrives", async () => {
    db = [make("a")];
    renderApp();
    expect(screen.getAllByRole("status", { name: "Loading notifications" }).length).toBeGreaterThan(0);
    await screen.findByText("Title a");
  });
});

describe("Notification Center — manual read / unread", () => {
  it("toggles one notification read then unread, updating the count", async () => {
    db = [make("a", { title: "Low stock" }), make("b", { title: "Other" })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Low stock");
    expect(screen.getByText(/2 unread/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Mark as read: Low stock" }));
    await waitFor(() => expect(setReadMock).toHaveBeenCalledWith("a", true));
    await waitFor(() => expect(screen.getByText(/1 unread/)).toBeTruthy());
    expect(rows().find((r) => r.textContent?.includes("Low stock"))!.getAttribute("data-unread")).toBe("false");

    await user.click(screen.getByRole("button", { name: "Mark as unread: Low stock" }));
    await waitFor(() => expect(setReadMock).toHaveBeenCalledWith("a", false));
    await waitFor(() => expect(screen.getByText(/2 unread/)).toBeTruthy());
  });

  it("following the related-record link does not mark the notification read", async () => {
    db = [make("a", { title: "Credit overdue", category: "credit", target: { kind: "credit", id: "c9", route: null } })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Credit overdue");
    await user.click(screen.getByRole("link", { name: /Open Credits: Credit overdue/ }));
    expect(screen.getByTestId("where").textContent).toBe("/admin/credits");
    expect(setReadMock).not.toHaveBeenCalled();
    expect(db[0].read).toBe(false);
  });

  it("the bell and the page stay in sync", async () => {
    db = [make("a", { title: "Low stock" })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Low stock");
    await user.click(screen.getByRole("button", { name: "Mark as read: Low stock" }));
    await waitFor(() => expect(screen.queryByTestId("unread-badge")).toBeNull());
  });

  it("failure leaves the row, state and count unchanged", async () => {
    db = [make("a", { title: "Low stock" })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Low stock");
    failMutations = true;
    await user.click(screen.getByRole("button", { name: "Mark as read: Low stock" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Server exploded", "error"));
    expect(rows()[0].getAttribute("data-unread")).toBe("true");
    expect(screen.getByTestId("unread-badge").textContent).toBe("1");
  });

  it("Mark all read applies to every notification after the server confirms", async () => {
    db = [make("a"), make("b")];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Title a");
    await user.click(screen.getByRole("button", { name: /Mark all read/ }));
    await waitFor(() => expect(screen.queryByTestId("unread-badge")).toBeNull());
    expect(rows().every((r) => r.getAttribute("data-unread") === "false")).toBe(true);
  });

  it("Mark all read failure changes nothing", async () => {
    db = [make("a")];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Title a");
    failMutations = true;
    await user.click(screen.getByRole("button", { name: /Mark all read/ }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Server exploded", "error"));
    expect(screen.getByTestId("unread-badge").textContent).toBe("1");
  });
});

describe("Notification Center — deletion", () => {
  it("asks first, says the business record is untouched, then removes only the notification", async () => {
    db = [make("a", { title: "Delete me" }), make("b", { title: "Keep me" })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Delete me");
    await user.click(screen.getByRole("button", { name: "Delete notification: Delete me" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/business record is not changed/)).toBeTruthy();
    expect(deleteMock).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("a"));
    await waitFor(() => expect(screen.queryByText("Delete me")).toBeNull());
    expect(screen.getByText("Keep me")).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(screen.getByTestId("unread-badge").textContent).toBe("1"));
  });

  it("cancel deletes nothing", async () => {
    db = [make("a", { title: "Delete me" })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Delete me");
    await user.click(screen.getByRole("button", { name: "Delete notification: Delete me" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(deleteMock).not.toHaveBeenCalled();
    expect(screen.getByText("Delete me")).toBeTruthy();
  });

  it("a failed delete keeps the row and the dialog open for another try", async () => {
    db = [make("a", { title: "Delete me" })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Delete me");
    failMutations = true;
    await user.click(screen.getByRole("button", { name: "Delete notification: Delete me" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Server exploded", "error"));
    expect(screen.getByText("Delete me")).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByTestId("unread-badge").textContent).toBe("1");
  });

  it("a deleted notification does not reappear when a later sync still returns it", async () => {
    const doomed = make("a", { title: "Delete me" });
    db = [doomed, make("b", { title: "Keep me" })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Delete me");
    await user.click(screen.getByRole("button", { name: "Delete notification: Delete me" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByText("Delete me")).toBeNull());

    // A stale/lagging sync that still contains the deleted row:
    forcedItems = [doomed, make("b", { title: "Keep me" })];
    await user.click(screen.getByRole("button", { name: "Refresh notifications" }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(3));
    await screen.findByText("Keep me");
    expect(screen.queryByText("Delete me")).toBeNull();
  });
});

describe("Notification Center — Clear all read", () => {
  it("confirms, deletes only read notifications, and keeps unread ones", async () => {
    db = [make("a", { title: "Unread keep" }), make("b", { title: "Read gone", read: true }), make("c", { title: "Read gone 2", read: true })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Read gone");
    await user.click(screen.getByRole("button", { name: /Clear all read/ }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/Unread notifications and all business records stay as they are/)).toBeTruthy();
    expect(clearReadMock).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Clear read" }));
    await waitFor(() => expect(clearReadMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("Read gone")).toBeNull());
    expect(screen.queryByText("Read gone 2")).toBeNull();
    expect(screen.getByText("Unread keep")).toBeTruthy();
    expect(screen.getByTestId("unread-badge").textContent).toBe("1");
  });

  it("failure keeps every notification and the dialog", async () => {
    db = [make("a", { title: "Read stays", read: true })];
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Read stays");
    failMutations = true;
    await user.click(screen.getByRole("button", { name: /Clear all read/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Clear read" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Server exploded", "error"));
    expect(screen.getByText("Read stays")).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });
});
