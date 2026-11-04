// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const showToast = vi.fn();
vi.mock("../src/context/ToastContext", () => ({ useToast: () => ({ showToast }) }));
const shops = [{ id: "s1", name: "Branch One", code: "B1", location: "One", current: true }];
vi.mock("../src/context/ShopContext", () => ({
  useShop: () => ({ availableShops: shops, selectedShop: shops[0], selectedShopId: "s1", refreshShops: vi.fn() }),
}));
vi.mock("../src/api/cashiers", () => ({ fetchCashiers: vi.fn(async () => []) }));

import { apiClient } from "../src/api/client";
import * as inventoryApi from "../src/api/inventory";
import { useBranchProductStock } from "../src/hooks/useBranchProductStock";
import { useRequestGuard } from "../src/hooks/useRequestGuard";
import { validateAdjustment } from "../src/components/inventory/adjustmentRules";
import { getStockRecordState } from "../src/lib/stockRecord";
import { friendlyError } from "../src/lib/apiMessages";
import { StockAdjustmentDrawer } from "../src/components/inventory/StockAdjustmentDrawer";
import { AdjustStockModal } from "../src/components/products/AdjustStockModal";
import Inventory from "../src/pages/Inventory";

const mk = (id: string, over: any = {}): any => ({
  id, name: `Prod ${id}`, category: "Eggs", sellingPrice: 100, stock: 5, unit: "tray",
  lowStockThreshold: 2, status: "active", assigned: true, inventoryRecorded: true,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", ...over,
});
const paged = (items: any[], total = items.length, page = 1, pageSize = 8) => ({ items, total, page, pageSize });
const move = (id: string, over: any = {}): any => ({
  id, date: "2026-02-01T10:00:00Z", productId: "p1", productName: "Prod p1", type: "ADJUSTMENT",
  quantity: -2, previousStock: 5, newStock: 3, reason: "Breakage / damage — dropped tray", user: "Central Admin", ...over,
});
const kpis = { totalItems: 3, lowStock: 1, outOfStock: 1, stockValue: 1000 };

interface Routes {
  inventory?: any[]; adjustable?: any[]; movements?: (p: any) => any; byCashier?: any; categories?: any[];
}
/** Routes GET calls by URL; records every call so tests can assert on them. */
function routeGet(r: Routes = {}) {
  return vi.spyOn(apiClient, "get").mockImplementation(async (url: string, cfg?: any) => {
    const params = cfg?.params ?? {};
    if (url === "/admin/inventory/kpis") return { data: kpis };
    if (url === "/admin/inventory") return { data: paged(r.inventory ?? [], r.inventory?.length ?? 0, params.page ?? 1, params.pageSize ?? 8) };
    if (url === "/admin/inventory/movements") return { data: r.movements ? r.movements(params) : paged([], 0) };
    if (url === "/admin/inventory/alerts") return { data: [] };
    if (url === "/admin/products") {
      if (params.assignment === "all") return { data: paged(r.categories ?? [mk("c1", { category: "Eggs" }), mk("c2", { category: "Dairy" })], 2, 1, 200) };
      const items = r.adjustable ?? [mk("p1")];
      return { data: paged(items, items.length, params.page ?? 1, params.pageSize ?? 200) };
    }
    if (/^\/admin\/inventory\/[^/]+\/by-cashier$/.test(url)) {
      return { data: r.byCashier ?? { productId: "p1", productName: "Prod p1", totalStock: 5, branchStock: 5, inventoryRecorded: true, byCashier: [] } };
    }
    throw new Error(`unexpected GET ${url}`);
  });
}
/** Current Stock and New Stock Preview both read "N tray(s)" once loaded. */
const stockShown = (n: number) => screen.findAllByText(new RegExp(`^${n} tray\\(s\\)$`));
const called = (spy: any, url: string) => spy.mock.calls.filter((c: any[]) => c[0] === url);

