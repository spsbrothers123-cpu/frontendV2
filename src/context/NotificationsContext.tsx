import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as notificationsApi from "../api/notifications";
import { useToast } from "./ToastContext";
import { useRequestGuard } from "../hooks/useRequestGuard";
import { applyChange, errorMessage, unreadDelta } from "../lib/notifications";
import type { NotificationChange, NotificationItem } from "../types/notifications";

export const RECENT_LIMIT = 8;
export const POLL_INTERVAL_MS = 60_000;

type LoadState = "loading" | "success" | "error";
type BulkAction = "mark-all" | "clear-read" | null;

interface NotificationsContextValue {
  /** Latest notifications for the bell dropdown, newest first. */
  recent: NotificationItem[];
  /** Unread across every branch — NOT limited to `recent` or the selected shop. */
  unreadCount: number;
  status: LoadState;
  error: string | null;
  /** A background refresh failed; `recent`/`unreadCount` are the last known good values. */
  syncFailed: boolean;
  /** Ids with a request in flight (their buttons are disabled). */
  pendingIds: ReadonlySet<string>;
  bulkBusy: BulkAction;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  setRead: (item: NotificationItem, read: boolean) => Promise<boolean>;
  remove: (item: NotificationItem) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  clearRead: () => Promise<boolean>;
  /** Drops notifications the admin deleted this session (guards against stale responses). */
  withoutDeleted: <T extends { id: string }>(items: T[]) => T[];
  /** Hear about changes the server has confirmed, so other views can mirror them. */
  subscribe: (listener: (change: NotificationChange) => void) => () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

// Single owner of notification state for the Admin app. Mutations are
// pessimistic: the UI changes only after the server confirms, so a failed
// request can never leave the screen showing something that didn't happen
// and the existing list is never lost. In-flight reads that started before a
// confirmed change are invalidated, then a quiet refresh reconciles with the
// server.
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const guard = useRequestGuard();

  const [recent, setRecent] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState<BulkAction>(null);

  const hasLoaded = useRef(false);
  const deletedIds = useRef<Set<string>>(new Set());
  const listeners = useRef<Set<(c: NotificationChange) => void>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());
  const bulkRef = useRef<BulkAction>(null);

  const withoutDeleted = useCallback(
    <T extends { id: string }>(items: T[]) => items.filter((i) => !deletedIds.current.has(i.id)),
    []
  );

  const subscribe = useCallback((listener: (c: NotificationChange) => void) => {
    listeners.current.add(listener);
    return () => { listeners.current.delete(listener); };
  }, []);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const ticket = guard.begin();
    if (!opts?.silent) { setStatus("loading"); setError(null); }
    try {
      const res = await notificationsApi.fetchNotifications({ status: "all", page: 1, pageSize: RECENT_LIMIT });
      if (!guard.isCurrent(ticket)) return;
      setRecent(withoutDeleted(res.items));
      setUnreadCount(res.unreadCount);
      setStatus("success");
      setError(null);
      setSyncFailed(false);
      hasLoaded.current = true;
    } catch (err) {
      if (!guard.isCurrent(ticket)) return;
      if (hasLoaded.current) {
        // Keep what the admin already has; just flag that it may be stale.
        setSyncFailed(true);
      } else {
        setStatus("error");
        setError(errorMessage(err, "Couldn't load notifications."));
      }
    }
  }, [guard, withoutDeleted]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Pick up new notifications: poll while the tab is visible, and catch up
  // when the admin returns to it.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") void refresh({ silent: true }); };
    const timer = setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [refresh]);

  const commit = useCallback((change: NotificationChange, item?: NotificationItem) => {
    setRecent((prev) => applyChange(prev, change));
    setUnreadCount((c) => {
      if (change.type === "all-read") return 0;
      return Math.max(0, c + unreadDelta(change, item));
    });
    listeners.current.forEach((l) => l(change));
    void refresh({ silent: true });
  }, [refresh]);

  const setPending = (id: string, on: boolean) => {
    if (on) pendingRef.current.add(id); else pendingRef.current.delete(id);
    setPendingIds(new Set(pendingRef.current));
  };

  const setRead = useCallback(async (item: NotificationItem, read: boolean) => {
    if (pendingRef.current.has(item.id)) return false;
    if (item.read === read) return true;
    setPending(item.id, true);
    try {
      await notificationsApi.setNotificationRead(item.id, read);
      commit({ type: "read-state", id: item.id, read }, item);
      return true;
    } catch (err) {
      showToast(errorMessage(err, `Couldn't mark the notification as ${read ? "read" : "unread"}.`), "error");
      return false;
    } finally {
      setPending(item.id, false);
    }
  }, [commit, showToast]);

  const remove = useCallback(async (item: NotificationItem) => {
    if (pendingRef.current.has(item.id)) return false;
    setPending(item.id, true);
    try {
      await notificationsApi.deleteNotification(item.id);
      deletedIds.current.add(item.id);
      commit({ type: "deleted", id: item.id }, item);
      showToast("Notification deleted.");
      return true;
    } catch (err) {
      showToast(errorMessage(err, "Couldn't delete the notification."), "error");
      return false;
    } finally {
      setPending(item.id, false);
    }
  }, [commit, showToast]);

  const runBulk = useCallback(async (action: Exclude<BulkAction, null>, run: () => Promise<NotificationChange>, failure: string, success: string) => {
    if (bulkRef.current) return false;
    bulkRef.current = action;
    setBulkBusy(action);
    try {
      const change = await run();
      commit(change);
      showToast(success);
      return true;
    } catch (err) {
      showToast(errorMessage(err, failure), "error");
      return false;
    } finally {
      bulkRef.current = null;
      setBulkBusy(null);
    }
  }, [commit, showToast]);

  const markAllRead = useCallback(
    () => runBulk("mark-all", async () => {
      await notificationsApi.markAllNotificationsRead();
      return { type: "all-read" } as const;
    }, "Couldn't mark notifications as read.", "All notifications marked as read."),
    [runBulk]
  );

  const clearRead = useCallback(
    () => runBulk("clear-read", async () => {
      const { deletedCount } = await notificationsApi.clearReadNotifications();
      return { type: "read-cleared", deletedCount } as const;
    }, "Couldn't clear read notifications.", "Read notifications cleared."),
    [runBulk]
  );

  const value = useMemo<NotificationsContextValue>(() => ({
    recent, unreadCount, status, error, syncFailed, pendingIds, bulkBusy,
    refresh, setRead, remove, markAllRead, clearRead, withoutDeleted, subscribe,
  }), [recent, unreadCount, status, error, syncFailed, pendingIds, bulkBusy, refresh, setRead, remove, markAllRead, clearRead, withoutDeleted, subscribe]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
