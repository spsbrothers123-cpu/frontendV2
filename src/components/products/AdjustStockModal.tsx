import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Minus } from "lucide-react";
import { Button, Input, Select } from "../ui";
import { useActiveCashiers } from "../../hooks/useActiveCashiers";
import { useCashierProductStock } from "../../hooks/useCashierProductStock";
import type { Product } from "../../types";

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Cashier-level inventory foundation: every adjustment targets a
  // specific cashier's own inventory — never a shop-wide pool.
  onSubmit: (delta: number, cashierId: string) => Promise<void>;
  product: Product | null;
}

export function AdjustStockModal({ isOpen, onClose, onSubmit, product }: AdjustStockModalProps) {
  const [direction, setDirection] = useState<1 | -1>(1);
  const [amount, setAmount] = useState<number | "">("");
  const [cashierId, setCashierId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { cashiers, isLoading: cashiersLoading, error: cashiersError } = useActiveCashiers(isOpen);
  // The chosen cashier's OWN current quantity — never product.stock, the
  // shop-wide total across every cashier.
  const { quantity: cashierStock } = useCashierProductStock(product?.id, cashierId);

  useEffect(() => {
    if (isOpen) { setAmount(""); setDirection(1); setCashierId(""); setError(null); }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !cashierId && cashiers.length === 1) setCashierId(cashiers[0].id);
  }, [isOpen, cashiers, cashierId]);

  if (!isOpen || !product) return null;

  async function handleSubmit() {
    if (submitting) return;
    if (!cashierId) {
      setError("Choose which cashier this adjustment applies to.");
      return;
    }
    if (amount === "" || Number(amount) <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    if (direction === -1 && cashierStock != null && Number(amount) > cashierStock) {
      setError(`This cashier only has ${cashierStock} ${product!.unit}(s) in stock.`);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(direction * Number(amount), cashierId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Adjust stock">
      <div className="absolute inset-0 bg-charcoal/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm bg-ivory-card rounded-card shadow-lift p-6">
        <h3 className="font-display font-bold text-lg text-charcoal mb-1">Adjust Stock</h3>
        <p className="text-sm text-charcoal-muted mb-5">
          {product.name} · {product.stock} {product.unit}(s) total across all cashiers
        </p>

        <Select
          label="Cashier"
          required
          hint="Every cashier keeps their own separate stock."
          value={cashierId}
          onChange={(e) => setCashierId(e.target.value)}
          disabled={cashiersLoading}
          options={[
            { label: cashiersLoading ? "Loading cashiers…" : "Select a cashier…", value: "" },
            ...cashiers.map((c) => ({ label: c.name, value: c.id })),
          ]}
        />
        {!cashiersLoading && cashiers.length === 0 && (
          <p className="text-sm text-charcoal-muted mt-1.5">No active cashiers at this shop yet.</p>
        )}
        {cashiersError && <p role="alert" className="text-sm text-danger mt-1.5">{cashiersError}</p>}

        {cashierId && (
          <p className="text-xs text-charcoal-muted mt-2">
            {cashiers.find((c) => c.id === cashierId)?.name}'s current stock: {cashierStock ?? "…"} {product.unit}(s)
          </p>
        )}

        <div className="flex items-center gap-2 mt-4 mb-4">
          <button
            onClick={() => setDirection(1)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-btn py-2.5 text-sm font-semibold transition-colors duration-150 ${direction === 1 ? "bg-olive-soft text-olive" : "bg-charcoal/5 text-charcoal-muted"}`}
          >
            <Plus size={15} /> Add stock
          </button>
          <button
            onClick={() => setDirection(-1)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-btn py-2.5 text-sm font-semibold transition-colors duration-150 ${direction === -1 ? "bg-danger-soft text-danger" : "bg-charcoal/5 text-charcoal-muted"}`}
          >
            <Minus size={15} /> Remove
          </button>
        </div>

        <Input
          label={`Quantity (${product.unit})`} type="number" min={1} value={amount} error={error ?? undefined}
          onChange={(e) => { setAmount(e.target.value === "" ? "" : Number(e.target.value)); setError(null); }}
          autoFocus
        />

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} isLoading={submitting}>Confirm</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
