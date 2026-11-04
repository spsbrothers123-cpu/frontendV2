// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── shared mocks ─────────────────────────────────────────────────────
const showToast = vi.fn();
vi.mock("../src/context/ToastContext", () => ({ useToast: () => ({ showToast }) }));

const shops = [
  { id: "s1", name: "Branch One", code: "B1", location: "One", current: true },
  { id: "s2", name: "Branch Two", code: "B2", location: "Two", current: false },
];
const refreshShops = vi.fn();
vi.mock("../src/context/ShopContext", () => ({
  useShop: () => ({ availableShops: shops, selectedShop: shops[0], selectedShopId: "s1", refreshShops }),
}));

let cashiersByCall: any[] = [];
vi.mock("../src/api/cashiers", () => ({ fetchCashiers: vi.fn(async () => cashiersByCall) }));

import { apiClient } from "../src/api/client";
import { BranchAssignmentsDrawer } from "../src/components/products/BranchAssignmentsDrawer";
import { CreateBranchModal } from "../src/components/layout/CreateBranchModal";
import { PurchaseFormDrawer } from "../src/components/purchases/PurchaseFormDrawer";
import { AdjustStockModal } from "../src/components/products/AdjustStockModal";
import { HistoryDetailsDrawer } from "../src/components/history/HistoryDetailsDrawer";

const product: any = { id: "p1", name: "Eggs", category: "Eggs", sellingPrice: 100, stock: 7, unit: "tray", lowStockThreshold: 2, status: "active", createdAt: "", updatedAt: "" };
const cashier = (id: string, shop: string) => ({ id, name: `C-${id}`, email: "", role: "cashier", active: true, shop: { id: shop, name: shop } });

afterEach(() => { cleanup(); vi.restoreAllMocks(); showToast.mockReset(); cashiersByCall = []; });

describe("Branches & Pricing drawer", () => {
  const payload = {
    productId: "p1", productName: "Eggs", status: "active", sellingPrice: 100,
    branches: [
      { shopId: "s1", name: "Branch One", code: "B1", location: "One", assigned: true, priceOverride: null, effectivePrice: 100, hasAssignmentRecord: true, assignedAt: null, unassignedAt: null },
      { shopId: "s2", name: "Branch Two", code: "B2", location: "Two", assigned: false, priceOverride: 90, effectivePrice: 90, hasAssignmentRecord: true, assignedAt: null, unassignedAt: null },
    ],
  };

  it("lists every branch, toggles assignment and sets/clears overrides via the real endpoints", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: payload });
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({ data: { changed: true, assigned: true, priceOverride: 95, effectivePrice: 95 } });
    const onChanged = vi.fn();
    const user = userEvent.setup();
    render(<BranchAssignmentsDrawer product={product} onClose={() => {}} onChanged={onChanged} />);

    await screen.findByText("Branch One");
    expect(get).toHaveBeenCalledWith("/admin/branch-products/p1");
    expect(screen.getByText("Branch Two")).toBeTruthy();
    expect(screen.getByText(/stock and history are preserved/i)).toBeTruthy(); // unassigned notice

    await user.click(screen.getByRole("button", { name: "Assign" })); // Branch Two (unassigned)
    await waitFor(() => expect(put).toHaveBeenCalledWith("/admin/branch-products/p1/s2", { assigned: true }));
    expect(onChanged).toHaveBeenCalled();

    const inputs = screen.getAllByLabelText(/Branch price override/i);
    await user.clear(inputs[0]);
    await user.type(inputs[0], "95");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    await waitFor(() => expect(put).toHaveBeenCalledWith("/admin/branch-products/p1/s1/price", { priceOverride: 95 }));

    await user.click(screen.getByRole("button", { name: "Reset to common price" })); // Branch Two has an override
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Reset price" })); // Stage 3.2: confirmation
    await waitFor(() => expect(put).toHaveBeenCalledWith("/admin/branch-products/p1/s2/price", { priceOverride: null }));
  });

  it("rejects a negative override locally and surfaces a Central-Admin refusal", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: payload });
    const put = vi.spyOn(apiClient, "put").mockRejectedValue({ status: 403, message: "Only the central administrator can edit catalog products or prices." });
    const user = userEvent.setup();
    render(<BranchAssignmentsDrawer product={product} onClose={() => {}} onChanged={() => {}} />);
    await screen.findByText("Branch One");

    const inputs = screen.getAllByLabelText(/Branch price override/i);
    await user.type(inputs[0], "-5");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    expect(put).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/valid price/i), "error");

    await user.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/central administrator/i), "error"));
  });
});

