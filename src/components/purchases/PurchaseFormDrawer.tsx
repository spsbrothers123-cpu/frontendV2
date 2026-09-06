import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Drawer, Button, Input, Select } from "../ui";
import { ProductFormDrawer } from "../products/ProductFormDrawer";
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
  productSuggestions: Product[];
  productCategories: string[];
  onCreateProduct: (values: ProductFormValues) => Promise<Product>;
}

export function PurchaseFormDrawer({
  isOpen, onClose, onSubmit, supplierSuggestions, productSuggestions, productCategories, onCreateProduct,
}: PurchaseFormDrawerProps) {
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [items, setItems] = useState<LineItemDraft[]>([emptyLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Row index (if any) currently requesting a brand-new catalog product —
  // reuses the same ProductFormDrawer the Products page uses, so "Add
  // Product in Catalog" never needs its own separate screen.
  const [quickAddRowIndex, setQuickAddRowIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSupplierName(""); setInvoiceNumber(""); setPurchaseDate(today());
      setItems([emptyLine()]); setErrors({});
      setQuickAddRowIndex(null);
    }
  }, [isOpen]);

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
    if (items.length === 0) next.items = "Add at least one product.";
    items.forEach((it, i) => {
      if (it.mode === "catalog") {
        if (!it.productId) next[`item-${i}-name`] = "Select a product, or switch to a one-time item.";
      } else if (!it.productName.trim()) {
        next[`item-${i}-name`] = "Enter an item name.";
      }
      if (it.quantity === "" || Number(it.quantity) <= 0) next[`item-${i}-qty`] = "Required";
      if (it.purchasePrice === "" || Number(it.purchasePrice) < 0) next[`item-${i}-price`] = "Required";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const values: PurchaseFormValues = {
        supplierName, invoiceNumber, purchaseDate,
        items: items.map((it): PurchaseFormItemValues => ({
          // Omitting productId entirely is what tells the backend this is
          // a purchase-only item — it never touches the Product Catalog.
          ...(it.mode === "catalog" ? { productId: it.productId } : {}),
          productName: it.productName,
          quantity: Number(it.quantity),
          unit: it.unit,
          purchasePrice: Number(it.purchasePrice),
        })),
      };
      await onSubmit(values);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickAddProduct(values: ProductFormValues): Promise<void> {
    const product = await onCreateProduct(values);
    if (quickAddRowIndex !== null) {
      updateItem(quickAddRowIndex, { productId: product.id, productName: product.name, unit: product.unit });
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Purchase"
      subtitle="Record a new stock purchase from a supplier"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={submitting}>Save purchase</Button>
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
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === NEW_PRODUCT_OPTION) { setQuickAddRowIndex(i); return; }
                      const match = productSuggestions.find((p) => p.id === val);
                      updateItem(i, { productId: val, productName: match?.name ?? "", unit: match?.unit ?? it.unit });
                    }}
                    options={[
                      { label: "Select a product…", value: "" },
                      ...productSuggestions.map((p) => ({ label: p.name, value: p.id })),
                      { label: "+ Add new product…", value: NEW_PRODUCT_OPTION },
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
                    type="number" min={0} placeholder="Qty" value={it.quantity} error={errors[`item-${i}-qty`]}
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

        <div className="rounded-btn bg-ivory-soft p-3.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-charcoal">Grand Total</span>
          <span className="font-display font-bold text-lg text-charcoal">₹{subtotal.toLocaleString("en-IN")}</span>
        </div>
      </form>

      <ProductFormDrawer
        isOpen={quickAddRowIndex !== null}
        onClose={() => setQuickAddRowIndex(null)}
        onSubmit={handleQuickAddProduct}
        categories={productCategories}
      />
    </Drawer>
  );
}
