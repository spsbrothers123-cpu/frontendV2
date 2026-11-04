import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Drawer, Button, Input, Select } from "../ui";
import { ProductFormDrawer } from "../products/ProductFormDrawer";
import { ConfirmPurchaseModal } from "./ConfirmPurchaseModal";
import { PurchaseModalShell } from "./PurchaseModalShell";
import { catalogLinesAtRisk, quantityError } from "./purchaseRules";
import { useStockCashier } from "../../hooks/useStockCashier";
import { useShop } from "../../context/ShopContext";
import type { PurchaseFormValues, PurchaseFormItemValues, ProductUnit, Product, ProductFormValues } from "../../types";

const unitOptions: { label: string; value: ProductUnit }[] = [
  { label: "kg", value: "kg" }, { label: "g", value: "g" }, { label: "litre", value: "litre" },
  { label: "ml", value: "ml" }, { label: "piece", value: "piece" }, { label: "tray", value: "tray" }, { label: "box", value: "box" },
];

const NEW_PRODUCT_OPTION = "__add_new_product__";

type ItemMode = "catalog" | "one-time";

interface LineItemDraft {
  mode: ItemMode;
  productId: string; // only meaningful when mode === "catalog"
  productName: string;
  quantity: number | "";
  unit: ProductUnit;
  purchasePrice: number | "";
}

function emptyLine(): LineItemDraft {
  return { mode: "catalog", productId: "", productName: "", quantity: "", unit: "tray", purchasePrice: "" };
}

function today() { return new Date().toISOString().slice(0, 10); }

interface PurchaseFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: PurchaseFormValues) => Promise<void>;
  supplierSuggestions: string[];
  /**
   * Stage 3.4 — loads the catalog of the RECEIVING branch the Admin chose
   * (never the Global Shop Selector's). Called again whenever that choice changes.
   */
  loadCatalog: (shopId: string) => Promise<Product[]>;
  productCategories: string[];
  onCreateProduct: (values: ProductFormValues) => Promise<Product>;
}

