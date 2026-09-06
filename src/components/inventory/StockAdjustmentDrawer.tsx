import { useEffect, useState } from "react";
import { Drawer, Button, Select, Input, Textarea, ConfirmModal } from "../ui";
import type { Product, StockAdjustmentFormValues, AdjustmentType } from "../../types";

const REASON_OPTIONS = ["Breakage / damage", "Stock count correction", "Expired / spoiled", "Returned by customer", "Other"];

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
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProductId(presetProduct?.id ?? products[0]?.id ?? "");
      setAdjustmentType("add");
      setQuantity("");
      setReason(REASON_OPTIONS[0]);
      setNotes("");
      setError(null);
      setConfirming(false);
    }
  }, [isOpen, presetProduct, products]);

  const selectedProduct = products.find((p) => p.id === productId) ?? null;
  const qtyNum = Number(quantity) || 0;
  const newStock = selectedProduct
    ? Math.max(0, selectedProduct.stock + (adjustmentType === "add" ? qtyNum : -qtyNum))
    : 0;

  function handleReviewSubmit() {
    setError(null);
    if (!productId) return setError("Choose a product.");
    if (!qtyNum || qtyNum <= 0) return setError("Enter a quantity greater than zero.");
    setConfirming(true);
  }

  async function handleConfirm() {
    if (submitting) return; // guards against duplicate submissions
    setSubmitting(true);
    try {
      await onSubmit({ productId, adjustmentType, quantity: qtyNum, reason, notes });
      setConfirming(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Couldn't submit the adjustment.");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="New Stock Adjustment"
        subtitle="Corrects stock levels outside of normal sales or purchases."
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
            onChange={(e) => setProductId(e.target.value)}
            options={products.map((p) => ({ label: `${p.name} (${p.stock} ${p.unit} in stock)`, value: p.id }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Adjustment Type"
              required
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
              options={[
                { label: "Add stock", value: "add" },
                { label: "Remove stock", value: "remove" },
              ]}
            />
            <Input
              label="Quantity"
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <Select
            label="Reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={REASON_OPTIONS.map((r) => ({ label: r, value: r }))}
          />
          <Textarea label="Notes" hint="Optional context for this adjustment." value={notes} onChange={(e) => setNotes(e.target.value)} />

          {selectedProduct && (
            <div className="rounded-btn bg-ivory-soft p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Current Stock</p>
                <p className="font-display font-bold text-charcoal">{selectedProduct.stock} {selectedProduct.unit}(s)</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">New Stock Preview</p>
                <p className="font-display font-bold text-olive">{newStock} {selectedProduct.unit}(s)</p>
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
        description={`${adjustmentType === "add" ? "Add" : "Remove"} ${qtyNum} ${selectedProduct?.unit ?? ""}(s) ${adjustmentType === "add" ? "to" : "from"} "${selectedProduct?.name}". Stock will change from ${selectedProduct?.stock} to ${newStock}.`}
        confirmLabel="Confirm Adjustment"
        isLoading={submitting}
      />
    </>
  );
}
