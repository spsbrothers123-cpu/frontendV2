import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { CardSkeleton, ErrorState, EmptyState, Skeleton } from "../ui";
import { useConsolidation } from "./ConsolidationContext";
import type { SectionState } from "./ConsolidationContext";

export function ShopTag({ shopId, name }: { shopId: string; name?: string }) {
  const { shopColor, shopName } = useConsolidation();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal/5 px-2.5 py-1 text-xs font-semibold text-charcoal max-w-full">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: shopColor(shopId) }} aria-hidden="true" />
      <span className="truncate">{name ?? shopName(shopId)}</span>
    </span>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-card bg-white shadow-soft p-5 min-w-0 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="font-display font-bold text-lg text-charcoal">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// Same visual language as StatCard, without the trend badge — the backend
// supplies no comparison period, and nothing here is invented.
export function SummaryCard({
  icon,
  iconBg,
  label,
  value,
  caption,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="rounded-card bg-white p-5 shadow-soft min-w-0">
      <div className="flex items-center gap-2.5 mb-4 min-w-0">
        <span className={`w-9 h-9 rounded-btn flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</span>
        <span className="text-xs font-semibold tracking-wide text-charcoal-muted uppercase truncate">{label}</span>
      </div>
      <p className="font-display font-extrabold text-2xl sm:text-[28px] text-charcoal tracking-tight truncate">{value}</p>
      {caption && <p className="text-xs text-charcoal-muted mt-1">{caption}</p>}
    </div>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="flex items-start gap-2.5 rounded-btn bg-amber-soft px-4 py-3 text-sm text-charcoal">
      <Info size={16} className="text-amber shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="space-y-6">
      <CardGridSkeleton />
      <div className="rounded-card bg-white shadow-soft p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

/** Renders loading / error / empty / success for one section's state. */
export function SectionBoundary<T>({
  state,
  onRetry,
  isEmpty,
  emptyTitle = "No data for this selection",
  emptyDescription = "Try a different shop or date range.",
  skeleton,
  children,
}: {
  state: SectionState<T>;
  onRetry: () => void;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (state.status === "loading") return <>{skeleton ?? <SectionSkeleton />}</>;
  if (state.status === "error") {
    return (
      <div className="rounded-card bg-white shadow-soft">
        <ErrorState message={state.message} onRetry={onRetry} />
      </div>
    );
  }
  if (isEmpty?.(state.data)) {
    return (
      <div className="rounded-card bg-white shadow-soft">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }
  return <>{children(state.data)}</>;
}
