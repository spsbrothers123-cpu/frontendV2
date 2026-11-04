// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const showToast = vi.fn();
vi.mock("../src/context/ToastContext", () => ({ useToast: () => ({ showToast }) }));

// The Global Shop Selector sits on Branch One throughout; the tests prove that
// is never what decides where a purchase goes.
const shops = [
  { id: "s1", name: "Branch One", code: "B1", location: "One", current: true },
  { id: "s2", name: "Branch Two", code: "B2", location: "Two", current: false },
  { id: "s3", name: "Branch Three", code: "B3", location: "Three", current: false },
];
vi.mock("../src/context/ShopContext", () => ({
  useShop: () => ({ availableShops: shops, selectedShop: shops[0], selectedShopId: "s1", refreshShops: vi.fn() }),
}));

let cashiersByCall: any[] = [];
vi.mock("../src/api/cashiers", () => ({ fetchCashiers: vi.fn(async () => cashiersByCall) }));

import { apiClient } from "../src/api/client";
import * as productsApi from "../src/api/products";
import { PurchaseFormDrawer } from "../src/components/purchases/PurchaseFormDrawer";
import { ReversePurchaseModal } from "../src/components/purchases/ReversePurchaseModal";
import { quantityError, validateReversalReason, catalogLinesAtRisk } from "../src/components/purchases/purchaseRules";
import Purchases from "../src/pages/Purchases";

const prod = (id: string, name: string, over: any = {}): any => ({
  id, name, category: "Eggs", sellingPrice: 100, stock: 0, unit: "tray", lowStockThreshold: 1, status: "active", createdAt: "", updatedAt: "", ...over,
});
const cashier = (id: string, shop: string) => ({ id, name: `C-${id}`, email: "", role: "cashier", active: true, shop: { id: shop, name: shop } });

afterEach(() => { cleanup(); vi.restoreAllMocks(); showToast.mockReset(); cashiersByCall = []; });

// ── pure rules ───────────────────────────────────────────────────────
describe("purchaseRules", () => {
  it("accepts only whole, positive quantities", () => {
    expect(quantityError(4)).toBeNull();
    expect(quantityError(2.5)).toBe("Whole numbers only");
    expect(quantityError(0)).toBe("Required");
    expect(quantityError(-1)).toBe("Required");
    expect(quantityError("")).toBe("Required");
  });
  it("mirrors the backend's reversal-reason rule (trimmed, 3–500 chars)", () => {
    expect(validateReversalReason("   ")).toMatch(/at least 3/);
    expect(validateReversalReason("ab")).toMatch(/at least 3/);
    expect(validateReversalReason("dup")).toBeNull();
    expect(validateReversalReason("x".repeat(501))).toMatch(/under 500/);
  });
  it("only counts catalog lines that already have a product as at risk", () => {
    const rows = [
      { mode: "catalog" as const, productId: "p", productName: "A" },
      { mode: "catalog" as const, productId: "", productName: "" },
      { mode: "one-time" as const, productId: "", productName: "Tape" },
    ];
    expect(catalogLinesAtRisk(rows)).toHaveLength(1);
  });
});

// ── API helper ───────────────────────────────────────────────────────
describe("fetchBranchCatalog", () => {
  it("asks the backend for the RECEIVING branch's assigned products (shopId) and walks every page", async () => {
    const page1 = Array.from({ length: 200 }, (_, i) => prod(`a${i}`, `A${i}`));
    const page2 = [prod("b1", "B1")];
    const get = vi.spyOn(apiClient, "get")
      .mockResolvedValueOnce({ data: { items: page1, total: 201, page: 1, pageSize: 200 } })
      .mockResolvedValueOnce({ data: { items: page2, total: 201, page: 2, pageSize: 200 } });
    const all = await productsApi.fetchBranchCatalog("s2");
    expect(all).toHaveLength(201);
    expect(get).toHaveBeenNthCalledWith(1, "/admin/products", { params: { shopId: "s2", assignment: "assigned", page: 1, pageSize: 200 } });
    expect(get).toHaveBeenNthCalledWith(2, "/admin/products", { params: { shopId: "s2", assignment: "assigned", page: 2, pageSize: 200 } });
  });
});

