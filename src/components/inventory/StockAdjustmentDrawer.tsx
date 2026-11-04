import { useEffect, useMemo, useState } from "react";
import { Drawer, Button, Select, Input, Textarea, ConfirmModal } from "../ui";
import { useStockCashier } from "../../hooks/useStockCashier";
import { useShop } from "../../context/ShopContext";
import { useBranchProductStock } from "../../hooks/useBranchProductStock";
import { friendlyError } from "../../lib/apiMessages";
import { getStockRecordState, NO_RECORD_HINT } from "../../lib/stockRecord";
import { ADJUSTMENT_REASONS, OTHER_REASON, validateAdjustment } from "./adjustmentRules";
import type { Product, StockAdjustmentFormValues, AdjustmentType } from "../../types";

interface StockAdjustmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: StockAdjustmentFormValues) => Promise<void>;
  products: Product[];
  presetProduct?: Product | null;
}

export function StockAdjustmentDrawer({ isOpen, onClose, onSubmit, products, presetProduct }: StockAdjustmentDrawerProps) {
  const [productId, setProductId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("add");
  const [quantity, setQuantity] = useState<number | "">("");
  // No reason is pre-selected: the admin must choose one deliberately.
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { selectedShop } = useShop();
  // Stock is branch-owned; the branch's single cashier is actor metadata and
  // resolved automatically (a picker appears only for a legacy conflict).
  const sc = useStockCashier(isOpen);
  const cashierId = sc.cashierId;

  // The preset product (per-row "Adjust") is always selectable, even if the
  // fetched list has not caught up with it yet.
  const options = useMemo(
    () => (presetProduct && !products.some((p) => p.id === presetProduct.id) ? [presetProduct, ...products] : products),
    [products, presetProduct]
  );

  useEffect(() => {
    if (isOpen) {
      setProductId(presetProduct?.id ?? "");
      setAdjustmentType("add");
      setQuantity("");
      setReason("");
      setNotes("");
      setError(null);
      setConfirming(false);
    }
    // Reset only when the drawer opens or its target changes — not when the
    // product list refreshes underneath an open form.
  }, [isOpen, presetProduct]);

  const selectedProduct = options.find((p) => p.id === productId) ?? null;
  // This BRANCH's current quantity for the product (never the all-branch total).
  const stock = useBranchProductStock(isOpen ? productId : null);
  const qtyNum = Number(quantity) || 0;
  const newStock = stock.quantity != null ? Math.max(0, stock.quantity + (adjustmentType === "add" ? qtyNum : -qtyNum)) : null;
  // Only a loaded quantity of 0 with no inventory row — never a failed read.
  const noRecord = stock.quantity != null && getStockRecordState({ stock: stock.quantity, inventoryRecorded: stock.inventoryRecorded }) === "none";

  function handleReviewSubmit() {
    setError(null);
    if (sc.needsPicker && !cashierId) return setError("Choose which cashier's legacy stock this applies to.");
    const problem = validateAdjustment({
      productId, adjustmentType, quantity, reason, notes,
      currentStock: stock.quantity, stockLoading: stock.isLoading, unit: selectedProduct?.unit ?? "unit",
    });
    if (problem) return setError(problem);
    setConfirming(true);
  }

  async function handleConfirm() {
    if (submitting) return; // guards against duplicate submissions
    setSubmitting(true);
    try {
      await onSubmit({
        productId,
        ...(cashierId ? { cashierId } : {}),
        adjustmentType,
        quantity: qtyNum,
        reason,
        notes: notes.trim(),
      });
      setConfirming(false);
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Couldn't submit the adjustment."));
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  const otherSelected = reason === OTHER_REASON;

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="New Stock Adjustment"
        subtitle={`Corrects stock at ${selectedShop?.name ?? "the selected branch"} outside of normal sales or purchases.`}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleReviewSubmit}>Review Adjustment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Product"
            required
            value={productId}
            onChange={(e) => { setProductId(e.target.value); setError(null); }}
            options={[
              { label: "Select a product…", value: "" },
              ...options.map((p) => ({
                label: `${p.name} (${p.inventoryRecorded === false && p.stock === 0 ? "no record" : `${p.stock} ${p.unit}`} here)`,
                value: p.id,
              })),
            ]}
          />
          {sc.needsPicker && (
            <Select
              label="Cashier (legacy stock owner)"
              required
              hint="This branch still has more than one cashier — resolve that with the owner."
              value={cashierId}
              onChange={(e) => sc.setPicked(e.target.value)}
              disabled={sc.isLoading}
              options={[{ label: "Select a cashier…", value: "" }, ...sc.cashiers.map((c) => ({ label: c.name, value: c.id }))]}
            />
          )}
          {sc.error && <p role="alert" className="text-sm text-danger">{sc.error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Adjustment Type"
              required
              value={adjustmentType}
              onChange={(e) => { setAdjustmentType(e.target.value as AdjustmentType); setError(null); }}
              options={[
                { label: "Add stock", value: "add" },
                { label: "Remove stock", value: "remove" },
              ]}
            />
            <Input
              label="Quantity"
              type="number"
              min={1}
              step={1}
              required
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value === "" ? "" : Number(e.target.value)); setError(null); }}
            />
          </div>
          <Select
            label="Reason"
            required
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(null); }}
            options={[{ label: "Select a reason…", value: "" }, ...ADJUSTMENT_REASONS.map((r) => ({ label: r, value: r }))]}
          />
          <Textarea
            label="Notes"
            required={otherSelected}
            hint={otherSelected ? "Required — explain what this adjustment is for." : "Optional context for this adjustment."}
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setError(null); }}
          />

          {selectedProduct && (
            <div className="rounded-btn bg-ivory-soft p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Current Stock (this branch)</p>
                <p className="font-display font-bold text-charcoal">
                  {stock.isLoading ? "…" : stock.failed ? "Unavailable" : `${stock.quantity ?? 0} ${selectedProduct.unit}(s)`}
                </p>
                {noRecord && <p className="text-xs text-charcoal-muted mt-1">{NO_RECORD_HINT}</p>}
              </div>
              <div>
                <p className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">New Stock Preview</p>
                <p className="font-display font-bold text-olive">
                  {newStock != null ? `${newStock} ${selectedProduct.unit}(s)` : "…"}
                </p>
              </div>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-btn px-3.5 py-2.5">{error}</p>}
        </div>
      </Drawer>

      <ConfirmModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleConfirm}
        title="Confirm stock adjustment?"
        description={`${adjustmentType === "add" ? "Add" : "Remove"} ${qtyNum} ${selectedProduct?.unit ?? ""}(s) ${adjustmentType === "add" ? "to" : "from"} "${selectedProduct?.name}" at ${selectedShop?.name ?? "this branch"}. Reason: ${reason}${notes.trim() ? ` — ${notes.trim()}` : ""}. Stock will change from ${stock.quantity ?? 0} to ${newStock ?? "…"}.`}
        confirmLabel="Confirm Adjustment"
        isLoading={submitting}
      />
    </>
  );
}