afterEach(() => { cleanup(); vi.restoreAllMocks(); showToast.mockReset(); });

// ── pure rules ──────────────────────────────────────────────────────────
describe("validateAdjustment", () => {
  const base = { productId: "p1", adjustmentType: "add" as const, quantity: 2 as number | "", reason: "Breakage / damage", notes: "", currentStock: 5, stockLoading: false, unit: "tray" };
  it("accepts a valid adjustment", () => expect(validateAdjustment(base)).toBeNull());
  it("requires a reason (none is pre-selected)", () => expect(validateAdjustment({ ...base, reason: "" })).toMatch(/reason/i));
  it("requires a non-empty note when the reason is Other", () => {
    expect(validateAdjustment({ ...base, reason: "Other", notes: "   " })).toMatch(/Other/);
    expect(validateAdjustment({ ...base, reason: "Other", notes: "Found in cold store" })).toBeNull();
  });
  it("rejects zero, negative, blank and fractional quantities", () => {
    for (const q of [0, -1, "" as const]) expect(validateAdjustment({ ...base, quantity: q })).toMatch(/greater than zero/);
    expect(validateAdjustment({ ...base, quantity: 1.5 })).toMatch(/whole number/);
  });
  it("blocks removing more than the branch holds, and waits while stock is loading", () => {
    expect(validateAdjustment({ ...base, adjustmentType: "remove", quantity: 6 })).toMatch(/only has 5/);
    expect(validateAdjustment({ ...base, adjustmentType: "remove", quantity: 5 })).toBeNull();
    expect(validateAdjustment({ ...base, adjustmentType: "remove", currentStock: null, stockLoading: true })).toMatch(/Still loading/);
  });
  it("leaves an unreadable stock to the backend rather than blocking", () => {
    expect(validateAdjustment({ ...base, adjustmentType: "remove", quantity: 99, currentStock: null })).toBeNull();
  });
});

describe("getStockRecordState — missing record vs genuine zero", () => {
  it("tells the two zeros apart using only inventoryRecorded", () => {
    expect(getStockRecordState({ stock: 0, inventoryRecorded: true })).toBe("zero");
    expect(getStockRecordState({ stock: 0, inventoryRecorded: false })).toBe("none");
  });
  it("never guesses: an absent flag is unknown, and stock > 0 is simply stocked", () => {
    expect(getStockRecordState({ stock: 0 })).toBe("unknown");
    expect(getStockRecordState({ stock: 4, inventoryRecorded: true })).toBe("stocked");
    expect(getStockRecordState({ stock: 4, inventoryRecorded: false })).toBe("stocked"); // pre-cutover legacy stock
  });
});

describe("friendlyError", () => {
  it("words a 403 as a permission message and keeps the backend's stock message", () => {
    expect(friendlyError({ status: 403, message: "x" }, "f")).toMatch(/central administrator/i);
    expect(friendlyError({ status: 409, code: "INSUFFICIENT_STOCK", message: 'Insufficient stock for "Eggs". Available: 2.' }, "f")).toBe('Insufficient stock for "Eggs". Available: 2.');
    expect(friendlyError({ status: 500 }, "fallback")).toBe("fallback");
  });
});

describe("useRequestGuard", () => {
  it("only the latest ticket is current, and nothing is current after unmount", () => {
    const { result, unmount } = renderHook(() => useRequestGuard());
    const a = result.current.begin();
    const b = result.current.begin();
    expect(result.current.isCurrent(a)).toBe(false);
    expect(result.current.isCurrent(b)).toBe(true);
    unmount();
    expect(result.current.isCurrent(b)).toBe(false);
  });
});

