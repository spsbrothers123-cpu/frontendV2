import type { ReactNode } from "react";
import { CheckCircle2, Clock, XCircle, AlertTriangle, Circle } from "lucide-react";

type StatusTone = "positive" | "warning" | "danger" | "neutral";

const toneMap: Record<string, { tone: StatusTone; icon: ReactNode }> = {
  completed: { tone: "positive", icon: <CheckCircle2 size={13} /> },
  active: { tone: "positive", icon: <CheckCircle2 size={13} /> },
  received: { tone: "positive", icon: <CheckCircle2 size={13} /> },
  pending: { tone: "warning", icon: <Clock size={13} /> },
  "low stock": { tone: "warning", icon: <AlertTriangle size={13} /> },
  critical: { tone: "danger", icon: <AlertTriangle size={13} /> },
  cancelled: { tone: "danger", icon: <XCircle size={13} /> },
  refunded: { tone: "danger", icon: <XCircle size={13} /> },
  inactive: { tone: "neutral", icon: <Circle size={13} /> },
  "in stock": { tone: "positive", icon: <CheckCircle2 size={13} /> },
  "out of stock": { tone: "danger", icon: <XCircle size={13} /> },
  paid: { tone: "positive", icon: <CheckCircle2 size={13} /> },
  "partially paid": { tone: "warning", icon: <Clock size={13} /> },
  in: { tone: "positive", icon: <CheckCircle2 size={13} /> },
  out: { tone: "warning", icon: <Clock size={13} /> },
  adjustment: { tone: "neutral", icon: <Circle size={13} /> },
  open: { tone: "positive", icon: <CheckCircle2 size={13} /> },
  closed: { tone: "neutral", icon: <Circle size={13} /> },
  discrepancy: { tone: "danger", icon: <AlertTriangle size={13} /> },
  used: { tone: "neutral", icon: <CheckCircle2 size={13} /> },
  expired: { tone: "danger", icon: <XCircle size={13} /> },
  revoked: { tone: "danger", icon: <XCircle size={13} /> },
};

const toneClasses: Record<StatusTone, string> = {
  positive: "bg-olive-soft text-olive",
  warning: "bg-amber-soft text-amber",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-charcoal/8 text-charcoal-muted",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const entry = toneMap[key] ?? { tone: "neutral" as StatusTone, icon: <Circle size={13} /> };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[entry.tone]}`}>
      {entry.icon}
      {status}
    </span>
  );
}
