// @vitest-environment jsdom
// Admin Notification Center — Phase 1: pure helpers and the API layer's
// requests. The HTTP client is replaced by a test double; the real
// api/notifications.ts runs on top of it.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("../src/api/client", () => ({ apiClient: http }));

import * as lib from "../src/lib/notifications";
import * as realApi from "../src/api/notifications";

beforeEach(() => { Object.values(http).forEach((f) => f.mockReset()); });

// ═════════════════════════════════════════════════════════════════════
describe("helpers — navigation targets", () => {
  const withTarget = (target: any) => ({ target });

  it("Daily Business Summary opens its own details page (exact record)", () => {
    expect(lib.resolveNotificationTarget(withTarget({ kind: "daily_summary", id: "2026-11-05", route: null })))
      .toEqual({ path: "/admin/daily-summaries/2026-11-05", label: "View summary", exact: true });
  });

  it("encodes the summary id so it cannot break the path", () => {
    expect(lib.resolveNotificationTarget(withTarget({ kind: "daily_summary", id: "a/b?c", route: null }))!.path)
      .toBe("/admin/daily-summaries/a%2Fb%3Fc");
  });

  it("uses a backend-supplied internal route as the exact record", () => {
    expect(lib.resolveNotificationTarget(withTarget({ kind: "bill", id: "b1", route: "/admin/history?bill=b1" })))
      .toEqual({ path: "/admin/history?bill=b1", label: "Open record", exact: true });
  });

  it.each([
    "https://evil.example/admin/x", "//evil.example", "/admin//x", "/admin/../etc", "javascript:alert(1)", "/other/page", "/admin/a b",
  ])("ignores unsafe backend route %s and falls back to the module page", (route) => {
    const r = lib.resolveNotificationTarget(withTarget({ kind: "bill", id: "b1", route }));
    expect(r).toEqual({ path: "/admin/history", label: "Open History", exact: false });
  });

  it.each([
    ["product", "/admin/inventory"], ["bill", "/admin/history"], ["purchase", "/admin/purchases"], ["credit", "/admin/credits"],
    ["customer", "/admin/customers"], ["cashier", "/admin/cashiers"], ["session", "/admin/sessions"],
    ["recovery_request", "/admin/sessions?tab=recovery"], ["expense", "/admin/expenses"],
  ])("kind %s lands on the right module page and is NOT claimed as an exact record", (kind, path) => {
    const r = lib.resolveNotificationTarget(withTarget({ kind, id: "x", route: null }))!;
    expect(r.path).toBe(path);
    expect(r.exact).toBe(false);
  });

  it("returns null when there is nothing to open", () => {
    expect(lib.resolveNotificationTarget(withTarget(null))).toBeNull();
    expect(lib.resolveNotificationTarget(withTarget({ kind: "mystery", id: "1", route: null }))).toBeNull();
    expect(lib.resolveNotificationTarget(withTarget({ kind: "daily_summary", id: null, route: null }))).toBeNull();
  });
});

