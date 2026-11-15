import { Bell, ShieldAlert, PackageX, UserCog, CreditCard, Receipt, ClipboardList } from "lucide-react";
import type { NotificationSeverity } from "../../types/notifications";

const ICONS: Record<string, typeof Bell> = {
  inventory: PackageX,
  cashier: UserCog,
  credit: CreditCard,
  sales_purchases: Receipt,
  security: ShieldAlert,
  daily_summary: ClipboardList,
};

const TONES: Record<string, string> = {
  inventory: "bg-danger-soft text-danger",
  cashier: "bg-olive-soft text-olive",
  credit: "bg-amber-soft text-amber",
  sales_purchases: "bg-yolk-100 text-yolk-800",
  security: "bg-danger-soft text-danger",
  daily_summary: "bg-charcoal/6 text-charcoal-soft",
};

// Unknown categories (added by a newer backend) fall back to a neutral bell.
export function CategoryIcon({ category, severity, size = 16 }: { category: string; severity?: NotificationSeverity; size?: number }) {
  const Icon = ICONS[category] ?? Bell;
  const tone = severity === "critical" ? "bg-danger-soft text-danger" : TONES[category] ?? "bg-charcoal/6 text-charcoal-muted";
  return (
    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${tone}`} aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}