// ── API / hook ──────────────────────────────────────────────────────────
describe("fetchAdjustableProducts", () => {
  it("walks pages of at most 200 (the backend cap) so products beyond 200 are included", async () => {
    const get = vi.spyOn(apiClient, "get")
      .mockResolvedValueOnce({ data: paged([mk("1"), mk("2")], 450, 1, 200) })
      .mockResolvedValueOnce({ data: paged([mk("3")], 450, 2, 200) })
      .mockResolvedValueOnce({ data: paged([mk("4")], 450, 3, 200) });
    const all = await inventoryApi.fetchAdjustableProducts();
    expect(all.map((p) => p.id)).toEqual(["1", "2", "3", "4"]);
    expect(get).toHaveBeenCalledTimes(3);
    for (const c of get.mock.calls) expect((c[1] as any).params.pageSize).toBeLessThanOrEqual(200);
    expect(get).toHaveBeenNthCalledWith(1, "/admin/products", { params: { assignment: "assigned", page: 1, pageSize: 200 } });
  });
});

describe("useBranchProductStock", () => {
  it("reads branchStock — never a per-cashier row", async () => {
    routeGet({ byCashier: { productId: "p1", productName: "x", totalStock: 7, branchStock: 7, inventoryRecorded: false, byCashier: [{ cashierId: "c", cashierName: "C", quantity: 100 }] } });
    const { result } = renderHook(() => useBranchProductStock("p1"));
    await waitFor(() => expect(result.current.quantity).toBe(7));
    expect(result.current.inventoryRecorded).toBe(false);
  });
  it("falls back to totalStock when branchStock is absent", async () => {
    routeGet({ byCashier: { productId: "p1", productName: "x", totalStock: 9, byCashier: [] } });
    const { result } = renderHook(() => useBranchProductStock("p1"));
    await waitFor(() => expect(result.current.quantity).toBe(9));
  });
  it("reports a failed read as unknown, not as 0", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValue({ status: 500, message: "boom" });
    const { result } = renderHook(() => useBranchProductStock("p1"));
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.quantity).toBeNull();
  });
});

