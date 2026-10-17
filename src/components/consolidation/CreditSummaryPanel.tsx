import { formatCurrency } from "../ui/MiniChart";
import { Panel, ShopTag } from "./shared";
import { fmtNum } from "./format";
import type { CreditSummary } from "../../types/consolidation";

// Consolidated outstanding-credit summary. Per-shop figures stay separate;
// customer records are never merged across branches.
export function CreditSummaryPanel({ summary }: { summary: CreditSummary }) {
  return (
    <Panel title="Customers & Credits">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-charcoal-muted font-semibold">Outstanding credit</p>
          <p className="font-display font-extrabold text-2xl text-charcoal">{formatCurrency(summary.totalOutstanding)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-charcoal-muted font-semibold">Customers with credit</p>
          <p className="font-display font-extrabold text-2xl text-charcoal">{fmtNum(summary.customersWithCredit)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-charcoal-muted font-semibold">Total customers</p>
          <p className="font-display font-extrabold text-2xl text-charcoal">{fmtNum(summary.totalCustomers)}</p>
        </div>
      </div>
      {summary.byShop.length > 0 && (
        <ul className="divide-y divide-charcoal/6">
          {summary.byShop.map((s) => (
            <li key={s.shopId} className="flex items-center justify-between gap-3 py-2.5">
              <ShopTag shopId={s.shopId} name={s.shopName} />
              <span className="text-sm font-semibold text-charcoal tabular-nums">{formatCurrency(s.outstanding)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