// ── purchase form ────────────────────────────────────────────────────
describe("Purchase form — Stage 3.4", () => {
  const catalogs: Record<string, any[]> = {
    s2: [prod("p2", "Two Eggs")],
    s3: [prod("p3", "Three Eggs")],
  };
  function setup(over: any = {}) {
    const onSubmit = over.onSubmit ?? vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const loadCatalog = over.loadCatalog ?? vi.fn(async (id: string) => catalogs[id] ?? []);
    const user = userEvent.setup();
    render(
      <PurchaseFormDrawer
        isOpen onClose={onClose} onSubmit={onSubmit} supplierSuggestions={[]}
        loadCatalog={loadCatalog} productCategories={["Eggs"]} onCreateProduct={vi.fn()}
      />
    );
    return { user, onSubmit, onClose, loadCatalog };
  }
  const branchSelect = () => screen.getByLabelText(/Receiving branch/i) as HTMLSelectElement;
  // The catalog picker is the <select> whose first option is a product prompt.
  const pickers = () =>
    (screen.getAllByRole("combobox") as HTMLElement[])
      .filter((c): c is HTMLSelectElement => c.tagName === "SELECT") // the Supplier input has a datalist, so it is a combobox too
      .filter((c) => /product|branch first/i.test(c.options[0]?.text ?? ""));
  async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/Supplier/i), "Farm");
    await user.type(screen.getByLabelText(/Invoice Number/i), "INV-1");
  }
  async function pickOnRow(user: ReturnType<typeof userEvent.setup>, optionName: string, qty = "4", index = 0) {
    await screen.findByRole("option", { name: optionName });
    await user.selectOptions(pickers()[index], await screen.findByRole("option", { name: optionName }));
    await user.type(screen.getAllByPlaceholderText("Qty")[index], qty);
    await user.type(screen.getAllByPlaceholderText("Price")[index], "10");
  }

  it("keeps Receiving branch blank and mandatory, and offers no catalog product until one is chosen", async () => {
    const { user, onSubmit, loadCatalog } = setup();
    expect(branchSelect().value).toBe("");
    expect(pickers()[0].disabled).toBe(true);
    expect(pickers()[0].options[0].text).toMatch(/Choose the receiving branch first/i);
    expect(loadCatalog).not.toHaveBeenCalled();
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: /Save purchase/i }));
    expect(await screen.findByText(/Select the branch that is receiving/i)).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("loads the catalog of the CHOSEN branch — not the Global Shop Selector's", async () => {
    const { user, loadCatalog } = setup();
    await user.selectOptions(branchSelect(), "s2");
    await waitFor(() => expect(loadCatalog).toHaveBeenCalledWith("s2"));
    expect(loadCatalog).not.toHaveBeenCalledWith("s1");
    expect(await screen.findByRole("option", { name: "Two Eggs" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Three Eggs" })).toBeNull();
  });

  it("never shows a slow response for a previously chosen branch", async () => {
    let resolveS2: (v: any[]) => void = () => {};
    const loadCatalog = vi.fn((id: string) => (id === "s2" ? new Promise<any[]>((r) => { resolveS2 = r; }) : Promise.resolve(catalogs[id])));
    const { user } = setup({ loadCatalog });
    await user.selectOptions(branchSelect(), "s2"); // still loading
    await user.selectOptions(branchSelect(), "s3");
    await screen.findByRole("option", { name: "Three Eggs" });
    await act(async () => { resolveS2(catalogs.s2); });
    expect(screen.queryByRole("option", { name: "Two Eggs" })).toBeNull();
    expect(screen.getByRole("option", { name: "Three Eggs" })).toBeTruthy();
  });

  it("changing branch with NO picked products switches silently", async () => {
    const { user } = setup();
    await user.selectOptions(branchSelect(), "s2");
    await screen.findByRole("option", { name: "Two Eggs" });
    await user.selectOptions(branchSelect(), "s3");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(branchSelect().value).toBe("s3");
  });

  it("warns before a branch change would discard picked catalog lines; Keep leaves everything, Change clears only catalog lines", async () => {
    const { user, loadCatalog } = setup();
    await user.selectOptions(branchSelect(), "s2");
    await pickOnRow(user, "Two Eggs");
    await user.click(screen.getByRole("button", { name: /Add row/i }));
    await user.click(screen.getAllByRole("tab", { name: /Purchase List Only/i })[1]);
    await user.type(screen.getByPlaceholderText(/Item name/i), "Packing tape");

    await user.selectOptions(branchSelect(), "s3");
    let dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Change receiving branch\?/i)).toBeTruthy();
    expect(within(dialog).getByText("Two Eggs")).toBeTruthy(); // names what would be lost
    expect(within(dialog).getByText(/Purchase-list-only items are kept/i)).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: /Keep Branch Two/i }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(branchSelect().value).toBe("s2");
    expect(pickers()[0].value).toBe("p2"); // untouched

    await user.selectOptions(branchSelect(), "s3");
    dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /Change branch & clear lines/i }));
    expect(branchSelect().value).toBe("s3");
    await waitFor(() => expect(loadCatalog).toHaveBeenCalledWith("s3"));
    expect(screen.queryByRole("option", { name: "Two Eggs" })).toBeNull();
    expect(pickers()).toHaveLength(0); // the picked catalog line is gone; only the one-time row remains
    expect((screen.getByPlaceholderText(/Item name/i) as HTMLInputElement).value).toBe("Packing tape"); // one-time line kept
  });

  it("rejects fractional quantities in the form and never reaches confirmation", async () => {
    const { user, onSubmit } = setup();
    await fillBasics(user);
    await user.selectOptions(branchSelect(), "s2");
    await pickOnRow(user, "Two Eggs", "2.5");
    await user.click(screen.getByRole("button", { name: /Save purchase/i }));
    expect(await screen.findByText(/Whole numbers only/i)).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("confirmation names the receiving branch; nothing is created until Confirm; the payload carries that branch, not the selector's", async () => {
    cashiersByCall = [cashier("c2", "s2")];
    const { user, onSubmit, onClose } = setup();
    await fillBasics(user);
    await user.selectOptions(branchSelect(), "s2"); // selector is s1
    await pickOnRow(user, "Two Eggs", "4");
    await waitFor(() => {});
    await user.click(screen.getByRole("button", { name: /Save purchase/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(within(dialog).getByTestId("confirm-receiving-branch")).getByText("Branch Two")).toBeTruthy();
    expect(within(dialog).getByText(/will not appear in that branch's list/i)).toBeTruthy(); // viewing Branch One
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: /Go back/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Save purchase/i }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /Confirm & save purchase/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const v = onSubmit.mock.calls[0][0];
    expect(v.receivingShopId).toBe("s2");
    expect(v.items[0]).toMatchObject({ productId: "p2", quantity: 4, purchasePrice: 10 });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("a double click on Confirm creates exactly one purchase", async () => {
    let finish: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>((r) => { finish = r; }));
    const { user } = setup({ onSubmit });
    await fillBasics(user);
    await user.selectOptions(branchSelect(), "s2");
    await pickOnRow(user, "Two Eggs");
    await user.click(screen.getByRole("button", { name: /Save purchase/i }));
    const confirm = within(await screen.findByRole("alertdialog")).getByRole("button", { name: /Confirm & save purchase/i });
    await user.dblClick(confirm);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); });
  });

  it("Escape while confirming closes only the confirmation — the draft and drawer survive", async () => {
    const { user, onClose } = setup();
    await fillBasics(user);
    await user.selectOptions(branchSelect(), "s2");
    await pickOnRow(user, "Two Eggs");
    await user.click(screen.getByRole("button", { name: /Save purchase/i }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/Supplier/i) as HTMLInputElement).value).toBe("Farm");
  });

  it("a failed save keeps the drawer open with every value, and says why", async () => {
    const onSubmit = vi.fn().mockRejectedValue({ status: 404, message: "Product not found at the receiving branch: p2" });
    const { user, onClose } = setup({ onSubmit });
    await fillBasics(user);
    await user.selectOptions(branchSelect(), "s2");
    await pickOnRow(user, "Two Eggs");
    await user.click(screen.getByRole("button", { name: /Save purchase/i }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /Confirm & save purchase/i }));
    expect(await screen.findByText(/Product not found at the receiving branch/i)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    expect(branchSelect().value).toBe("s2");
    expect((screen.getByLabelText(/Supplier/i) as HTMLInputElement).value).toBe("Farm");
  });
});

