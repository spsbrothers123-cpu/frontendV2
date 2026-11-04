// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const showToast = vi.fn();
vi.mock("../src/context/ToastContext", () => ({ useToast: () => ({ showToast }) }));
const shops = [{ id: "s1", name: "Branch One", code: "B1", location: "One", current: true }];
vi.mock("../src/context/ShopContext", () => ({
  useShop: () => ({ availableShops: shops, selectedShop: shops[0], selectedShopId: "s1", refreshShops: vi.fn() }),
}));
vi.mock("../src/api/cashiers", () => ({ fetchCashiers: vi.fn(async () => []) }));

import { apiClient } from "../src/api/client";
import * as productsApi from "../src/api/products";
import { getProductStates } from "../src/components/products/productState";
import { BranchAssignmentsDrawer } from "../src/components/products/BranchAssignmentsDrawer";
import Products from "../src/pages/Products";

const mk = (id: string, over: any = {}): any => ({
  id, name: `Prod ${id}`, category: "Eggs", sellingPrice: 100, stock: 5, unit: "tray",
  lowStockThreshold: 2, status: "active", assigned: true, createdAt: "", updatedAt: "", ...over,
});
const page = (items: any[], total = items.length) => ({ data: { items, total, page: 1, pageSize: 8 } });

afterEach(() => { cleanup(); vi.restoreAllMocks(); showToast.mockReset(); });

describe("getProductStates", () => {
  it("keeps Inactive, Unassigned and Zero stock distinct", () => {
    expect(getProductStates({ status: "active", assigned: true, stock: 5 })).toEqual(["Active"]);
    expect(getProductStates({ status: "inactive", assigned: true, stock: 5 })).toEqual(["Inactive"]);
    expect(getProductStates({ status: "active", assigned: false, stock: 5 })).toEqual(["Unassigned"]);
    expect(getProductStates({ status: "active", assigned: true, stock: 0 })).toEqual(["Active", "Zero stock"]);
    expect(getProductStates({ status: "inactive", assigned: false, stock: 0 })).toEqual(["Inactive", "Unassigned", "Zero stock"]);
  });
  it("treats a missing `assigned` (create/update responses) as assigned", () => {
    expect(getProductStates({ status: "active", stock: 3 })).toEqual(["Active"]);
  });
});

describe("fetchProductCategories", () => {
  it("walks every page with assignment=all and returns unique sorted categories", async () => {
    const get = vi.spyOn(apiClient, "get")
      .mockResolvedValueOnce({ data: { items: [mk("1", { category: "Eggs" }), mk("2", { category: "Dairy" })], total: 450, page: 1, pageSize: 200 } })
      .mockResolvedValueOnce({ data: { items: [mk("3", { category: "Eggs" }), mk("4", { category: "Bakery" })], total: 450, page: 2, pageSize: 200 } })
      .mockResolvedValueOnce({ data: { items: [mk("5", { category: "Spices" })], total: 450, page: 3, pageSize: 200 } });
    const cats = await productsApi.fetchProductCategories();
    expect(cats).toEqual(["Bakery", "Dairy", "Eggs", "Spices"]);
    expect(get).toHaveBeenCalledTimes(3);
    expect(get).toHaveBeenNthCalledWith(2, "/admin/products", { params: { assignment: "all", page: 2, pageSize: 200 } });
  });
  it("stops on an empty page even if total is wrong", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: { items: [], total: 9999, page: 1, pageSize: 200 } });
    expect(await productsApi.fetchProductCategories()).toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);
  });
});

describe("BranchAssignmentsDrawer — Stage 3.1", () => {
  const payload = {
    productId: "p1", productName: "Eggs", status: "active", sellingPrice: 100,
    branches: [
      { shopId: "s1", name: "Branch One", code: "B1", location: "One", assigned: true, priceOverride: null, effectivePrice: 100, hasAssignmentRecord: true, assignedAt: null, unassignedAt: null },
      { shopId: "s2", name: "Branch Two", code: "B2", location: "Two", assigned: false, priceOverride: 90, effectivePrice: 90, hasAssignmentRecord: true, assignedAt: null, unassignedAt: null },
    ],
  };

  it("asks for confirmation before unassigning; cancel sends nothing, confirm sends assigned:false", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: payload });
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({ data: { assigned: false, changed: true } });
    const onChanged = vi.fn();
    const user = userEvent.setup();
    render(<BranchAssignmentsDrawer product={mk("p1")} onClose={() => {}} onChanged={onChanged} showPriceOverrides={false} />);
    await screen.findByText("Branch One");

    await user.click(screen.getByRole("button", { name: "Unassign" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(put).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(put).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Unassign" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Unassign" }));
    await waitFor(() => expect(put).toHaveBeenCalledWith("/admin/branch-products/p1/s1", { assigned: false }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("assigning needs no confirmation", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: payload });
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({ data: { assigned: true, changed: true } });
    const user = userEvent.setup();
    render(<BranchAssignmentsDrawer product={mk("p1")} onClose={() => {}} onChanged={() => {}} showPriceOverrides={false} />);
    await screen.findByText("Branch Two");
    await user.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() => expect(put).toHaveBeenCalledWith("/admin/branch-products/p1/s2", { assigned: true }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("hides price-override controls when showPriceOverrides is false (Stage 3.2 not started)", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: payload });
    render(<BranchAssignmentsDrawer product={mk("p1")} onClose={() => {}} onChanged={() => {}} showPriceOverrides={false} />);
    await screen.findByText("Branch One");
    expect(screen.queryByLabelText(/Branch price override/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.getByText("Branch Assignments")).toBeTruthy();
  });
});

