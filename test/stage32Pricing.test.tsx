// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const showToast = vi.fn();
vi.mock("../src/context/ToastContext", () => ({ useToast: () => ({ showToast }) }));
vi.mock("../src/context/ShopContext", () => ({
  useShop: () => ({ availableShops: [], selectedShop: null, selectedShopId: "s1", refreshShops: vi.fn() }),
}));
vi.mock("../src/api/cashiers", () => ({ fetchCashiers: vi.fn(async () => []) }));

import { apiClient } from "../src/api/client";
import { BranchAssignmentsDrawer } from "../src/components/products/BranchAssignmentsDrawer";
import { ProductPrice } from "../src/components/products/ProductPrice";
import Products from "../src/pages/Products";

const mk = (id: string, over: any = {}): any => ({
  id, name: `Prod ${id}`, category: "Eggs", sellingPrice: 100, stock: 5, unit: "tray",
  lowStockThreshold: 2, status: "active", assigned: true, createdAt: "", updatedAt: "", ...over,
});
const branch = (shopId: string, name: string, over: any = {}) => ({
  shopId, name, code: shopId, location: `${name} site`, assigned: true, priceOverride: null, effectivePrice: 100,
  hasAssignmentRecord: true, assignedAt: null, unassignedAt: null, ...over,
});
const payload = (branches: any[]) => ({ productId: "p1", productName: "Eggs", status: "active", sellingPrice: 100, branches });

afterEach(() => { cleanup(); vi.restoreAllMocks(); showToast.mockReset(); });

describe("ProductPrice", () => {
  it("shows the override as the price, tagged, with the common price alongside", () => {
    render(<ProductPrice product={{ sellingPrice: 100, priceOverride: 90, effectivePrice: 90 }} />);
    expect(screen.getByText("₹90")).toBeTruthy();
    expect(screen.getByText("Branch override")).toBeTruthy();
    expect(screen.getByText("Common ₹100")).toBeTruthy();
  });
  it("shows an inherited price as the common price", () => {
    render(<ProductPrice product={{ sellingPrice: 100, priceOverride: null, effectivePrice: 100 }} />);
    expect(screen.getByText("₹100")).toBeTruthy();
    expect(screen.getByText("Common price")).toBeTruthy();
    expect(screen.queryByText("Branch override")).toBeNull();
  });
  it("treats a 0 override as a real override", () => {
    render(<ProductPrice product={{ sellingPrice: 100, priceOverride: 0, effectivePrice: 0 }} />);
    expect(screen.getByText("₹0")).toBeTruthy();
    expect(screen.getByText("Branch override")).toBeTruthy();
  });
  it("falls back to the common price when branch fields are absent", () => {
    render(<ProductPrice product={{ sellingPrice: 100 }} />);
    expect(screen.getByText("₹100")).toBeTruthy();
  });
});

describe("Products list price column", () => {
  it("displays the selected branch's effective price and distinguishes overrides", async () => {
    vi.spyOn(apiClient, "get").mockImplementation(async (url: string, cfg: any) => {
      if (url === "/admin/products") {
        const items = [
          mk("a", { name: "Overridden Eggs", priceOverride: 85, effectivePrice: 85 }),
          mk("b", { name: "Inherited Milk", priceOverride: null, effectivePrice: 100 }),
        ];
        return { data: { items, total: 2, page: 1, pageSize: cfg?.params?.pageSize ?? 8 } };
      }
      throw new Error("unexpected GET " + url);
    });
    render(<Products />);
    await screen.findAllByText("Overridden Eggs");
    expect(screen.getAllByText("₹85").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Branch override").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Common price").length).toBeGreaterThan(0);
  });
});

describe("Branch price override drawer", () => {
  const open = (branches: any[]) => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: payload(branches) });
    const onChanged = vi.fn();
    render(<BranchAssignmentsDrawer product={mk("p1")} onClose={() => {}} onChanged={onChanged} />);
    return onChanged;
  };

  it("Save is disabled until the value changes and sends nothing when unchanged", async () => {
    const put = vi.spyOn(apiClient, "put");
    open([branch("s1", "Branch One", { priceOverride: 90, effectivePrice: 90 })]);
    await screen.findByText("Branch One");
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Branch price override/i), "5"); // 905
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(false);
    expect(put).not.toHaveBeenCalled();
  });

  it("sets an override (including 0) via the price endpoint for just that branch", async () => {
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({ data: { priceOverride: 0, effectivePrice: 0, changed: true } });
    const onChanged = open([branch("s1", "Branch One"), branch("s2", "Branch Two")]);
    await screen.findByText("Branch Two");
    const user = userEvent.setup();
    await user.type(screen.getAllByLabelText(/Branch price override/i)[1], "0");
    await user.click(screen.getAllByRole("button", { name: "Save" })[1]);
    await waitFor(() => expect(put).toHaveBeenCalledWith("/admin/branch-products/p1/s2/price", { priceOverride: 0 }));
    expect(put).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it.each(["-5", "10.999", "10000000000"])("blocks invalid price %s locally", async (bad) => {
    const put = vi.spyOn(apiClient, "put");
    open([branch("s1", "Branch One")]);
    await screen.findByText("Branch One");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Branch price override/i), bad);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(put).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/valid price/i), "error");
  });

  it("reset asks for confirmation showing the current override and the common price; cancel sends nothing", async () => {
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({ data: { priceOverride: null, effectivePrice: 100, changed: true } });
    open([branch("s1", "Branch One", { priceOverride: 90, effectivePrice: 90 })]);
    await screen.findByText("Branch One");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Reset to common price" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/₹90 \(branch override\)/)).toBeTruthy();
    expect(within(dialog).getByText(/common product price of ₹100/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(put).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Reset to common price" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Reset price" }));
    await waitFor(() => expect(put).toHaveBeenCalledWith("/admin/branch-products/p1/s1/price", { priceOverride: null }));
  });

  it("blanking an existing override and saving goes through the same reset confirmation", async () => {
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({ data: { priceOverride: null, effectivePrice: 100, changed: true } });
    open([branch("s1", "Branch One", { priceOverride: 90, effectivePrice: 90 })]);
    await screen.findByText("Branch One");
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/Branch price override/i));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(put).not.toHaveBeenCalled();
    await screen.findByRole("alertdialog");
  });

  it("shows a friendly permission message on a 403", async () => {
    vi.spyOn(apiClient, "put").mockRejectedValue({ status: 403, message: "raw backend text" });
    open([branch("s1", "Branch One")]);
    await screen.findByText("Branch One");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Branch price override/i), "80");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/don't have permission.*central administrator/i), "error"));
  });

  it("explains a missing branch price record (BRANCH_PRODUCT_NOT_FOUND)", async () => {
    vi.spyOn(apiClient, "put").mockRejectedValue({ status: 404, code: "BRANCH_PRODUCT_NOT_FOUND", message: "x" });
    open([branch("s1", "Branch One")]);
    await screen.findByText("Branch One");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Branch price override/i), "80");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/Assign it to the branch first/i), "error"));
  });

  it("labels each branch's effective price as override or common", async () => {
    open([branch("s1", "Branch One", { priceOverride: 90, effectivePrice: 90 }), branch("s2", "Branch Two")]);
    await screen.findByText("Branch Two");
    expect(screen.getAllByText("Branch override").length).toBe(1);
    expect(screen.getAllByText("Common price").length).toBe(1);
  });
});
