import type { ReactNode } from "react";
import { Inbox, AlertCircle, RotateCw } from "lucide-react";
import { Button } from "./Button";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-btn bg-charcoal/8 ${className}`} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full" role="status" aria-label="Loading data">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-3.5 border-b border-charcoal/6 px-1">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={`h-4 ${c === 0 ? "w-1/4" : "flex-1"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-card bg-white p-5 shadow-soft">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-full bg-yolk-50 flex items-center justify-center text-yolk-600 mb-4">
        {icon ?? <Inbox size={22} />}
      </div>
      <h3 className="font-display font-bold text-charcoal mb-1">{title}</h3>
      {description && <p className="text-sm text-charcoal-muted max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6" role="alert">
      <div className="w-12 h-12 rounded-full bg-danger-soft flex items-center justify-center text-danger mb-4">
        <AlertCircle size={22} />
      </div>
      <h3 className="font-display font-bold text-charcoal mb-1">Something went wrong</h3>
      <p className="text-sm text-charcoal-muted max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw size={14} /> Try again
        </Button>
      )}
    </div>
  );
}
