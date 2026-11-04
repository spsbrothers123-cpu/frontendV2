// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const showToast = vi.fn();
vi.mock("../src/context/ToastContext", () => ({ useToast: () => ({ showToast }) }));

// The Cashiers page must not depend on the Global Shop Selector at all.
const useShop = vi.fn(() => { throw new Error("Cashiers must not read the selected shop"); });
vi.mock("../src/context/ShopContext", () => ({ useShop: () => useShop() }));

vi.mock("../src/components/cashiers/InvitationCodeSection", () => ({ InvitationCodeSection: () => null }));

let requests: any[] = [];
let cashiers: any[] = [];
const approve = vi.fn();
const setStatus = vi.fn();
vi.mock("../src/api/cashiers", () => ({
  fetchCashierRequests: vi.fn(async () => requests),
  fetchCashiers: vi.fn(async () => cashiers),
  approveCashierRequest: (...a: any[]) => approve(...a),
  rejectCashierRequest: vi.fn(),
  setCashierStatus: (...a: any[]) => setStatus(...a),
  updateCashier: vi.fn(),
}));

import Cashiers from "../src/pages/Cashiers";
import { activeCashierAtBranch, branchCashierError } from "../src/components/cashiers/branchCashierRules";

const req = (id: string, shop: string) => ({
  id, name: `R-${id}`, email: `${id}@x.in`, username: id, phone: null, shop: { id: shop, name: `Shop ${shop}` },
  branchName: "typed text", invitationCodeMasked: "••", signupDate: "2026-10-01T00:00:00Z", status: "PENDING_ADMIN_APPROVAL",
});
const cash = (id: string, shop: string, active = true) => ({
  id, name: `C-${id}`, email: `${id}@x.in`, role: "cashier", active, shop: { id: shop, name: `Shop ${shop}` },
});

afterEach(() => { cleanup(); showToast.mockReset(); approve.mockReset(); setStatus.mockReset(); requests = []; cashiers = []; });

describe("branchCashierRules", () => {
  it("finds the active cashier at a branch, ignoring suspended ones and the excluded id", () => {
    const list = [cash("a", "s1"), cash("b", "s2", false), cash("c", "s3")] as any[];
    expect(activeCashierAtBranch(list, "s1")?.id).toBe("a");
    expect(activeCashierAtBranch(list, "s2")).toBeNull();
    expect(activeCashierAtBranch(list, "s1", "a")).toBeNull();
    expect(activeCashierAtBranch(list, null)).toBeNull();
  });
  it("words the backend's one-cashier refusals", () => {
    expect(branchCashierError({ code: "BRANCH_HAS_CASHIER", message: "x" }, "f")).toMatch(/Suspend the current cashier/);
    expect(branchCashierError({ code: "REPLACEMENT_REQUIRES_BRANCH_INVENTORY" }, "f")).toMatch(/cutover/);
    expect(branchCashierError({ message: "boom" }, "f")).toBe("boom");
    expect(branchCashierError(null, "fallback")).toBe("fallback");
  });
});

describe("Cashiers page — one cashier per branch", () => {
  it("disables Approve for a branch that already has a cashier, and explains why", async () => {
    requests = [req("r1", "s1"), req("r2", "s2")];
    cashiers = [cash("a", "s1")];
    render(<Cashiers />);
    await screen.findAllByText("R-r1");
    // DataTable renders a table and a mobile card list, so each request shows twice.
    const approves = screen.getAllByRole("button", { name: "Approve" }) as HTMLButtonElement[];
    expect(approves.filter((b) => b.disabled)).toHaveLength(2); // r1: s1 already has C-a
    expect(approves.filter((b) => !b.disabled)).toHaveLength(2); // r2: s2 is free
    expect(screen.getAllByText(/already has C-a/i).length).toBeGreaterThan(0);
  });

  it("doesn't read the Global Shop Selector", async () => {
    requests = [req("r1", "s1")];
    render(<Cashiers />);
    await screen.findAllByText("R-r1");
    expect(useShop).not.toHaveBeenCalled();
  });

  it("shows the backend's refusal if approval still loses a race (409)", async () => {
    requests = [req("r1", "s1")];
    approve.mockRejectedValue({ status: 409, code: "BRANCH_HAS_CASHIER", message: "raw" });
    const user = userEvent.setup();
    render(<Cashiers />);
    await screen.findAllByText("R-r1");
    await user.click(screen.getAllByRole("button", { name: "Approve" })[0]);
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toMatch(/one cashier for Shop s1/);
    await user.click(within(dialog).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/already has a cashier/i), "error"));
  });

  it("labels the real branch separately from the free-text signup name", async () => {
    requests = [req("r1", "s1")];
    render(<Cashiers />);
    await screen.findAllByText("R-r1");
    expect(screen.getAllByText("Branch").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Signup branch name").length).toBeGreaterThan(0);
  });

  it("tells the Admin that suspending keeps history and stock, and surfaces a blocked reactivation", async () => {
    cashiers = [cash("a", "s1", false)];
    setStatus.mockRejectedValue({ status: 409, code: "BRANCH_HAS_CASHIER", message: "raw" });
    const user = userEvent.setup();
    render(<Cashiers />);
    await user.click(await screen.findByRole("tab", { name: "Cashiers" }));
    await user.click((await screen.findAllByRole("button", { name: "Reactivate" }))[0]);
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toMatch(/no other cashier/);
    await user.click(within(dialog).getByRole("button", { name: "Reactivate" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/Suspend the current cashier/), "error"));
  });
});