describe("helpers — categories, badge, params", () => {
  it("labels the six approved categories", () => {
    expect(lib.categoryLabel("inventory")).toBe("Inventory Alerts");
    expect(lib.categoryLabel("cashier")).toBe("Cashier Activity");
    expect(lib.categoryLabel("credit")).toBe("Credit Management");
    expect(lib.categoryLabel("sales_purchases")).toBe("Sales & Purchases");
    expect(lib.categoryLabel("security")).toBe("Security Alerts");
    expect(lib.categoryLabel("daily_summary")).toBe("Daily Business Summary");
  });

  it("a category added later is shown with a readable label, not dropped", () => {
    expect(lib.categoryLabel("stock_transfer")).toBe("Stock transfer");
  });

  it("only security is locked", () => {
    expect(lib.isCategoryLocked("security")).toBe(true);
    expect(["inventory", "cashier", "credit", "sales_purchases", "daily_summary"].some(lib.isCategoryLocked)).toBe(false);
  });

  it("formats the unread badge", () => {
    expect(lib.formatUnreadBadge(0)).toBe("0");
    expect(lib.formatUnreadBadge(7)).toBe("7");
    expect(lib.formatUnreadBadge(99)).toBe("99");
    expect(lib.formatUnreadBadge(100)).toBe("99+");
  });

  it("builds list params, dropping 'all' and empty filters", () => {
    expect(lib.buildListParams({})).toEqual({ page: 1, pageSize: 15 });
    expect(lib.buildListParams({ status: "all", category: "all", branchId: "all", dateFrom: "", dateTo: "" })).toEqual({ page: 1, pageSize: 15 });
    expect(lib.buildListParams({ status: "unread", category: "credit", branchId: "s1", dateFrom: "2026-11-01", dateTo: "2026-11-07", page: 3, pageSize: 8 }))
      .toEqual({ status: "unread", category: "credit", branchId: "s1", dateFrom: "2026-11-01", dateTo: "2026-11-07", page: 3, pageSize: 8 });
  });

  it("validates date ranges", () => {
    expect(lib.isDateRangeValid("", "")).toBe(true);
    expect(lib.isDateRangeValid("2026-11-01", "")).toBe(true);
    expect(lib.isDateRangeValid("2026-11-01", "2026-11-01")).toBe(true);
    expect(lib.isDateRangeValid("2026-11-02", "2026-11-01")).toBe(false);
  });
});

describe("helpers — local list updates", () => {
  const it1 = (id: string, read: boolean) => ({ id, read } as any);
  it("applies read-state, delete, all-read and read-cleared", () => {
    const list = [it1("a", false), it1("b", true)];
    expect(lib.applyChange(list, { type: "read-state", id: "a", read: true }).map((n) => n.read)).toEqual([true, true]);
    expect(lib.applyChange(list, { type: "deleted", id: "a" }).map((n) => n.id)).toEqual(["b"]);
    expect(lib.applyChange(list, { type: "all-read" }).every((n) => n.read)).toBe(true);
    expect(lib.applyChange(list, { type: "read-cleared", deletedCount: 1 }).map((n) => n.id)).toEqual(["a"]);
  });
  it("computes the unread delta", () => {
    expect(lib.unreadDelta({ type: "read-state", id: "a", read: true }, it1("a", false))).toBe(-1);
    expect(lib.unreadDelta({ type: "read-state", id: "a", read: false }, it1("a", true))).toBe(1);
    expect(lib.unreadDelta({ type: "read-state", id: "a", read: true }, it1("a", true))).toBe(0);
    expect(lib.unreadDelta({ type: "deleted", id: "a" }, it1("a", false))).toBe(-1);
    expect(lib.unreadDelta({ type: "deleted", id: "a" }, it1("a", true))).toBe(0);
  });
});