// ── reversal ─────────────────────────────────────────────────────────
const purchaseRow = (over: any = {}): any => ({
  id: "pu1", receivingShopId: "s2", receivingBranchName: "Branch Two", reversed: false, reversal: null,
  invoiceNumber: "INV-9", supplierName: "Farm", purchaseDate: "2026-10-20",
  items: [{ id: "i1", productId: "p2", inCatalog: true, productName: "Two Eggs", quantity: 4, unit: "tray", purchasePrice: 10, total: 40 }],
  subtotal: 40, tax: 0, grandTotal: 40, status: "Received", ...over,
});

describe("Reverse purchase modal", () => {
  function setup(over: any = {}) {
    const onReversed = vi.fn(); const onAlready = vi.fn(); const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ReversePurchaseModal purchase={over.purchase ?? purchaseRow()} onClose={onClose} onReversed={onReversed} onAlreadyReversed={onAlready} />);
    return { user, onReversed, onAlready, onClose };
  }
  const submitBtn = () => screen.getByRole("button", { name: /^Reverse purchase$/i });

  it("requires a reason (trimmed, 3+ chars) before any request", async () => {
    const post = vi.spyOn(apiClient, "post");
    const { user } = setup();
    await user.click(submitBtn());
    expect(await screen.findByText(/at least 3 characters/i)).toBeTruthy();
    await user.type(screen.getByLabelText(/Reason for reversal/i), "  ab ");
    await user.click(submitBtn());
    expect(post).not.toHaveBeenCalled();
  });

  it("posts the trimmed reason (and the receiving branch's cashier) and hands the updated purchase back", async () => {
    cashiersByCall = [cashier("c2", "s2"), cashier("c1", "s1")];
    const updated = purchaseRow({ reversed: true, reversal: { id: "r1", reason: "Duplicate entry", reversedAt: "2026-10-29T08:00:00.000Z", reversedById: "u1" } });
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: updated });
    const { user, onReversed } = setup();
    await user.type(screen.getByLabelText(/Reason for reversal/i), "  Duplicate entry ");
    await waitFor(() => {}); // let the cashier list resolve
    await user.click(submitBtn());
    await waitFor(() => expect(post).toHaveBeenCalledWith("/admin/purchases/pu1/reverse", { reason: "Duplicate entry", cashierId: "c2" }));
    expect(onReversed).toHaveBeenCalledWith(updated);
  });

  it("PURCHASE_REVERSAL_BLOCKED: explains that nothing changed and lets the Admin retry", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue({ status: 409, code: "PURCHASE_REVERSAL_BLOCKED", message: 'Cannot reverse: removing 4 of "Two Eggs" would make this branch\'s stock negative.' });
    const { user, onAlready } = setup();
    await user.type(screen.getByLabelText(/Reason for reversal/i), "Wrong supplier");
    await user.click(submitBtn());
    expect(await screen.findByText(/Reversal blocked — nothing was changed/i)).toBeTruthy();
    expect(screen.getByText(/would make this branch's stock negative/i)).toBeTruthy();
    expect(onAlready).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^Reverse purchase$/i })).toBeTruthy(); // still retryable
  });

  it("PURCHASE_ALREADY_REVERSED: says so, refreshes the list, and removes the action", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue({ status: 409, code: "PURCHASE_ALREADY_REVERSED", message: "This purchase has already been reversed." });
    const { user, onAlready, onReversed } = setup();
    await user.type(screen.getByLabelText(/Reason for reversal/i), "Wrong supplier");
    await user.click(submitBtn());
    expect(await screen.findByText(/Already reversed\./i)).toBeTruthy();
    expect(onAlready).toHaveBeenCalledTimes(1);
    expect(onReversed).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^Reverse purchase$/i })).toBeNull();
  });

  it("a double click sends a single reversal request", async () => {
    let finish: (v: any) => void = () => {};
    const post = vi.spyOn(apiClient, "post").mockImplementation(() => new Promise((r) => { finish = r; }) as any);
    const { user } = setup();
    await user.type(screen.getByLabelText(/Reason for reversal/i), "Wrong supplier");
    await user.dblClick(submitBtn());
    expect(post).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ data: purchaseRow({ reversed: true }) }); });
  });
});

