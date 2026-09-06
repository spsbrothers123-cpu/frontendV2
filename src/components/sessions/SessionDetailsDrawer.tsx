import { Drawer, StatusBadge } from "../ui";
import { formatCurrency } from "../ui/MiniChart";
import type { SessionDetails } from "../../types";

export function SessionDetailsDrawer({ session, onClose, isLoading }: { session: SessionDetails | null; onClose: () => void; isLoading?: boolean }) {
  return (
    <Drawer isOpen={!!session || !!isLoading} onClose={onClose} title={session ? session.cashier : ""} subtitle="Session details">
      {isLoading && !session && (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>
      )}
      {session && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs text-charcoal-muted uppercase tracking-wide mb-2">Opening Information</h3>
            <dl className="grid grid-cols-2 gap-3">
              <Row label="Opening Time" value={new Date(session.openingTime).toLocaleString("en-IN")} />
              <Row label="Opening Cash" value={formatCurrency(session.openingCash)} />
            </dl>
          </div>

          <div>
            <h3 className="text-xs text-charcoal-muted uppercase tracking-wide mb-2">Sales Summary</h3>
            <dl className="grid grid-cols-2 gap-3">
              <Row label="Total Sales" value={formatCurrency(session.sales)} strong />
              <Row label="Status" value="" custom={<StatusBadge status={session.status} />} />
            </dl>
          </div>

          <div>
            <h3 className="text-xs text-charcoal-muted uppercase tracking-wide mb-2">Payment Breakdown</h3>
            <dl className="grid grid-cols-2 gap-3">
              <Row label="Cash" value={formatCurrency(session.cashSales)} />
              <Row label="UPI" value={formatCurrency(session.upiSales)} />
              <Row label="Card" value={formatCurrency(session.cardSales)} />
              <Row label="Credit" value={formatCurrency(session.creditSales)} />
            </dl>
          </div>

          <div>
            <h3 className="text-xs text-charcoal-muted uppercase tracking-wide mb-2">Closing Cash</h3>
            <dl className="grid grid-cols-2 gap-3">
              <Row label="Expected Cash" value={formatCurrency(session.expectedClosingCash)} />
              <Row label="Actual Cash" value={formatCurrency(session.closingCash)} />
              <Row
                label="Difference"
                value=""
                custom={
                  <span className={session.cashDifference === 0 ? "text-olive font-semibold" : "text-danger font-semibold"}>
                    {session.cashDifference > 0 ? "+" : ""}{formatCurrency(session.cashDifference)}
                  </span>
                }
              />
            </dl>
          </div>

          <div>
            <h3 className="text-xs text-charcoal-muted uppercase tracking-wide mb-2">Session Activity</h3>
            <ol className="space-y-2">
              {session.activity.map((a) => (
                <li key={a.id} className="rounded-btn bg-ivory-soft px-3 py-2 text-sm">
                  <p className="text-charcoal">{a.description}</p>
                  <p className="text-xs text-charcoal-muted mt-0.5">{new Date(a.time).toLocaleString("en-IN")}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Row({ label, value, strong, custom }: { label: string; value: string; strong?: boolean; custom?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">{label}</dt>
      <dd className={strong ? "font-display font-bold text-charcoal" : "text-sm text-charcoal"}>{custom ?? value}</dd>
    </div>
  );
}
