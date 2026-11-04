import { useEffect, useState } from "react";
import { Drawer, EmptyState, Button, Textarea, StatusBadge, ConfirmModal } from "../ui";
import { Ban } from "lucide-react";
import * as billsApi from "../../api/bills";
import { useToast } from "../../context/ToastContext";
import * as historyApi from "../../api/history";
import type { HistoryRecord, SaleDetails, PurchaseDetails, PaymentDetails, BillCancellationResult } from "../../types";
import { validateCancelReason, isAlreadyCancelled, cancelBillError, cancelSuccessMessage, creditReversalLabel, mayHaveCredit } from "./billCancellation";

export function HistoryDetailsDrawer({ record, onClose, onChanged }: { record: HistoryRecord | null; onClose: () => void; onChanged?: () => void }) {
  const { showToast } = useToast();
  // Stage 2.7/2.8: Central-Admin-only bill cancellation (mandatory reason).
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Outcome of a cancellation made in this view — the read endpoint doesn't return it.
  const [result, setResult] = useState<BillCancellationResult | null>(null);
  const [sale, setSale] = useState<SaleDetails | null>(null);
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  function loadDetails() {
    if (!record) return;
    setLoading(true);
    setError(false);
    setSale(null);
    setPurchase(null);
    setPayment(null);
    const req =
      record.type === "Sale" ? historyApi.fetchSaleDetails(record.reference).then(setSale) :
      record.type === "Purchase" ? historyApi.fetchPurchaseDetails(record.reference).then(setPurchase) :
      historyApi.fetchPaymentDetails(record.reference).then(setPayment);
    req.catch(() => setError(true)).finally(() => setLoading(false));
  }

  useEffect(() => {
    setCancelling(false);
    setConfirming(false);
    setResult(null);
    setReason("");
    setCancelError(null);
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  // Step 1: validate the reason, then ask for explicit confirmation.
  function reviewCancel() {
    const problem = validateCancelReason(reason);
    if (problem) return setCancelError(problem);
    setCancelError(null);
    setConfirming(true);
  }

  // Step 2: submit once. The backend guarantees exactly-once; the in-flight
  // guard stops a double click from even sending a second request.
  async function handleCancel() {
    if (!sale?.id || cancelSubmitting) return;
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      const r = await billsApi.cancelBill(sale.id, reason.trim());
      showToast(cancelSuccessMessage(r));
      setResult(r);
      setConfirming(false);
      setCancelling(false);
      setReason("");
      loadDetails();   // the bill stays visible, now labelled Cancelled
      onChanged?.();
    } catch (err: any) {
      setConfirming(false);
      if (isAlreadyCancelled(err)) {
        // Someone (or a double click) already cancelled it — show the real state.
        showToast("This bill was already cancelled. Showing its current state.", "info");
        setCancelling(false);
        loadDetails();
        onChanged?.();
      } else {
        setCancelError(cancelBillError(err));
      }
    } finally {
      setCancelSubmitting(false);
    }
  }

  if (!record) return null;

  return (
    <Drawer isOpen={!!record} onClose={onClose} title={record.reference} subtitle={`${record.type} details`}>
      {loading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>}
      {!loading && error && <EmptyState title="Couldn't load details" description="Try again in a moment." />}

      {!loading && !error && record.type === "Sale" && sale && (
        <dl className="space-y-4">
          {sale.status === "Cancelled" && (
            <div role="status" className="rounded-btn bg-danger-soft text-danger px-3.5 py-3 text-sm">
              <div className="mb-1"><StatusBadge status="Cancelled" /></div>
              {sale.cancelledAt && <p className="text-xs">{new Date(sale.cancelledAt).toLocaleString("en-IN")}{sale.cancelledBy ? ` · by ${sale.cancelledBy}` : ""}</p>}
              {sale.cancelReason && <p className="text-xs mt-0.5">Reason: {sale.cancelReason}</p>}
              {sale.cancelledAfterSessionClose && <p className="text-xs mt-0.5">Cancelled after its cashier session was closed.</p>}
              <p className="text-xs mt-0.5">Excluded from net sales. The original bill is kept.</p>
              {result && result.id === sale.id ? (
                <p className="text-xs mt-0.5">{creditReversalLabel(result)}</p>
              ) : mayHaveCredit(sale.paymentMethod) ? (
                <p className="text-xs mt-0.5">Credit reversal amount isn't shown here — see the customer's credit history.</p>
              ) : (
                <p className="text-xs mt-0.5">No credit to reverse.</p>
              )}
            </div>
          )}
          <Row label="Bill Number" value={sale.billNumber} />
          <Row label="Date" value={new Date(sale.date).toLocaleString("en-IN")} />
          <Row label="Customer" value={sale.customerName} />
          <div>
            <dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-2">Products</dt>
            <dd className="space-y-2">
              {sale.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between rounded-btn bg-ivory-soft px-3 py-2 text-sm">
                  <span>{it.name} × {it.quantity}</span>
                  <span className="font-medium">₹{(it.price * it.quantity).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </dd>
          </div>
          <Row label="Payment" value={sale.paymentMethod} />
          <Row label="Total" value={`₹${sale.total.toLocaleString("en-IN")}`} strong />
          <Row label="Created By" value={sale.createdBy} />

          {sale.status === "Completed" && sale.id && (
            cancelling ? (
              <div className="rounded-btn border border-danger/30 p-3.5 space-y-3">
                <p className="text-sm text-charcoal-muted">
                  Cancelling restores stock to this bill's original branch (once) and reverses any credit. The bill is kept and labelled Cancelled.
                </p>
                <Textarea label="Reason" required value={reason} onChange={(e) => { setReason(e.target.value); setCancelError(null); }} />
                {cancelError && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-btn px-3.5 py-2.5">{cancelError}</p>}
                <div className="flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setCancelling(false)} disabled={cancelSubmitting}>Keep bill</Button>
                  <Button variant="danger" size="sm" onClick={reviewCancel} disabled={cancelSubmitting}>Cancel bill</Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setCancelling(true)}><Ban size={15} /> Cancel bill</Button>
            )
          )}
        </dl>
      )}

      {!loading && !error && record.type === "Purchase" && purchase && (
        <dl className="space-y-4">
          <Row label="Invoice" value={purchase.invoiceNumber} />
          <Row label="Supplier" value={purchase.supplierName} />
          <Row label="Date" value={new Date(purchase.date).toLocaleDateString("en-IN")} />
          <div>
            <dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-2">Products</dt>
            <dd className="space-y-2">
              {purchase.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between rounded-btn bg-ivory-soft px-3 py-2 text-sm">
                  <span>{it.name} × {it.quantity}</span>
                  <span className="font-medium">₹{(it.purchasePrice * it.quantity).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </dd>
          </div>
          <Row label="Total" value={`₹${purchase.total.toLocaleString("en-IN")}`} strong />
        </dl>
      )}

      {!loading && !error && record.type === "Payment" && payment && (
        <dl className="space-y-4">
          <Row label="Customer" value={payment.customerName} />
          <Row label="Amount" value={`₹${payment.amount.toLocaleString("en-IN")}`} strong />
          <Row label="Method" value={payment.method} />
          {payment.reference && <Row label="Reference" value={payment.reference} />}
          <Row label="Date" value={new Date(payment.date).toLocaleString("en-IN")} />
          <Row label="Created By" value={payment.createdBy} />
        </dl>
      )}

      <ConfirmModal
        isOpen={confirming}
        onClose={() => { if (!cancelSubmitting) setConfirming(false); }}
        onConfirm={handleCancel}
        title={`Cancel bill ${sale?.billNumber ?? record.reference}?`}
        description={`This voids a ₹${(sale?.total ?? 0).toLocaleString("en-IN")} sale for ${sale?.customerName ?? "the customer"}. Stock returns to this bill's original branch and any credit is reversed. The bill stays in history as Cancelled and this can't be undone. Reason: ${reason.trim()}`}
        confirmLabel="Yes, cancel bill"
        isDangerous
        isLoading={cancelSubmitting}
      />
    </Drawer>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">{label}</dt>
      <dd className={strong ? "font-display font-bold text-charcoal" : "text-sm text-charcoal"}>{value}</dd>
    </div>
  );
}