// ── Drawer ──────────────────────────────────────────────────────────────
describe("StockAdjustmentDrawer", () => {
  const open = (over: any = {}) => {
    const onSubmit = over.onSubmit ?? vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const utils = render(<StockAdjustmentDrawer isOpen onClose={onClose} onSubmit={onSubmit} products={over.products ?? [mk("p1")]} presetProduct={over.preset ?? null} />);
    return { onSubmit, onClose, ...utils };
  };
  const review = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: /Review Adjustment/i }));

  it("pre-selects no reason and refuses to review without one; nothing is sent", async () => {
    routeGet();
    const user = userEvent.setup();
    const { onSubmit } = open({ preset: mk("p1") });
    expect((screen.getByLabelText(/^Reason/) as HTMLSelectElement).value).toBe("");
    await user.type(screen.getByLabelText(/^Quantity/), "2");
    await review(user);
    expect(await screen.findByText(/Choose a reason/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText(/Confirm stock adjustment/i)).toBeNull();
  });

  it("'Other' needs a non-empty note", async () => {
    routeGet();
    const user = userEvent.setup();
    const { onSubmit } = open({ preset: mk("p1") });
    await user.type(screen.getByLabelText(/^Quantity/), "2");
    await user.selectOptions(screen.getByLabelText(/^Reason/), "Other");
    await review(user);
    expect(await screen.findByText(/“Other” needs an explanation/)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks removing more than this branch holds, without sending a request", async () => {
    routeGet({ byCashier: { productId: "p1", productName: "x", totalStock: 3, branchStock: 3, inventoryRecorded: true, byCashier: [] } });
    const user = userEvent.setup();
    const { onSubmit } = open({ preset: mk("p1") });
    await stockShown(3);
    await user.selectOptions(screen.getByLabelText(/Adjustment Type/), "remove");
    await user.type(screen.getByLabelText(/^Quantity/), "4");
    await user.selectOptions(screen.getByLabelText(/^Reason/), "Expired / spoiled");
    await review(user);
    expect(await screen.findByText(/only has 3 tray\(s\) in stock/)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("opens on the preset product even when the fetched list is empty", async () => {
    routeGet();
    open({ products: [], preset: mk("p1") });
    expect((screen.getByLabelText(/^Product/) as HTMLSelectElement).value).toBe("p1");
    await stockShown(5);
  });

  it("explains a branch with no inventory record (vs a plain 0)", async () => {
    routeGet({ byCashier: { productId: "p1", productName: "x", totalStock: 0, branchStock: 0, inventoryRecorded: false, byCashier: [] } });
    open({ preset: mk("p1", { stock: 0, inventoryRecorded: false }) });
    expect(await screen.findByText(/No inventory record yet/)).toBeTruthy();
  });

  it("does not claim 'no record' for a genuine zero", async () => {
    routeGet({ byCashier: { productId: "p1", productName: "x", totalStock: 0, branchStock: 0, inventoryRecorded: true, byCashier: [] } });
    open({ preset: mk("p1", { stock: 0, inventoryRecorded: true }) });
    await stockShown(0);
    expect(screen.queryByText(/No inventory record yet/)).toBeNull();
  });

  it("confirms, then sends exactly what was entered", async () => {
    routeGet();
    const user = userEvent.setup();
    const { onSubmit, onClose } = open({ preset: mk("p1") });
    await stockShown(5);
    await user.selectOptions(screen.getByLabelText(/Adjustment Type/), "remove");
    await user.type(screen.getByLabelText(/^Quantity/), "2");
    await user.selectOptions(screen.getByLabelText(/^Reason/), "Breakage / damage");
    await user.type(screen.getByLabelText(/^Notes/), "  dropped tray ");
    await review(user);
    expect(onSubmit).not.toHaveBeenCalled(); // confirmation comes first
    await user.click(await screen.findByRole("button", { name: /Confirm Adjustment/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ productId: "p1", adjustmentType: "remove", quantity: 2, reason: "Breakage / damage", notes: "dropped tray" });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("ignores a second click while the first submit is in flight", async () => {
    routeGet();
    let release!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((res) => { release = res; }));
    const user = userEvent.setup();
    open({ preset: mk("p1"), onSubmit });
    await stockShown(5);
    await user.type(screen.getByLabelText(/^Quantity/), "1");
    await user.selectOptions(screen.getByLabelText(/^Reason/), "Stock count correction");
    await review(user);
    const confirm = await screen.findByRole("button", { name: /Confirm Adjustment/i });
    await user.click(confirm);
    await user.click(confirm);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    release();
  });

  it.each([
    ["a 403", { status: 403, message: "Only the central administrator can adjust stock." }, /central administrator/i],
    ["INSUFFICIENT_STOCK (409)", { status: 409, code: "INSUFFICIENT_STOCK", message: 'Insufficient stock for "Prod p1". Available: 1.' }, /Available: 1/],
  ])("shows %s plainly and keeps the drawer open", async (_n, err, text) => {
    routeGet();
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(err);
    const { onClose } = open({ preset: mk("p1"), onSubmit });
    await stockShown(5);
    await user.type(screen.getByLabelText(/^Quantity/), "1");
    await user.selectOptions(screen.getByLabelText(/^Reason/), "Stock count correction");
    await review(user);
    await user.click(await screen.findByRole("button", { name: /Confirm Adjustment/i }));
    expect((await screen.findAllByRole("alert")).some((a) => text.test(a.textContent ?? ""))).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("AdjustStockModal (Products page)", () => {
  it("shares the rules: no pre-selected reason, and Other needs a note", async () => {
    routeGet();
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AdjustStockModal isOpen onClose={() => {}} onSubmit={onSubmit} product={mk("p1")} />);
    expect((screen.getByLabelText(/^Reason/) as HTMLSelectElement).value).toBe("");
    await screen.findByText(/5 tray\(s\) at Branch One/);
    await user.type(screen.getByLabelText(/Quantity/), "1");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/Choose a reason/i)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText(/^Reason/), "Other");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/needs an explanation/)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// ── Page ────────────────────────────────────────────────────────────────
describe("Inventory page — Stage 3.3", () => {
  const inv = [
    mk("p1", { name: "Egg Tray", stock: 12 }),
    mk("p2", { name: "Never Stocked", stock: 0, inventoryRecorded: false }),
    mk("p3", { name: "Counted Zero", stock: 0, inventoryRecorded: true }),
  ];

  it("names the selected branch and lists its stock from /admin/inventory only", async () => {
    const get = routeGet({ inventory: inv });
    render(<Inventory />);
    expect(await screen.findByText(/adjustments at Branch One/)).toBeTruthy();
    await screen.findAllByText("Egg Tray");
    const urls = get.mock.calls.map((c) => c[0] as string);
    expect(urls.some((u) => /cashier-inventory|cashierInventory/i.test(u))).toBe(false);
    expect(urls.filter((u) => u.endsWith("/by-cashier"))).toHaveLength(0); // not needed to render the list
  });

  it("marks only the never-stocked product 'No record'; a genuine zero is a plain 0", async () => {
    routeGet({ inventory: inv });
    render(<Inventory />);
    await screen.findAllByText("Never Stocked");
    const rowOf = (name: string) => screen.getAllByText(name).map((el) => el.closest("tr")).find(Boolean) as HTMLElement;
    expect(within(rowOf("Never Stocked")).getByText("No record")).toBeTruthy();
    expect(within(rowOf("Counted Zero")).queryByText("No record")).toBeNull();
    expect(within(rowOf("Egg Tray")).queryByText("No record")).toBeNull();
  });

  it("loads categories from the real products API (not the demo store)", async () => {
    const get = routeGet({ inventory: inv });
    render(<Inventory />);
    await waitFor(() => expect(get.mock.calls.some((c) => c[0] === "/admin/products" && (c[1] as any)?.params?.assignment === "all")).toBe(true));
    expect(await screen.findByRole("option", { name: "Dairy" })).toBeTruthy();
  });

  it("loads the drawer's product list in pages of ≤ 200 (never 500)", async () => {
    const get = routeGet({ inventory: inv });
    render(<Inventory />);
    await waitFor(() => expect(get.mock.calls.some((c) => c[0] === "/admin/products" && (c[1] as any)?.params?.assignment === "assigned")).toBe(true));
    for (const c of get.mock.calls.filter((c) => c[0] === "/admin/products")) expect((c[1] as any).params.pageSize).toBeLessThanOrEqual(200);
  });

  it("row 'Adjust' opens the drawer on that product (and not the view drawer)", async () => {
    routeGet({ inventory: inv, adjustable: [mk("p1", { name: "Egg Tray" }), mk("p2", { name: "Never Stocked", stock: 0, inventoryRecorded: false })] });
    const user = userEvent.setup();
    render(<Inventory />);
    await screen.findAllByText("Never Stocked");
    await user.click(screen.getAllByRole("button", { name: "Adjust stock for Never Stocked" })[0]);
    const select = (await screen.findByLabelText(/^Product/)) as HTMLSelectElement;
    expect(select.value).toBe("p2");
    expect(screen.getByText("New Stock Adjustment")).toBeTruthy();
  });

  it("after a successful adjustment, history and KPIs refetch and a success toast shows", async () => {
    let movementCalls = 0;
    const get = routeGet({
      inventory: inv,
      movements: (p) => { movementCalls++; return paged([move("m1")], 1, p.page ?? 1, p.pageSize ?? 8); },
    });
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: mk("p1") });
    const user = userEvent.setup();
    render(<Inventory />);
    await user.click(screen.getByRole("tab", { name: "Adjustments" }));
    await screen.findAllByText("5 → 3");
    const before = movementCalls;
    const kpiBefore = called(get, "/admin/inventory/kpis").length;

    await user.click(screen.getByRole("button", { name: /New Adjustment/i }));
    await user.selectOptions(await screen.findByLabelText(/^Product/), "p1");
    await stockShown(5);
    await user.type(screen.getByLabelText(/^Quantity/), "1");
    await user.selectOptions(screen.getByLabelText(/^Reason/), "Stock count correction");
    await user.click(screen.getByRole("button", { name: /Review Adjustment/i }));
    await user.click(await screen.findByRole("button", { name: /Confirm Adjustment/i }));

    await waitFor(() => expect(post).toHaveBeenCalledWith("/admin/inventory/adjustments", expect.objectContaining({ productId: "p1", adjustmentType: "add", quantity: 1, reason: "Stock count correction" })));
    await waitFor(() => expect(movementCalls).toBeGreaterThan(before));
    await waitFor(() => expect(called(get, "/admin/inventory/kpis").length).toBeGreaterThan(kpiBefore));
    expect(showToast).toHaveBeenCalledWith("Stock updated.");
  });

  it("a rejected adjustment shows no success toast and does not refetch history", async () => {
    let movementCalls = 0;
    routeGet({ inventory: inv, movements: (p) => { movementCalls++; return paged([], 0, p.page ?? 1, p.pageSize ?? 8); } });
    vi.spyOn(apiClient, "post").mockRejectedValue({ status: 403, message: "Only the central administrator can adjust stock." });
    const user = userEvent.setup();
    render(<Inventory />);
    await user.click(screen.getByRole("tab", { name: "Adjustments" }));
    await screen.findByText("No adjustments yet");
    const before = movementCalls;
    await user.click(screen.getAllByRole("button", { name: /New Adjustment/i })[0]);
    await user.selectOptions(await screen.findByLabelText(/^Product/), "p1");
    await stockShown(5);
    await user.type(screen.getByLabelText(/^Quantity/), "1");
    await user.selectOptions(screen.getByLabelText(/^Reason/), "Stock count correction");
    await user.click(screen.getByRole("button", { name: /Review Adjustment/i }));
    await user.click(await screen.findByRole("button", { name: /Confirm Adjustment/i }));
    expect((await screen.findAllByRole("alert")).some((a) => /central administrator/i.test(a.textContent ?? ""))).toBe(true);
    expect(showToast).not.toHaveBeenCalledWith("Stock updated.");
    expect(movementCalls).toBe(before);
  });

  it("adjustment history shows previous → new, reason, actor, and paginates server-side", async () => {
    const get = routeGet({
      inventory: inv,
      movements: (p) => paged(p.page === 2 ? [move("m9", { productName: "Page Two", previousStock: 3, newStock: 4, quantity: 1, user: "Owner" })] : [move("m1")], 20, p.page ?? 1, p.pageSize ?? 8),
    });
    const user = userEvent.setup();
    render(<Inventory />);
    await user.click(screen.getByRole("tab", { name: "Adjustments" }));
    expect((await screen.findAllByText("5 → 3")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Breakage \/ damage — dropped tray/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Central Admin").length).toBeGreaterThan(0);
    expect(get).toHaveBeenCalledWith("/admin/inventory/movements", { params: expect.objectContaining({ type: "ADJUSTMENT", page: 1 }) });

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect((await screen.findAllByText("Page Two")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("3 → 4").length).toBeGreaterThan(0);
    expect(get).toHaveBeenCalledWith("/admin/inventory/movements", { params: expect.objectContaining({ type: "ADJUSTMENT", page: 2 }) });
  });

  it("shows an error state with retry when the inventory list fails", async () => {
    vi.spyOn(apiClient, "get").mockImplementation(async (url: string) => {
      if (url === "/admin/inventory/kpis") return { data: kpis };
      if (url === "/admin/inventory") throw { status: 500, message: "boom" };
      return { data: paged([], 0, 1, 200) };
    });
    render(<Inventory />);
    expect(await screen.findByText(/Couldn't load inventory\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: /retry|try again/i })).toBeTruthy();
  });
});