describe("Create Branch", () => {
  it("posts the location to /admin/shops and refreshes the branch list", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: { success: true, data: { id: "s3", name: "New", code: "N", location: "Salem", current: false }, message: "ok" } });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CreateBranchModal isOpen onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /Create branch/i }));
    expect(post).not.toHaveBeenCalled(); // empty is refused locally
    await user.type(screen.getByLabelText(/Branch location/i), "Salem");
    await user.click(screen.getByRole("button", { name: /Create branch/i }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/admin/shops", { location: "Salem" }));
    expect(refreshShops).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe("Purchase form — explicit receiving branch", () => {
  const props = (onSubmit: any) => ({
    isOpen: true, onClose: () => {}, onSubmit, supplierSuggestions: [], loadCatalog: vi.fn(async () => [product]), productCategories: ["Eggs"], onCreateProduct: vi.fn(),
  });

  // Stage 3.4: the product picker belongs to the chosen receiving branch, so a
  // product can only be picked once a branch is chosen and its catalog loaded.
  async function fill(user: ReturnType<typeof userEvent.setup>, { pickProduct = true } = {}) {
    await user.type(screen.getByLabelText(/Supplier/i), "Farm");
    await user.type(screen.getByLabelText(/Invoice Number/i), "INV-1");
    if (pickProduct) {
      await screen.findByRole("option", { name: "Eggs" });
      await user.selectOptions((screen.getAllByRole("combobox") as HTMLElement[]).find((c) => c.tagName === "SELECT" && (c as HTMLSelectElement).options[1]?.text === "Eggs")!, "p1");
    }
    await user.type(screen.getByPlaceholderText("Qty"), "4");
    await user.type(screen.getByPlaceholderText(/Price|₹/i), "10");
  }

  it("does NOT default to the Global Shop Selector and blocks save without a branch", async () => {
    cashiersByCall = [cashier("c1", "s2")];
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PurchaseFormDrawer {...props(onSubmit)} />);
    expect((screen.getByLabelText(/Receiving branch/i) as HTMLSelectElement).value).toBe("");
    await fill(user, { pickProduct: false }); // no branch yet -> no catalog to pick from
    await user.click(screen.getByRole("button", { name: /Save purchase/i }));
    expect(await screen.findByText(/Select the branch that is receiving/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends the chosen receivingShopId and that branch's single cashier automatically", async () => {
    cashiersByCall = [cashier("c1", "s1"), cashier("c2", "s2")];
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PurchaseFormDrawer {...props(onSubmit)} />);
    await user.selectOptions(screen.getByLabelText(/Receiving branch/i), "s2"); // NOT the selected branch s1
    await fill(user);
    expect(screen.queryByLabelText(/Cashier \(legacy/i)).toBeNull(); // no picker: one cashier at s2
    await waitFor(() => {}); // let the cashier list resolve
    await user.click(screen.getByRole("button", { name: /Save purchase/i }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /Confirm & save purchase/i })); // Stage 3.4: explicit confirmation
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const v = onSubmit.mock.calls[0][0];
    expect(v.receivingShopId).toBe("s2");
    expect(v.cashierId).toBe("c2");
  });
});

describe("Stock adjustment", () => {
  it("requires a reason, sends it, and shows no cashier picker for a one-cashier branch", async () => {
    cashiersByCall = [cashier("c1", "s1")];
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: { productId: "p1", productName: "Eggs", totalStock: 7, branchStock: 7, byCashier: [] } });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AdjustStockModal isOpen onClose={() => {}} onSubmit={onSubmit} product={product} />);
    expect(screen.queryByLabelText(/Cashier/i)).toBeNull();
    await screen.findByText(/7 tray\(s\) at Branch One/);
    await user.type(screen.getByLabelText(/Quantity/i), "2");
    await user.selectOptions(screen.getByLabelText(/Reason/i), "Expired / spoiled");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const v = onSubmit.mock.calls[0][0];
    expect(v).toMatchObject({ productId: "p1", adjustmentType: "add", quantity: 2, reason: "Expired / spoiled" });
  });

  it("refuses to remove more than the branch holds", async () => {
    cashiersByCall = [cashier("c1", "s1")];
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: { productId: "p1", productName: "Eggs", totalStock: 7, branchStock: 7, byCashier: [] } });
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AdjustStockModal isOpen onClose={() => {}} onSubmit={onSubmit} product={product} />);
    await screen.findByText(/7 tray\(s\) at Branch One/);
    await user.click(screen.getByRole("button", { name: /Remove/i }));
    await user.type(screen.getByLabelText(/Quantity/i), "9");
    // Stage 3.3: no reason is pre-selected any more, so choose one first.
    await user.selectOptions(screen.getByLabelText(/Reason/i), "Expired / spoiled");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/only has 7/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("Bill cancellation (History drawer)", () => {
  const record: any = { id: "sale-b1", time: "2026-10-01T10:00:00Z", type: "Sale", reference: "B-1", party: "X", amount: 120, paymentMethod: "Cash", createdBy: "C", status: "Completed" };
  const sale = (over: any = {}) => ({ billNumber: "B-1", date: "2026-10-01T10:00:00Z", customerName: "X", items: [{ name: "Eggs", quantity: 1, price: 120 }], paymentMethod: "Cash", total: 120, createdBy: "C", id: "b1", status: "Completed", ...over });

  it("reason is mandatory; success posts to /admin/bills/:id/cancel and relabels the bill", async () => {
    let cancelled = false;
    vi.spyOn(apiClient, "get").mockImplementation(async () => ({ data: cancelled ? sale({ status: "Cancelled", cancelReason: "Duplicate", cancelledAt: "2026-10-02T00:00:00Z", cancelledBy: "Admin" }) : sale() }));
    const post = vi.spyOn(apiClient, "post").mockImplementation(async () => { cancelled = true; return { data: { id: "b1", billNumber: "B-1", status: "cancelled", cancelledAt: "", cancelReason: "Duplicate", cancelledAfterSessionClose: false, total: 120, stockRestored: 1, creditReversed: 0 } }; });
    const onChanged = vi.fn();
    const user = userEvent.setup();
    render(<HistoryDetailsDrawer record={record} onClose={() => {}} onChanged={onChanged} />);

    await user.click(await screen.findByRole("button", { name: /^Cancel bill$/i }));
    await user.click(screen.getAllByRole("button", { name: /^Cancel bill$/i }).pop()!); // submit with empty reason
    expect(await screen.findByText(/reason is required/i)).toBeTruthy();
    expect(post).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/Reason/i), "Duplicate");
    await user.click(screen.getAllByRole("button", { name: /^Cancel bill$/i }).pop()!);
    await waitFor(() => expect(post).toHaveBeenCalledWith("/admin/bills/b1/cancel", { reason: "Duplicate" }));
    expect(await screen.findByText(/Excluded from net sales/i)).toBeTruthy();
    expect(screen.getByText(/Reason: Duplicate/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Cancel bill$/i })).toBeNull(); // cannot be cancelled twice from the UI
    expect(onChanged).toHaveBeenCalled();
  });

  it("an already-cancelled bill offers no cancel action", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: sale({ status: "Cancelled", cancelReason: "x" }) });
    render(<HistoryDetailsDrawer record={{ ...record, status: "Cancelled" }} onClose={() => {}} />);
    await screen.findByText(/Excluded from net sales/i);
    expect(screen.queryByRole("button", { name: /Cancel bill/i })).toBeNull();
  });

  it("surfaces a backend refusal (e.g. non-central admin) without changing the bill", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: sale() });
    vi.spyOn(apiClient, "post").mockRejectedValue({ status: 403, message: "Only the central administrator can cancel bills." });
    const user = userEvent.setup();
    render(<HistoryDetailsDrawer record={record} onClose={() => {}} />);
    await user.click(await screen.findByRole("button", { name: /^Cancel bill$/i }));
    await user.type(screen.getByLabelText(/Reason/i), "mistake");
    await user.click(screen.getAllByRole("button", { name: /^Cancel bill$/i }).pop()!);
    expect(await screen.findByText(/central administrator can cancel/i)).toBeTruthy();
  });
});
