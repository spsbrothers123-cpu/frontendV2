import { useEffect, useState } from "react";
import { Drawer, Button, StatusBadge, EmptyState, Tabs } from "../ui";
import { CircleDollarSign, FileText, Wallet, RotateCw } from "lucide-react";
import * as creditsApi from "../../api/credits";
import type { CustomerCredit, CreditBillItem, CreditTimelineEvent } from "../../types";

const timelineIcon: Record<CreditTimelineEvent["type"], React.ReactNode> = {
  bill_created: <FileText size={14} />,
  partial_payment: <Wallet size={14} />,
  payment: <CircleDollarSign size={14} />,
  balance_updated: <RotateCw size={14} />,
};

export function CreditDetailsDrawer({
  credit,
  onClose,
  onCollectPayment,
}: {
  credit: CustomerCredit | null;
  onClose: () => void;
  onCollectPayment: (credit: CustomerCredit) => void;
}) {
  const [tab, setTab] = useState<"bills" | "timeline">("bills");
  const [bills, setBills] = useState<CreditBillItem[]>([]);
  const [timeline, setTimeline] = useState<CreditTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!credit) return;
    setLoading(true);
    Promise.all([
      creditsApi.fetchCreditBills(credit.customerId),
      creditsApi.fetchCreditTimeline(credit.customerId),
    ])
      .then(([b, t]) => { setBills(b); setTimeline(t); })
      .finally(() => setLoading(false));
  }, [credit]);

  if (!credit) return null;

  return (
    <Drawer isOpen={!!credit} onClose={onClose} title={credit.customerName} subtitle="Credit details">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-btn bg-ivory-soft p-3">
          <p className="text-[11px] text-charcoal-muted uppercase tracking-wide mb-1">Credit Balance</p>
          <p className="font-display font-bold text-charcoal">₹{credit.totalCredit.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-btn bg-olive-soft p-3">
          <p className="text-[11px] text-charcoal-muted uppercase tracking-wide mb-1">Paid</p>
          <p className="font-display font-bold text-olive">₹{credit.paid.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-btn bg-danger-soft p-3">
          <p className="text-[11px] text-charcoal-muted uppercase tracking-wide mb-1">Remaining</p>
          <p className="font-display font-bold text-danger">₹{credit.pending.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="mb-5">
        <Button size="sm" onClick={() => onCollectPayment(credit)}>
          <CircleDollarSign size={15} /> Collect Payment
        </Button>
      </div>

      <Tabs tabs={[{ label: "Credit Bills", value: "bills" }, { label: "Timeline", value: "timeline" }]} active={tab} onChange={(v) => setTab(v as "bills" | "timeline")} />

      <div className="mt-4">
        {tab === "bills" && (
          loading ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-14 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>
          ) : bills.length === 0 ? (
            <EmptyState title="No credit bills" />
          ) : (
            <div className="space-y-2">
              {bills.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-btn px-3 py-2.5 bg-ivory-soft">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{b.billNumber}</p>
                    <p className="text-xs text-charcoal-muted">{b.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{b.amount.toLocaleString("en-IN")}</p>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "timeline" && (
          loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>
          ) : timeline.length === 0 ? (
            <EmptyState title="No history yet" />
          ) : (
            <ol className="relative border-l border-charcoal/10 pl-5 space-y-5">
              {timeline.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[27px] top-0.5 w-6 h-6 rounded-full bg-yolk-100 text-yolk-700 flex items-center justify-center">
                    {timelineIcon[e.type]}
                  </span>
                  <p className="text-sm font-medium text-charcoal">{e.description}</p>
                  <p className="text-xs text-charcoal-muted mt-0.5">{new Date(e.date).toLocaleString("en-IN")}{typeof e.amount === "number" && e.amount > 0 ? ` · ₹${e.amount.toLocaleString("en-IN")}` : ""}</p>
                </li>
              ))}
            </ol>
          )
        )}
      </div>
    </Drawer>
  );
}
