import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Minus } from "lucide-react";
import { Button, Input } from "../ui";
import type { Product } from "../../types";

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (delta: number) => Promise<void>;
  product: Product | null;
}

export function AdjustStockModal({ isOpen, onClose, onSubmit, product }: AdjustStockModalProps) {
  const [direction, setDirection] = useState<1 | -1>(1);
  const [amount, setAmount] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) { setAmount(""); setDirection(1); setError(null); }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  async function handleSubmit() {
    if (submitting) return;
    if (amount === "" || Number(amount) <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    if (direction === -1 && Number(amount) > product!.stock) {
      setError(`Only ${product!.stock} ${product!.unit}(s) in stock.`);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(direction * Number(amount));
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
        <p className="text-sm text-charcoal-muted mb-5">{product.name} · currently {product.stock} {product.unit}(s)</p>

        <div className="flex items-center gap-2 mb-4">
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
