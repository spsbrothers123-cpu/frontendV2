import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Minus } from "lucide-react";
import { Button, Input, Select, Textarea } from "../ui";
import { useStockCashier } from "../../hooks/useStockCashier";
import { useBranchProductStock } from "../../hooks/useBranchProductStock";
import { friendlyError } from "../../lib/apiMessages";
import { getStockRecordState, NO_RECORD_HINT } from "../../lib/stockRecord";
import { ADJUSTMENT_REASONS, OTHER_REASON, validateAdjustment } from "../inventory/adjustmentRules";
import { useShop } from "../../context/ShopContext";
import type { Product, StockAdjustmentFormValues } from "../../types";

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Phase 2: submitted through POST /admin/inventory/adjustments, which
  // REQUIRES a reason. Central Admin only (enforced by the backend).
  onSubmit: (values: StockAdjustmentFormValues) => Promise<void>;
  product: Product | null;
}

export function AdjustStockModal({ isOpen, onClose, onSubmit, product }: AdjustStockModalProps) {
  const { selectedShop } = useShop();
  const [direction, setDirection] = useState<1 | -1>(1);
  const [amount, setAmount] = useState<number | "">("");
  // No reason is pre-selected: the admin must choose one deliberately.
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stock belongs to the branch; the single branch cashier is recorded as
  // actor metadata automatically. A picker appears only for a legacy
  // multi-cashier conflict.
  const sc = useStockCashier(isOpen);
  const stock = useBranchProductStock(isOpen ? product?.id : null);
  const currentStock = stock.quantity;

  useEffect(() => {
    if (isOpen) { setAmount(""); setDirection(1); setReason(""); setNotes(""); setError(null); }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  async function handleSubmit() {
    if (submitting) return;
    if (sc.needsPicker && !sc.cashierId) { setError("Choose which cashier's legacy stock this applies to."); return; }
    const problem = validateAdjustment({
      productId: product!.id,
      adjustmentType: direction === 1 ? "add" : "remove",
      quantity: amount, reason, notes,
      currentStock, stockLoading: stock.isLoading, unit: product!.unit,
    });
    if (problem) { setError(problem); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        productId: product!.id,
        ...(sc.cashierId ? { cashierId: sc.cashierId } : {}),
        adjustmentType: direction === 1 ? "add" : "remove",
        quantity: Number(amount),
        reason,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Couldn't update stock."));
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Adjust stock">
      <div className="absolute inset-0 bg-charcoal/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm bg-ivory-card rounded-card shadow-lift p-6 max-h-[92vh] overflow-y-auto">
        <h3 className="font-display font-bold text-lg text-charcoal mb-1">Adjust Stock</h3>
        <p className="text-sm text-charcoal-muted mb-5">
          {product.name} · {stock.isLoading ? "…" : stock.failed ? "stock unavailable" : `${currentStock ?? product.stock} ${product.unit}(s)`} at {selectedShop?.name ?? "this branch"}
        </p>
        {currentStock != null && getStockRecordState({ stock: currentStock, inventoryRecorded: stock.inventoryRecorded }) === "none" && (
          <p className="text-xs text-charcoal-muted -mt-3 mb-4">{NO_RECORD_HINT}</p>
        )}

        {sc.needsPicker && (
          <div className="mb-4">
            <Select
              label="Cashier (legacy stock owner)" required
              hint="This branch still has more than one cashier — resolve that with the owner."
              value={sc.cashierId} onChange={(e) => sc.setPicked(e.target.value)} disabled={sc.isLoading}
              options={[{ label: "Select a cashier…", value: "" }, ...sc.cashiers.map((c) => ({ label: c.name, value: c.id }))]}
            />
          </div>
        )}
        {sc.error && <p role="alert" className="text-sm text-danger mb-3">{sc.error}</p>}

        <div className="flex items-center gap-2 mb-4">
          <button
            type="button" onClick={() => setDirection(1)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-btn py-2.5 text-sm font-semibold transition-colors duration-150 ${direction === 1 ? "bg-olive-soft text-olive" : "bg-charcoal/5 text-charcoal-muted"}`}
          >
            <Plus size={15} /> Add stock
          </button>
          <button
            type="button" onClick={() => setDirection(-1)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-btn py-2.5 text-sm font-semibold transition-colors duration-150 ${direction === -1 ? "bg-danger-soft text-danger" : "bg-charcoal/5 text-charcoal-muted"}`}
          >
            <Minus size={15} /> Remove
          </button>
        </div>

        <div className="space-y-3">
          <Input
            label={`Quantity (${product.unit})`} type="number" min={1} step={1} value={amount} required
            onChange={(e) => { setAmount(e.target.value === "" ? "" : Number(e.target.value)); setError(null); }}
            autoFocus
          />
          <Select
            label="Reason" required value={reason}
            onChange={(e) => { setReason(e.target.value); setError(null); }}
            options={[{ label: "Select a reason…", value: "" }, ...ADJUSTMENT_REASONS.map((r) => ({ label: r, value: r }))]}
          />
          <Textarea
            label="Notes" required={reason === OTHER_REASON}
            hint={reason === OTHER_REASON ? "Required — explain what this adjustment is for." : "Optional context."}
            value={notes} onChange={(e) => { setNotes(e.target.value); setError(null); }}
          />
        </div>

        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-btn px-3.5 py-2.5 mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} isLoading={submitting}>Confirm</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
