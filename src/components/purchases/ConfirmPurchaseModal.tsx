import { Button } from "../ui";
import { PurchaseModalShell } from "./PurchaseModalShell";
import type { ProductUnit } from "../../types";

export interface PurchaseSummaryLine {
  name: string;
  quantity: number;
  unit: ProductUnit;
  purchasePrice: number;
  inCatalog: boolean;
}

interface Props {
  receivingBranchName: string;
  /** The Global Shop Selector's branch — only used to warn when it differs. */
  viewingBranchName?: string;
  viewingDiffers: boolean;
  supplierName: string;
  invoiceNumber: string;
  purchaseDate: string;
  lines: PurchaseSummaryLine[];
  total: number;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Stage 3.4 — last step before a purchase is created. It names the receiving
 * branch explicitly (the one that WILL be sent, captured when the form was
 * validated) so the Admin confirms the destination of the stock, not just the
 * numbers.
 */
export function ConfirmPurchaseModal(p: Props) {
  return (
    <PurchaseModalShell
      title="Confirm purchase"
      onClose={p.onCancel}
      busy={p.submitting}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={p.onCancel} disabled={p.submitting}>Go back</Button>
          <Button size="sm" onClick={p.onConfirm} isLoading={p.submitting}>Confirm &amp; save purchase</Button>
        </>
      }
    >
      <div className="rounded-btn bg-yolk-100/60 border border-yolk-500/40 p-3" data-testid="confirm-receiving-branch">
        <p className="text-xs uppercase tracking-wide text-charcoal-muted mb-0.5">Receiving branch</p>
        <p className="font-display font-bold text-base text-charcoal">{p.receivingBranchName}</p>
        <p className="text-xs text-charcoal-muted mt-1">
          Stock is added only at this branch. It cannot be changed after saving — a mistake is corrected with a reversal.
        </p>
      </div>
      {p.viewingDiffers && (
        <p role="note" className="text-xs text-amber">
          You are currently viewing {p.viewingBranchName ?? "another branch"}. This purchase will not appear in that
          branch's list — switch to {p.receivingBranchName} to see it.
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3">
        <div><dt className="text-xs text-charcoal-muted">Supplier</dt><dd className="font-medium">{p.supplierName}</dd></div>
        <div><dt className="text-xs text-charcoal-muted">Invoice</dt><dd className="font-medium">{p.invoiceNumber}</dd></div>
        <div><dt className="text-xs text-charcoal-muted">Date</dt><dd className="font-medium">{p.purchaseDate}</dd></div>
        <div><dt className="text-xs text-charcoal-muted">Grand total</dt><dd className="font-semibold">₹{p.total.toLocaleString("en-IN")}</dd></div>
      </dl>
      <ul className="space-y-1.5">
        {p.lines.map((l, i) => (
          <li key={i} className="flex items-center justify-between rounded-btn bg-ivory-soft px-3 py-2">
            <span>
              {l.name}
              {!l.inCatalog && <span className="text-xs text-charcoal-muted"> · purchase list only</span>}
              <span className="block text-xs text-charcoal-muted">{l.quantity} {l.unit} × ₹{l.purchasePrice.toLocaleString("en-IN")}</span>
            </span>
            <span className="font-semibold">₹{(l.quantity * l.purchasePrice).toLocaleString("en-IN")}</span>
          </li>
        ))}
      </ul>
    </PurchaseModalShell>
  );
}
