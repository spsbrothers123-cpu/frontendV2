import { useEffect, useRef, useState } from "react";
import { Bell, PackageX, CircleDollarSign, MonitorSmartphone, Info, CheckCheck } from "lucide-react";
import * as notificationsApi from "../../api/notifications";
import type { NotificationItem, NotificationType } from "../../types";

const iconByType: Record<NotificationType, React.ReactNode> = {
  low_stock: <PackageX size={15} className="text-danger" />,
  payment_pending: <CircleDollarSign size={15} className="text-amber" />,
  session_event: <MonitorSmartphone size={15} className="text-olive" />,
  system: <Info size={15} className="text-charcoal-muted" />,
};

export function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.read).length;

  function load() {
    setLoading(true);
    notificationsApi.fetchNotifications().then(setItems).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) load();
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await notificationsApi.markAllNotificationsRead();
  }

  async function handleMarkRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await notificationsApi.markNotificationRead(id);
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative w-10 h-10 rounded-btn flex items-center justify-center hover:bg-charcoal/6 transition-colors duration-150 shrink-0"
      >
        <Bell size={19} />
        {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-danger" aria-hidden="true" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-card shadow-lift border border-charcoal/6 animate-in fade-in slide-in-from-top-1 duration-150 z-40">
          <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal/6">
            <h3 className="font-display font-bold text-sm text-charcoal">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs font-medium text-olive hover:text-olive/80 transition-colors duration-150">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {loading && <p className="px-4 py-6 text-sm text-charcoal-muted text-center">Loading...</p>}
            {!loading && items.length === 0 && <p className="px-4 py-6 text-sm text-charcoal-muted text-center">You're all caught up.</p>}
            {!loading && items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleMarkRead(n.id)}
                className={`w-full flex items-start gap-2.5 px-4 py-3 text-left border-b border-charcoal/4 last:border-0 hover:bg-ivory-soft transition-colors duration-150 ${!n.read ? "bg-yolk-100/40" : ""}`}
              >
                <span className="mt-0.5 shrink-0">{iconByType[n.type]}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-charcoal">{n.title}</span>
                  <span className="block text-xs text-charcoal-muted mt-0.5">{n.message}</span>
                  <span className="block text-[11px] text-charcoal-muted/70 mt-1">{new Date(n.time).toLocaleString("en-IN")}</span>
                </span>
                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-yolk-500 mt-1.5 shrink-0" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
