import { useEffect, useState } from "react";
import { Drawer, EmptyState } from "../ui";
import * as historyApi from "../../api/history";
import type { HistoryRecord, SaleDetails, PurchaseDetails, PaymentDetails } from "../../types";

export function HistoryDetailsDrawer({ record, onClose }: { record: HistoryRecord | null; onClose: () => void }) {
  const [sale, setSale] = useState<SaleDetails | null>(null);
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
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
  }, [record]);

  if (!record) return null;

  return (
    <Drawer isOpen={!!record} onClose={onClose} title={record.reference} subtitle={`${record.type} details`}>
      {loading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>}
      {!loading && error && <EmptyState title="Couldn't load details" description="Try again in a moment." />}

      {!loading && !error && record.type === "Sale" && sale && (
        <dl className="space-y-4">
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