describe("Products page — Stage 3.1", () => {
  const rows = [
    mk("a", { name: "Active Eggs" }),
    mk("b", { name: "Gone Milk", status: "inactive" }),
    mk("c", { name: "Hidden Rice", assigned: false }),
    mk("d", { name: "Empty Tea", stock: 0 }),
  ];

  function stubGet(items = rows) {
    return vi.spyOn(apiClient, "get").mockImplementation(async (url: string, cfg: any) => {
      if (url === "/admin/products") {
        if (cfg?.params?.pageSize === 200) return { data: { items, total: items.length, page: 1, pageSize: 200 } };
        return page(items);
      }
      if (url.startsWith("/admin/branch-products/")) return { data: { productId: "a", productName: "Active Eggs", status: "active", sellingPrice: 100, branches: [
        { shopId: "s1", name: "Branch One", code: "B1", location: "One", assigned: true, priceOverride: null, effectivePrice: 100, hasAssignmentRecord: true, assignedAt: null, unassignedAt: null },
      ] } };
      throw new Error("unexpected GET " + url);
    });
  }

  it("lists Assigned by default and refetches with the chosen assignment filter", async () => {
    const get = stubGet();
    const user = userEvent.setup();
    render(<Products />);
    await screen.findAllByText("Active Eggs");
    expect(get).toHaveBeenCalledWith("/admin/products", { params: expect.objectContaining({ assignment: "assigned", page: 1, pageSize: 8 }) });

    await user.selectOptions(screen.getByLabelText("Branch assignment"), "unassigned");
    await waitFor(() => expect(get).toHaveBeenCalledWith("/admin/products", { params: expect.objectContaining({ assignment: "unassigned" }) }));
    await user.selectOptions(screen.getByLabelText("Branch assignment"), "all");
    await waitFor(() => expect(get).toHaveBeenCalledWith("/admin/products", { params: expect.objectContaining({ assignment: "all" }) }));
  });

  it("shows distinct Inactive / Unassigned / Zero stock states and loads real categories", async () => {
    stubGet();
    render(<Products />);
    await screen.findAllByText("Active Eggs");
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Zero stock").length).toBeGreaterThan(0);
    // categories come from the paged API, not the demo store
    await waitFor(() => expect(screen.getByRole("option", { name: "Eggs" })).toBeTruthy());
  });

  it("disables stock adjustment for an unassigned product and deactivation for an inactive one", async () => {
    stubGet();
    render(<Products />);
    await screen.findAllByText("Active Eggs");
    expect((screen.getAllByLabelText("Adjust stock for Hidden Rice")[0] as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getAllByLabelText("Adjust stock for Active Eggs")[0] as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getAllByLabelText("Deactivate Gone Milk in all branches")[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it("Remove is now 'Deactivate in all branches' and calls the soft-delete endpoint after confirmation", async () => {
    stubGet();
    const del = vi.spyOn(apiClient, "delete").mockResolvedValue({ data: undefined });
    const user = userEvent.setup();
    render(<Products />);
    await screen.findAllByText("Active Eggs");
    expect(screen.queryByLabelText(/^Remove /)).toBeNull();
    await user.click(screen.getAllByLabelText("Deactivate Active Eggs in all branches")[0]);
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Deactivate in all branches?")).toBeTruthy();
    expect(del).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/admin/products/a"));
  });

  it("Branches opens the assignment drawer (no price controls) and the list refreshes after a change", async () => {
    const get = stubGet();
    vi.spyOn(apiClient, "put").mockResolvedValue({ data: { assigned: false, changed: true } });
    const user = userEvent.setup();
    render(<Products />);
    await screen.findAllByText("Active Eggs");
    await user.click(screen.getAllByLabelText("Branches for Active Eggs")[0]);
    expect(await screen.findByText("Branch Assignments")).toBeTruthy();
    expect(screen.queryByLabelText(/Branch price override/i)).toBeNull();

    const before = get.mock.calls.filter((c) => c[0] === "/admin/products" && (c[1] as any).params.pageSize === 8).length;
    await user.click(screen.getByRole("button", { name: "Unassign" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Unassign" }));
    await waitFor(() => {
      const after = get.mock.calls.filter((c) => c[0] === "/admin/products" && (c[1] as any).params.pageSize === 8).length;
      expect(after).toBeGreaterThan(before);
    });
  });
});
