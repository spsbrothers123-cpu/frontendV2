import { Link } from "react-router-dom";
import { Mail, MailOpen, Trash2, ArrowUpRight } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";
import { categoryLabel, formatFullTime, formatNotificationTime, resolveNotificationTarget } from "../../lib/notifications";
import type { NotificationItem } from "../../types/notifications";

export function NotificationRow({
  item,
  pending,
  onToggleRead,
  onDelete,
}: {
  item: NotificationItem;
  pending: boolean;
  onToggleRead: (item: NotificationItem) => void;
  onDelete: (item: NotificationItem) => void;
}) {
  // Following the link only navigates; read state is changed manually below.
  const target = resolveNotificationTarget(item);
  const critical = item.severity === "critical";

  return (
    <li
      data-testid="notification-row"
      data-unread={!item.read}
      className={`flex flex-col sm:flex-row sm:items-start gap-3 px-4 sm:px-5 py-4 border-b border-charcoal/6 last:border-0 ${
        !item.read ? "bg-yolk-100/40" : ""
      } ${critical ? "border-l-4 border-l-danger" : ""}`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <CategoryIcon category={item.category} severity={item.severity} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-sm text-charcoal ${!item.read ? "font-bold" : "font-medium"}`}>{item.title}</h3>
            {!item.read && <span className="w-2 h-2 rounded-full bg-yolk-500 shrink-0" aria-label="Unread" role="img" />}
            {critical && <span className="text-[11px] font-semibold text-danger bg-danger-soft rounded-full px-2 py-0.5">Critical</span>}
          </div>
          {item.message && <p className="text-sm text-charcoal-muted mt-0.5">{item.message}</p>}
          <p className="text-xs text-charcoal-muted/80 mt-1.5 flex flex-wrap gap-x-2">
            <span>{categoryLabel(item.category)}</span>
            {item.branch && <span>{item.branch.name}</span>}
            <span title={formatFullTime(item.createdAt)}>{formatNotificationTime(item.createdAt)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap sm:justify-end pl-11 sm:pl-0 shrink-0">
        {target && (
          <Link
            to={target.path}
            className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal border border-charcoal/10 rounded-btn px-2.5 py-1.5 hover:bg-ivory-soft transition-colors duration-150 min-h-[36px]"
            aria-label={`${target.label}: ${item.title}`}
          >
            {target.label} <ArrowUpRight size={13} />
          </Link>
        )}
        <button
          onClick={() => onToggleRead(item)}
          disabled={pending}
          aria-label={`${item.read ? "Mark as unread" : "Mark as read"}: ${item.title}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-charcoal-muted rounded-btn px-2.5 py-1.5 hover:bg-charcoal/6 disabled:opacity-50 transition-colors duration-150 min-h-[36px]"
        >
          {item.read ? <Mail size={14} /> : <MailOpen size={14} />}
          {item.read ? "Mark unread" : "Mark read"}
        </button>
        <button
          onClick={() => onDelete(item)}
          disabled={pending}
          aria-label={`Delete notification: ${item.title}`}
          className="w-9 h-9 rounded-btn flex items-center justify-center text-danger hover:bg-danger-soft disabled:opacity-50 transition-colors duration-150"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );
}
