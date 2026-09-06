import { useEffect, useState } from "react";
import { Drawer, Button, StatusBadge, EmptyState } from "../ui";
import { Tabs } from "../ui/Controls";
import { CircleDollarSign } from "lucide-react";
import * as customersApi from "../../api/customers";
import type { Customer, CustomerPurchaseHistoryItem, CustomerPaymentRecord } from "../../types";
import { useToast } from "../../context/ToastContext";

export function CustomerDetailsDrawer({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<"history" | "payments">("history");
  const [history, setHistory] = useState<CustomerPurchaseHistoryItem[]>([]);
  const [payments, setPayments] = useState<CustomerPaymentRecord[]>([]);
  const [paymentsAvailable, setPaymentsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    customersApi.fetchCustomerPurchaseHistory(customer.id)
      .then(setHistory)
      .finally(() => setLoading(false));
    customersApi.fetchCustomerPayments(customer.id)
      .then(setPayments)
      .catch(() => setPaymentsAvailable(false));
  }, [customer]);

  async function handleCollectPayment() {
    if (!customer) return;
    try {
      await customersApi.collectCustomerPayment(customer.id, customer.creditBalance);
    } catch (err: any) {
      showToast(err?.message || "Payment collection isn't available yet.", "info");
    }
  }

  if (!customer) return null;

  return (
    <Drawer isOpen={!!customer} onClose={onClose} title={customer.name} subtitle={customer.phone}>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-btn bg-ivory-soft p-3">
          <p className="text-[11px] text-charcoal-muted uppercase tracking-wide mb-1">Total Purchases</p>
          <p className="font-display font-bold text-charcoal">₹{customer.totalPurchases.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-btn bg-ivory-soft p-3">
          <p className="text-[11px] text-charcoal-muted uppercase tracking-wide mb-1">Bills</p>
          <p className="font-display font-bold text-charcoal">{customer.billCount}</p>
        </div>
        <div className={`rounded-btn p-3 ${customer.creditBalance > 0 ? "bg-danger-soft" : "bg-olive-soft"}`}>
          <p className="text-[11px] uppercase tracking-wide mb-1 text-charcoal-muted">Credit Balance</p>
          <p className={`font-display font-bold ${customer.creditBalance > 0 ? "text-danger" : "text-olive"}`}>₹{customer.creditBalance.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {customer.creditBalance > 0 && (
        <div className="mb-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCollectPayment}
            title="Not yet connected to the backend"
          >
            <CircleDollarSign size={15} /> Collect Payment
          </Button>
          <p className="text-xs text-charcoal-muted mt-1.5">This will show as disabled until the payments endpoint is confirmed with the backend.</p>
        </div>
      )}

      <Tabs
        tabs={[{ label: "Purchase History", value: "history" }, { label: "Payments", value: "payments" }]}
        active={tab}
        onChange={(v) => setTab(v as "history" | "payments")}
      />

      <div className="mt-4">
        {tab === "history" && (
          loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>
          ) : history.length === 0 ? (
            <EmptyState title="No purchases yet" />
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-btn px-3 py-2.5 bg-ivory-soft">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{h.billNumber}</p>
                    <p className="text-xs text-charcoal-muted">{h.date} · {h.paymentMethod}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{h.amount.toLocaleString("en-IN")}</p>
                    <StatusBadge status={h.status} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "payments" && (
          !paymentsAvailable ? (
            <EmptyState title="Payment history isn't available yet" description="This backend endpoint hasn't been connected." />
          ) : payments.length === 0 ? (
            <EmptyState title="No payments recorded" />
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-btn px-3 py-2.5 bg-ivory-soft">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{p.date}</p>
                    {p.note && <p className="text-xs text-charcoal-muted">{p.note}</p>}
                  </div>
                  <p className="text-sm font-semibold">₹{p.amount.toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Drawer>
  );
}