describe("helpers — response parsing", () => {
  const good = { id: "n1", category: "credit", type: "credit.overdue", severity: "critical", title: "T", message: "M", createdAt: "2026-11-05T09:00:00Z", read: false, branch: { id: "s1", name: "Main" }, target: { kind: "credit", id: "c1" } };

  it("normalises a well-formed notification", () => {
    expect(lib.normalizeNotification(good)).toMatchObject({ id: "n1", category: "credit", severity: "critical", read: false, branch: { id: "s1", name: "Main" }, target: { kind: "credit", id: "c1", route: null } });
  });
  it("keeps an unknown category and coerces an unknown severity to info", () => {
    expect(lib.normalizeNotification({ ...good, category: "brand_new", severity: "weird" })).toMatchObject({ category: "brand_new", severity: "info" });
  });
  it.each([
    ["no id", { ...good, id: undefined }], ["no title", { ...good, title: "" }], ["bad date", { ...good, createdAt: "nope" }], ["not an object", "x"],
  ])("drops a malformed notification (%s)", (_n, raw) => {
    expect(lib.normalizeNotification(raw as any)).toBeNull();
  });
  it("accepts a bare or enveloped list and requires unreadCount", () => {
    const body = { items: [good], total: 1, page: 1, pageSize: 15, unreadCount: 4 };
    expect(lib.normalizeListResponse(body, {}).unreadCount).toBe(4);
    expect(lib.normalizeListResponse({ success: true, data: body }, {}).items).toHaveLength(1);
    expect(() => lib.normalizeListResponse({ items: [good] }, {})).toThrow();
    expect(() => lib.normalizeListResponse([good], {})).toThrow();
    expect(() => lib.normalizeListResponse(null, {})).toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════
describe("API layer — every request goes through api/notifications.ts", () => {
  it("lists with filter params", async () => {
    http.get.mockResolvedValue({ data: { success: true, data: { items: [], total: 0, unreadCount: 0 } } });
    await realApi.fetchNotifications({ status: "unread", category: "credit", branchId: "s1", page: 2 });
    expect(http.get).toHaveBeenCalledWith("/admin/notifications", { params: { status: "unread", category: "credit", branchId: "s1", page: 2, pageSize: 15 } });
  });
  it("sets read state with PATCH and an explicit body", async () => {
    http.patch.mockResolvedValue({});
    await realApi.setNotificationRead("n 1", false);
    expect(http.patch).toHaveBeenCalledWith("/admin/notifications/n%201/read", { read: false });
  });
  it("deletes one notification", async () => {
    http.delete.mockResolvedValue({});
    await realApi.deleteNotification("n1");
    expect(http.delete).toHaveBeenCalledWith("/admin/notifications/n1");
  });
  it("clears read notifications and returns the count", async () => {
    http.post.mockResolvedValue({ data: { success: true, data: { deletedCount: 7 } } });
    expect(await realApi.clearReadNotifications()).toEqual({ deletedCount: 7 });
    expect(http.post).toHaveBeenCalledWith("/admin/notifications/clear-read");
  });
  it("loads and saves settings", async () => {
    http.get.mockResolvedValue({ data: { categories: [{ category: "inventory", enabled: true }] } });
    http.put.mockResolvedValue({ data: { categories: [{ category: "inventory", enabled: false }] } });
    expect((await realApi.fetchNotificationSettings()).categories[0].enabled).toBe(true);
    expect((await realApi.saveNotificationSettings({ categories: [{ category: "inventory", enabled: false }] })).categories[0].enabled).toBe(false);
    expect(http.get).toHaveBeenCalledWith("/admin/notification-settings");
    expect(http.put).toHaveBeenCalledWith("/admin/notification-settings", { categories: [{ category: "inventory", enabled: false }] });
  });
  it("loads a daily summary by id", async () => {
    http.get.mockResolvedValue({ data: { id: "s1", businessDate: "2026-11-05", metrics: [], branches: [] } });
    expect((await realApi.fetchDailySummary("s1")).businessDate).toBe("2026-11-05");
    expect(http.get).toHaveBeenCalledWith("/admin/daily-summaries/s1");
  });
  it("propagates API failures instead of swallowing or faking success", async () => {
    http.patch.mockRejectedValue({ status: 500, message: "nope" });
    await expect(realApi.setNotificationRead("n1", true)).rejects.toMatchObject({ message: "nope" });
    http.get.mockRejectedValue({ status: null, message: "Network error." });
    await expect(realApi.fetchNotifications()).rejects.toMatchObject({ message: "Network error." });
  });
  it("rejects a response with an unexpected shape rather than showing wrong numbers", async () => {
    http.get.mockResolvedValue({ data: [{ id: "old-style-array" }] });
    await expect(realApi.fetchNotifications()).rejects.toMatchObject({ message: expect.stringContaining("unexpected format") });
  });
  it("contains no mock-data fallback: notification code never touches the mock store", () => {
    const files = ["src/api/notifications.ts", "src/context/NotificationsContext.tsx", "src/lib/notifications.ts", "src/pages/Notifications.tsx", "src/components/layout/NotificationsBell.tsx"];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/mockStore|USE_MOCK|delay\(/);
    }
    expect(readFileSync("src/api/mockStore.ts", "utf8")).not.toMatch(/notification/i);
  });
});

