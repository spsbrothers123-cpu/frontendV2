import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function StatCard({
  icon,
  iconBg,
  label,
  value,
  trend,
  comparisonLabel,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  trend: number;
  comparisonLabel?: string;
}) {
  const isPositive = trend >= 0;
  return (
    <div className="rounded-card bg-white p-5 shadow-soft hover:shadow-lift transition-shadow duration-250 min-w-0">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-9 h-9 rounded-btn flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</span>
          <span className="text-xs font-semibold tracking-wide text-charcoal-muted uppercase truncate">{label}</span>
        </div>
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
            isPositive ? "bg-olive-soft text-olive" : "bg-danger-soft text-danger"
          }`}
        >
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend).toFixed(1)}%
        </span>
      </div>
      <p className="font-display font-extrabold text-2xl sm:text-[28px] text-charcoal tracking-tight">{value}</p>
      {comparisonLabel && <p className="text-xs text-charcoal-muted mt-1">{comparisonLabel}</p>}
    </div>
  );
}
