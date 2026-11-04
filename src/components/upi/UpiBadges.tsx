import type { ReactNode } from "react";
import { CheckCircle2, Circle, AlertTriangle, XCircle } from "lucide-react";
import type { UpiEffectiveSource } from "../../types/upi";

// Local badges for UPI Management. Uses the same tone classes as the shared
// StatusBadge (which is intentionally left untouched).
type Tone = "positive" | "warning" | "danger" | "neutral";

const toneClasses: Record<Tone, string> = {
  positive: "bg-olive-soft text-olive",
  warning: "bg-amber-soft text-amber",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-charcoal/8 text-charcoal-muted",
};

export function UpiBadge({ tone, icon, children }: { tone: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${toneClasses[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

export type UpiAccountStatus = "enabled" | "disabled" | "not-configured";

export function UpiStatusBadge({ status }: { status: UpiAccountStatus }) {
  if (status === "enabled") return <UpiBadge tone="positive" icon={<CheckCircle2 size={13} />}>Enabled</UpiBadge>;
  if (status === "disabled") return <UpiBadge tone="neutral" icon={<Circle size={13} />}>Disabled</UpiBadge>;
  return <UpiBadge tone="warning" icon={<AlertTriangle size={13} />}>Not configured</UpiBadge>;
}

export function ReceiverSourceBadge({ source }: { source: UpiEffectiveSource }) {
  if (source === "SHOP") return <UpiBadge tone="positive" icon={<CheckCircle2 size={13} />}>Custom</UpiBadge>;
  if (source === "COMMON") return <UpiBadge tone="positive" icon={<CheckCircle2 size={13} />}>Common</UpiBadge>;
  return <UpiBadge tone="danger" icon={<XCircle size={13} />}>No receiver</UpiBadge>;
}