export function PurchaseFormDrawer({
  isOpen, onClose, onSubmit, supplierSuggestions, loadCatalog, productCategories, onCreateProduct,
}: PurchaseFormDrawerProps) {
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today());
  // Phase 2 Stage 2.6: the receiving branch is chosen EXPLICITLY — it never
  // defaults to the Global Shop Selector, and changing that selector later
  // cannot move this purchase. Stock increases only at this branch.
  const { availableShops, selectedShop } = useShop();
  const [receivingShopId, setReceivingShopId] = useState("");
  const [items, setItems] = useState<LineItemDraft[]>([emptyLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false); // blocks a double click before React re-renders

  // The catalog offered in the product picker belongs to the RECEIVING branch.
  // Results are stored WITH the branch they were loaded for and only read back
  // for the branch currently chosen, so another branch's products can never be
  // offered — even if a slow response lands late.
  const [loaded, setLoaded] = useState<{ shopId: string; list: Product[] } | null>(null);
  const [failed, setFailed] = useState<{ shopId: string; message: string } | null>(null);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const catalog = loaded && loaded.shopId === receivingShopId ? loaded.list : [];
  const catalogError = failed && failed.shopId === receivingShopId ? failed.message : "";
  const catalogState: "idle" | "loading" | "ready" | "error" =
    !isOpen || !receivingShopId ? "idle"
    : loaded?.shopId === receivingShopId ? "ready"
    : failed?.shopId === receivingShopId ? "error"
    : "loading";

  // Branch change that would discard picked products waits here for a decision.
  const [pendingBranchId, setPendingBranchId] = useState<string | null>(null);
  // The exact values the Admin confirmed — what is shown IS what is sent.
  const [pendingValues, setPendingValues] = useState<PurchaseFormValues | null>(null);
  const [submitError, setSubmitError] = useState("");

  // The RECEIVING branch's single cashier is actor metadata (required by the
  // backend only before the BranchInventory cutover). Picker only for a
  // legacy multi-cashier conflict.
  const sc = useStockCashier(isOpen && !!receivingShopId, receivingShopId || null);
  const cashierId = sc.cashierId;

  // Row index (if any) currently requesting a brand-new catalog product —
  // reuses the same ProductFormDrawer the Products page uses, so "Add
  // Product in Catalog" never needs its own separate screen.
  const [quickAddRowIndex, setQuickAddRowIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSupplierName(""); setInvoiceNumber(""); setPurchaseDate(today());
      setReceivingShopId("");
      setItems([emptyLine()]); setErrors({});
      setQuickAddRowIndex(null);
      setPendingBranchId(null); setPendingValues(null); setSubmitError("");
      setLoaded(null); setFailed(null);
    }
  }, [isOpen]);

  // Load the catalog for the chosen receiving branch (again on retry).
  useEffect(() => {
    if (!isOpen || !receivingShopId) return;
    let cancelled = false;
    loadCatalog(receivingShopId)
      .then((list) => { if (!cancelled) { setLoaded({ shopId: receivingShopId, list }); setFailed(null); } })
      .catch((err: any) => {
        if (!cancelled) setFailed({ shopId: receivingShopId, message: err?.message || "Couldn't load this branch's products." });
      });
    return () => { cancelled = true; };
  }, [isOpen, receivingShopId, loadCatalog, catalogAttempt]);

  const branchName = (id: string) => availableShops.find((s) => s.id === id)?.name ?? "the chosen branch";

  function applyBranch(id: string, clearCatalogLines: boolean) {
    setReceivingShopId(id);
    setErrors((e) => { const { receivingShopId: _drop, ...rest } = e; return rest; });
    if (clearCatalogLines) {
      // Lines that pointed at the previous branch's products are removed;
      // one-time (purchase-list-only) lines and untouched rows are kept.
      setItems((prev) => {
        const kept = prev.filter((it) => !(it.mode === "catalog" && it.productId));
        return kept.length > 0 ? kept : [emptyLine()];
      });
    }
  }

  function handleBranchChange(id: string) {
    if (id === receivingShopId) return;
    if (catalogLinesAtRisk(items).length > 0) { setPendingBranchId(id); return; }
    applyBranch(id, false);
  }

  function updateItem(index: number, patch: Partial<LineItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function setMode(index: number, mode: ItemMode) {
    // Switching modes clears whatever the other mode had filled in, so a
    // catalog selection never accidentally ships as a one-time name (or
    // vice versa).
    updateItem(index, { mode, productId: "", productName: "" });
  }

  function addRow() { setItems((prev) => [...prev, emptyLine()]); }
  function removeRow(index: number) { setItems((prev) => prev.filter((_, i) => i !== index)); }

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.purchasePrice) || 0), 0);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!supplierName.trim()) next.supplierName = "Supplier is required.";
    if (!invoiceNumber.trim()) next.invoiceNumber = "Invoice number is required.";
    if (!purchaseDate) next.purchaseDate = "Purchase date is required.";
    if (!receivingShopId) next.receivingShopId = "Select the branch that is receiving this stock.";
    if (receivingShopId && sc.needsPicker && !cashierId) next.cashierId = "Select which cashier's legacy stock receives this.";
    if (items.length === 0) next.items = "Add at least one product.";
    items.forEach((it, i) => {
      if (it.mode === "catalog") {
        if (!it.productId) next[`item-${i}-name`] = "Select a product, or switch to a one-time item.";
      } else if (!it.productName.trim()) {
        next[`item-${i}-name`] = "Enter an item name.";
      }
      const qtyProblem = quantityError(it.quantity);
      if (qtyProblem) next[`item-${i}-qty`] = qtyProblem;
      if (it.purchasePrice === "" || Number(it.purchasePrice) < 0) next[`item-${i}-price`] = "Required";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Step 1: validate and freeze the values, then ask for explicit confirmation.
  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (submitting || catalogState === "loading") return;
    if (!validate()) return;
    setSubmitError("");
    setPendingValues({
      supplierName, invoiceNumber, purchaseDate, receivingShopId,
      ...(cashierId ? { cashierId } : {}),
      items: items.map((it): PurchaseFormItemValues => ({
        // Omitting productId entirely is what tells the backend this is
        // a purchase-only item — it never touches the Product Catalog.
        ...(it.mode === "catalog" ? { productId: it.productId } : {}),
        productName: it.productName,
        quantity: Number(it.quantity),
        unit: it.unit,
        purchasePrice: Number(it.purchasePrice),
      })),
    });
  }

  // Step 2: the Admin has seen the receiving branch — now create the purchase.
  async function confirmSubmit() {
    if (!pendingValues || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      await onSubmit(pendingValues);
      setPendingValues(null);
      onClose();
    } catch (err: any) {
      // The page already toasted the error; keep the form (and every value) so
      // nothing has to be re-entered.
      setPendingValues(null);
      setSubmitError(err?.message || "Couldn't save the purchase.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  // While a confirmation, warning or request is open, Escape / backdrop /
  // Cancel on the drawer must not silently throw the draft away.
  const modalOpen = pendingValues !== null || pendingBranchId !== null || submitting;
  function guardedClose() { if (!modalOpen) onClose(); }

  async function handleQuickAddProduct(values: ProductFormValues): Promise<void> {
    const product = await onCreateProduct(values);
    // The backend assigns a new product to every branch, so it is valid at the
    // receiving branch too — offer it in this branch's picker immediately.
    setLoaded((prev) =>
      prev && prev.shopId === receivingShopId && !prev.list.some((p) => p.id === product.id)
        ? { shopId: prev.shopId, list: [...prev.list, product] }
        : prev
    );
    if (quickAddRowIndex !== null) {
      updateItem(quickAddRowIndex, { productId: product.id, productName: product.name, unit: product.unit });
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={guardedClose}
      title="Create Purchase"
      subtitle="Record a new stock purchase from a supplier"
      footer={
        <>
          <Button variant="secondary" onClick={guardedClose} disabled={submitting}>Cancel</Button>
          <Button onClick={() => handleSubmit()} disabled={catalogState === "loading"}>Save purchase</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Supplier / Dealer" required value={supplierName} error={errors.supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          placeholder="e.g. Sri Balaji Poultry Farm"
          list="supplier-suggestions"
        />
        <datalist id="supplier-suggestions">
          {supplierSuggestions.map((s) => <option key={s} value={s} />)}
        </datalist>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Invoice Number" required value={invoiceNumber} error={errors.invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-1234" />
          <Input label="Purchase Date" required type="date" value={purchaseDate} error={errors.purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </div>

        <Select
          label="Receiving branch"
          required
          hint="Stock from this purchase is added only at this branch. It cannot be changed after saving — corrections use a reversal."
          value={receivingShopId}
          error={errors.receivingShopId}
          onChange={(e) => handleBranchChange(e.target.value)}
          options={[
            { label: "Select a branch…", value: "" },
            ...availableShops.map((s) => ({ label: s.name, value: s.id })),
          ]}
        />
        {receivingShopId && selectedShop && receivingShopId !== selectedShop.id && (
          <p className="text-xs text-charcoal-muted">
            You are viewing {selectedShop.name}; this purchase will be saved against the branch chosen above.
            Its Purchases list appears when that branch is selected.
          </p>
        )}
        {receivingShopId && catalogState === "loading" && (
          <p role="status" className="text-xs text-charcoal-muted">Loading {branchName(receivingShopId)}'s products…</p>
        )}
        {receivingShopId && catalogState === "error" && (
          <p role="alert" className="text-sm text-danger">
            {catalogError}{" "}
            <button type="button" className="underline font-medium" onClick={() => { setFailed(null); setCatalogAttempt((n) => n + 1); }}>Retry</button>
          </p>
        )}
        {sc.needsPicker && (
          <Select
            label="Cashier (legacy stock owner)"
            required
            hint="This branch still has more than one cashier — resolve that with the owner."
            value={cashierId}
            error={errors.cashierId}
            onChange={(e) => sc.setPicked(e.target.value)}
            options={[{ label: "Select a cashier…", value: "" }, ...sc.cashiers.map((c) => ({ label: c.name, value: c.id }))]}
          />
        )}
        {sc.error && <p role="alert" className="text-sm text-danger">{sc.error}</p>}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-charcoal">Products</p>
            <Button type="button" variant="ghost" size="sm" onClick={addRow}><Plus size={14} /> Add row</Button>
          </div>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="rounded-btn border border-charcoal/10 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  {/* The two Phase 2A options, made visually and textually explicit per row. */}
                  <div role="tablist" aria-label="How this item should be added" className="flex items-center gap-1 bg-charcoal/5 rounded-btn p-1 w-fit">
                    <button
                      type="button" role="tab" aria-selected={it.mode === "catalog"}
                      onClick={() => setMode(i, "catalog")}
                      className={`px-2.5 py-1 rounded-[7px] text-xs font-medium transition-all duration-150 ${it.mode === "catalog" ? "bg-white text-charcoal shadow-soft" : "text-charcoal-muted hover:text-charcoal"}`}
                    >
                      Add Product in Catalog
                    </button>
                    <button
                      type="button" role="tab" aria-selected={it.mode === "one-time"}
                      onClick={() => setMode(i, "one-time")}
                      className={`px-2.5 py-1 rounded-[7px] text-xs font-medium transition-all duration-150 ${it.mode === "one-time" ? "bg-white text-charcoal shadow-soft" : "text-charcoal-muted hover:text-charcoal"}`}
                    >
                      Purchase List Only
                    </button>
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)} aria-label="Remove row" className="w-9 h-9 rounded-btn flex items-center justify-center hover:bg-danger-soft hover:text-danger transition-colors duration-150 shrink-0">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {it.mode === "catalog" ? (
                  <Select
                    value={it.productId} error={errors[`item-${i}-name`]}
                    disabled={!receivingShopId || catalogState === "loading"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === NEW_PRODUCT_OPTION) { setQuickAddRowIndex(i); return; }
                      const match = catalog.find((p) => p.id === val);
                      updateItem(i, { productId: val, productName: match?.name ?? "", unit: match?.unit ?? it.unit });
                    }}
                    options={[
                      {
                        label: !receivingShopId ? "Choose the receiving branch first…" : catalogState === "loading" ? "Loading products…" : "Select a product…",
                        value: "",
                      },
                      ...catalog.map((p) => ({ label: p.status === "inactive" ? `${p.name} (inactive)` : p.name, value: p.id })),
                      ...(receivingShopId ? [{ label: "+ Add new product…", value: NEW_PRODUCT_OPTION }] : []),
                    ]}
                  />
                ) : (
                  <>
                    <Input
                      value={it.productName} error={errors[`item-${i}-name`]}
                      onChange={(e) => updateItem(i, { productName: e.target.value })}
                      placeholder="Item name (e.g. Packing tape, one-off crate rental)"
                    />
                    <p className="text-xs text-charcoal-muted">
                      Added to this purchase only — it won't be saved to your Product Catalog or available for cashier sales.
                    </p>
                  </>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number" min={1} step={1} inputMode="numeric" placeholder="Qty" value={it.quantity} error={errors[`item-${i}-qty`]}
                    onChange={(e) => updateItem(i, { quantity: e.target.value === "" ? "" : Number(e.target.value) })}
                  />
                  <Select
                    options={unitOptions} value={it.unit}
                    onChange={(e) => updateItem(i, { unit: e.target.value as ProductUnit })}
                  />
                  <Input
                    type="number" min={0} step="0.01" placeholder="Price" value={it.purchasePrice} error={errors[`item-${i}-price`]}
                    onChange={(e) => updateItem(i, { purchasePrice: e.target.value === "" ? "" : Number(e.target.value) })}
                  />
                </div>
                <p className="text-xs text-charcoal-muted text-right">
                  Total: ₹{((Number(it.quantity) || 0) * (Number(it.purchasePrice) || 0)).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {submitError && <p role="alert" className="text-sm text-danger">{submitError}</p>}

        <div className="rounded-btn bg-ivory-soft p-3.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-charcoal">Grand Total</span>
          <span className="font-display font-bold text-lg text-charcoal">₹{subtotal.toLocaleString("en-IN")}</span>
        </div>
      </form>

      {pendingValues && (
        <ConfirmPurchaseModal
          receivingBranchName={branchName(pendingValues.receivingShopId)}
          viewingBranchName={selectedShop?.name}
          viewingDiffers={!!selectedShop && selectedShop.id !== pendingValues.receivingShopId}
          supplierName={pendingValues.supplierName}
          invoiceNumber={pendingValues.invoiceNumber}
          purchaseDate={pendingValues.purchaseDate}
          lines={pendingValues.items.map((it) => ({
            name: it.productName, quantity: it.quantity, unit: it.unit, purchasePrice: it.purchasePrice, inCatalog: !!it.productId,
          }))}
          total={pendingValues.items.reduce((sum, it) => sum + it.quantity * it.purchasePrice, 0)}
          submitting={submitting}
          onCancel={() => setPendingValues(null)}
          onConfirm={confirmSubmit}
        />
      )}

      {pendingBranchId && (
        <PurchaseModalShell
          title="Change receiving branch?"
          onClose={() => setPendingBranchId(null)}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setPendingBranchId(null)}>Keep {branchName(receivingShopId)}</Button>
              <Button variant="danger" size="sm" onClick={() => { applyBranch(pendingBranchId, true); setPendingBranchId(null); }}>
                Change branch &amp; clear lines
              </Button>
            </>
          }
        >
          <p>
            Products are specific to a branch. Switching from <strong>{branchName(receivingShopId)}</strong> to{" "}
            <strong>{branchName(pendingBranchId)}</strong> will remove the catalog lines you have already picked:
          </p>
          <ul className="list-disc pl-5 text-charcoal-muted">
            {catalogLinesAtRisk(items).map((it, i) => <li key={i}>{it.productName || "Selected product"}</li>)}
          </ul>
          <p className="text-xs text-charcoal-muted">Purchase-list-only items are kept.</p>
        </PurchaseModalShell>
      )}

      <ProductFormDrawer
        isOpen={quickAddRowIndex !== null}
        onClose={() => setQuickAddRowIndex(null)}
        onSubmit={handleQuickAddProduct}
        categories={productCategories}
        hideInitialStock
      />
    </Drawer>
  );
}
