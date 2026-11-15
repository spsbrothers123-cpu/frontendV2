import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Mail, MailOpen, RotateCw, Settings as SettingsIcon, AlertTriangle } from "lucide-react";
import { useNotifications } from "../../context/NotificationsContext";
import { CategoryIcon } from "../notifications/CategoryIcon";
import { Skeleton } from "../ui";
import {
  NOTIFICATION_CENTER_PATH,
  categoryLabel,
  formatFullTime,
  formatNotificationTime,
  formatUnreadBadge,
  resolveNotificationTarget,
} from "../../lib/notifications";
import type { NotificationItem } from "../../types/notifications";

export function NotificationsBell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { recent, unreadCount, status, error, syncFailed, pendingIds, bulkBusy, refresh, setRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Any navigation (including the browser back button) closes the dropdown.
  useEffect(() => { setOpen(false); }, [pathname]);

  function go(path: string, state?: unknown) {
    setOpen(false);
    navigate(path, state ? { state } : undefined);
  }

  // Opening a notification only navigates. It never changes read state —
  // that is a manual action (the Mark read / Mark unread button).
  function handleOpenItem(n: NotificationItem) {
    const target = resolveNotificationTarget(n);
    go(target ? target.path : NOTIFICATION_CENTER_PATH);
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative w-10 h-10 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150 shrink-0"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span
            data-testid="unread-badge"
            className="absolute top-0.5 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold leading-none flex items-center justify-center"
            aria-hidden="true"
          >
            {formatUnreadBadge(unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-card shadow-lift border border-charcoal/6 animate-in fade-in slide-in-from-top-1 duration-150 z-40">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-charcoal/6">
            <h3 className="font-display font-bold text-sm text-charcoal">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllRead()}
                  disabled={bulkBusy !== null}
                  className="flex items-center gap-1 text-xs font-medium text-olive hover:text-olive/80 disabled:opacity-50 transition-colors duration-150 px-1.5 py-1"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button
                onClick={() => go("/admin/settings", { category: "notifications" })}
                aria-label="Notification settings"
                className="w-8 h-8 rounded-btn flex items-center justify-center text-charcoal-muted hover:bg-charcoal/6 transition-colors duration-150"
              >
                <SettingsIcon size={15} />
              </button>
            </div>
          </div>

          {syncFailed && status === "success" && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-soft text-xs text-charcoal" role="status">
              <AlertTriangle size={13} className="text-amber shrink-0" />
              <span className="flex-1">Couldn't refresh. Showing the last loaded notifications.</span>
              <button onClick={() => void refresh({ silent: true })} className="font-semibold text-amber hover:underline">Retry</button>
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto">
            {status === "loading" && (
              <div className="p-4 space-y-3" role="status" aria-label="Loading notifications">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            )}

            {status === "error" && (
              <div className="px-4 py-8 text-center" role="alert">
                <p className="text-sm font-medium text-charcoal mb-1">Couldn't load notifications</p>
                <p className="text-xs text-charcoal-muted mb-3">{error}</p>
                <button
                  onClick={() => void refresh()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal border border-charcoal/10 rounded-btn px-3 py-1.5 hover:bg-ivory-soft transition-colors duration-150"
                >
                  <RotateCw size={13} /> Try again
                </button>
              </div>
            )}

            {status === "success" && recent.length === 0 && (
              <p className="px-4 py-8 text-sm text-charcoal-muted text-center">You're all caught up.</p>
            )}

            {status === "success" && recent.map((n) => {
              const target = resolveNotificationTarget(n);
              const pending = pendingIds.has(n.id);
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-1 border-b border-charcoal/4 last:border-0 ${!n.read ? "bg-yolk-100/40" : ""}`}
                  data-unread={!n.read}
                >
                  <button
                    onClick={() => handleOpenItem(n)}
                    aria-label={`${target ? target.label : "Open notifications"}: ${n.title}`}
                    className="flex-1 min-w-0 flex items-start gap-2.5 pl-4 pr-1 py-3 text-left hover:bg-ivory-soft transition-colors duration-150"
                  >
                    <CategoryIcon category={n.category} severity={n.severity} size={14} />
                    <span className="min-w-0">
                      <span className={`block text-sm text-charcoal ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</span>
                      {n.message && <span className="block text-xs text-charcoal-muted mt-0.5 line-clamp-2">{n.message}</span>}
                      <span className="block text-[11px] text-charcoal-muted/80 mt-1" title={formatFullTime(n.createdAt)}>
                        {categoryLabel(n.category)}{n.branch ? ` · ${n.branch.name}` : ""} · {formatNotificationTime(n.createdAt)}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => void setRead(n, !n.read)}
                    disabled={pending}
                    aria-label={`${n.read ? "Mark as unread" : "Mark as read"}: ${n.title}`}
                    title={n.read ? "Mark as unread" : "Mark as read"}
                    className="shrink-0 mt-2 mr-2 w-8 h-8 rounded-btn flex items-center justify-center text-charcoal-muted hover:bg-charcoal/6 disabled:opacity-40 transition-colors duration-150"
                  >
                    {n.read ? <Mail size={15} /> : <MailOpen size={15} />}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-charcoal/6 p-2">
            <button
              onClick={() => go(NOTIFICATION_CENTER_PATH)}
              className="w-full rounded-btn py-2 text-sm font-semibold text-charcoal hover:bg-ivory-soft transition-colors duration-150"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
