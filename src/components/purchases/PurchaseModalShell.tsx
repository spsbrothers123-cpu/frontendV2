import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  onClose: () => void;
  /** While true (a request is in flight) Escape and the backdrop do nothing. */
  busy?: boolean;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Stage 3.4 — the dialog frame shared by the purchase confirmation, the
 * branch-change warning and the reversal dialog. Sits above the Drawer
 * (z-50) it is opened from, and — like ConfirmModal — closes on Escape.
 */
export function PurchaseModalShell({ title, onClose, busy, children, footer }: Props) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, busy]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-charcoal/40" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-ivory-card rounded-card shadow-lift p-6">
        <h3 className="font-display font-bold text-lg text-charcoal mb-3">{title}</h3>
        <div className="text-sm text-charcoal space-y-3">{children}</div>
        <div className="flex items-center justify-end gap-3 mt-6">{footer}</div>
      </div>
    </div>,
    document.body
  );
}