// ── Purchases page ───────────────────────────────────────────────────
describe("Purchases page — receiving branch and reversal", () => {
  const reversed = purchaseRow({
    id: "pu2", invoiceNumber: "INV-2", reversed: true,
    reversal: { id: "r1", reason: "Supplier invoice entered twice", reversedAt: "2026-10-28T10:30:00.000Z", reversedById: "u1" },
  });
  function mockApi(rows: any[]) {
    return vi.spyOn(apiClient, "get").mockImplementation(async (url: string) => {
      if (url === "/admin/purchases") return { data: { items: rows, total: rows.length, page: 1, pageSize: 8 } } as any;
      if (url === "/admin/products") return { data: { items: [prod("p2", "Two Eggs")], total: 1, page: 1, pageSize: 200 } } as any;
      throw new Error(`unexpected GET ${url}`);
    });
  }

  it("lists each purchase with its original receiving branch and a Reversed status", async () => {
    mockApi([purchaseRow(), reversed]);
    render(<Purchases />);
    expect((await screen.findAllByText("INV-9")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Branch Two").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reversed").length).toBeGreaterThan(0); // INV-2
    expect(screen.getAllByText("Received").length).toBeGreaterThan(0); // INV-9
    expect(screen.getByText(/Showing purchases received at/i).textContent).toMatch(/Branch One/);
  });

  it("shows a reversed purchase's branch, status, reason and timestamp — with no way to reverse again or edit the branch", async () => {
    mockApi([reversed]);
    const user = userEvent.setup();
    render(<Purchases />);
    await user.click((await screen.findAllByText("INV-2"))[0]);
    const box = await screen.findByTestId("purchase-reversal");
    expect(within(box).getByText("Reversed")).toBeTruthy();
    expect(within(box).getByText(/Supplier invoice entered twice/)).toBeTruthy();
    expect(within(box).getByText(/Reversed on/).textContent).toContain(new Date("2026-10-28T10:30:00.000Z").toLocaleString("en-IN"));
    expect(screen.getByTestId("purchase-receiving-branch").textContent).toBe("Branch Two");
    expect(screen.queryByRole("button", { name: /Reverse purchase/i })).toBeNull();
    // the receiving branch is plain text, never a control
    expect(within(screen.getByTestId("purchase-receiving-branch").parentElement!).queryByRole("combobox")).toBeNull();
  });

  it("reverses a received purchase end to end and refreshes the row", async () => {
    const rows = [purchaseRow()];
    const get = mockApi(rows);
    const after = purchaseRow({ reversed: true, reversal: { id: "r1", reason: "Duplicate", reversedAt: "2026-10-29T08:00:00.000Z", reversedById: "u1" } });
    // Like the real backend: once reversed, the list returns the reversed row.
    const post = vi.spyOn(apiClient, "post").mockImplementation(async () => { rows[0] = after; return { data: after } as any; });
    const user = userEvent.setup();
    render(<Purchases />);
    await user.click((await screen.findAllByText("INV-9"))[0]);
    await user.click(await screen.findByRole("button", { name: /Reverse purchase/i }));
    await user.type(screen.getByLabelText(/Reason for reversal/i), "Duplicate");
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /^Reverse purchase$/i }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/admin/purchases/pu1/reverse", { reason: "Duplicate" }));
    expect(await screen.findByTestId("purchase-reversal")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Reverse purchase/i })).toBeNull();
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/Purchase reversed — stock removed from Branch Two/));
    expect(get.mock.calls.filter((c) => c[0] === "/admin/purchases").length).toBeGreaterThanOrEqual(2); // reloaded
  });
});
