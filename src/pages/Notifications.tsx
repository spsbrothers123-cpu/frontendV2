import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BellOff, CheckCheck, RotateCw, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button, ConfirmModal, EmptyState, ErrorState, FilterBar, Pagination, Select, Skeleton, Tabs } from "../components/ui";
import { NotificationRow } from "../components/notifications/NotificationRow";
import { useNotifications } from "../context/NotificationsContext";
import { useShop } from "../context/ShopContext";
import { useRequestGuard } from "../hooks/useRequestGuard";
import * as notificationsApi from "../api/notifications";
import {
  CATEGORY_LABELS,
  DEFAULT_PAGE_SIZE,
  NOTIFICATION_RETENTION_DAYS,
  applyChange,
  errorMessage,
  isDateRangeValid,
} from "../lib/notifications";
import { KNOWN_NOTIFICATION_CATEGORIES } from "../types/notifications";
import type { NotificationItem, NotificationStatusFilter } from "../types/notifications";

type LoadState = "loading" | "success" | "error";

const CATEGORY_OPTIONS = [
  { label: "All categories", value: "all" },
  ...KNOWN_NOTIFICATION_CATEGORIES.map((c) => ({ label: CATEGORY_LABELS[c], value: c })),
];

export default function Notifications() {
  const { unreadCount, pendingIds, bulkBusy, setRead, remove, markAllRead, clearRead, subscribe, withoutDeleted } = useNotifications();
  // Branches are only a FILTER here. The selected shop in the header is
  // deliberately ignored: notifications from every branch stay visible.
  const { availableShops } = useShop();
  const guard = useRequestGuard();

  const [status, setStatus] = useState<NotificationStatusFilter>("all");
  const [category, setCategory] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [deleting, setDeleting] = useState<NotificationItem | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const rangeValid = isDateRangeValid(dateFrom, dateTo);
  const filtersActive = status !== "all" || category !== "all" || branchId !== "all" || !!dateFrom || !!dateTo;
  const hasRows = useRef(false);
  useEffect(() => { hasRows.current = items.length > 0; }, [items]);
  const loadingRef = useRef(true);

  // `keepRows`: a manual refresh of the same view keeps showing the rows it
  // already has if the request fails, instead of replacing them with an error.
  const load = useCallback(async (opts?: { keepRows?: boolean }) => {
    if (!rangeValid) return;
    const ticket = guard.begin();
    const keep = !!opts?.keepRows && hasRows.current;
    loadingRef.current = true;
    if (!keep) setState("loading");
    setRefreshError("");
    try {
      const res = await notificationsApi.fetchNotifications({ status, category, branchId, dateFrom, dateTo, page, pageSize: DEFAULT_PAGE_SIZE });
      if (!guard.isCurrent(ticket)) return;
      setItems(withoutDeleted(res.items));
      setTotal(res.total);
      setState("success");
    } catch (err) {
      if (!guard.isCurrent(ticket)) return;
      if (keep) {
        setRefreshError(errorMessage(err, "Couldn't refresh notifications."));
      } else {
        setLoadError(errorMessage(err, "Couldn't load notifications."));
        setState("error");
      }
    } finally {
      if (guard.isCurrent(ticket)) loadingRef.current = false;
    }
  }, [guard, rangeValid, status, category, branchId, dateFrom, dateTo, page, withoutDeleted]);

  useEffect(() => { void load(); }, [load]);

  // Any filter change returns to page 1.
  useEffect(() => { setPage(1); }, [status, category, branchId, dateFrom, dateTo]);

  // Mirror changes the server has already confirmed (from this page or the bell).
  useEffect(() => subscribe((change) => {
    if (change.type === "read-cleared") { void load(); return; }
    if (loadingRef.current) { void load(); return; } // an in-flight response may predate the change
    setItems((prev) => applyChange(prev, change));
    if (change.type === "deleted") {
      setTotal((t) => Math.max(0, t - 1));
    }
  }), [subscribe, load]);

  // Deleting the last row of a later page steps back one page.
  useEffect(() => {
    if (state === "success" && items.length === 0 && page > 1) setPage((p) => p - 1);
  }, [state, items.length, page]);

  function resetFilters() {
    setStatus("all"); setCategory("all"); setBranchId("all"); setDateFrom(""); setDateTo("");
  }

  async function confirmDelete() {
    if (!deleting) return;
    // Stay open on failure so the admin can retry or cancel.
    if (await remove(deleting)) setDeleting(null);
  }

  async function confirmClearRead() {
    if (await clearRead()) setConfirmClear(false);
  }

  const branchOptions = [{ label: "All branches", value: "all" }, ...availableShops.map((s) => ({ label: s.name, value: s.id }))];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread · alerts from every branch. History is kept for ${NOTIFICATION_RETENTION_DAYS} days.`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => void load({ keepRows: true })} aria-label="Refresh notifications">
              <RotateCw size={14} /> Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void markAllRead()} disabled={unreadCount === 0 || bulkBusy !== null} isLoading={bulkBusy === "mark-all"}>
              <CheckCheck size={14} /> Mark all read
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmClear(true)} disabled={bulkBusy !== null}>
              <Trash2 size={14} /> Clear all read
            </Button>
            <Link
              to="/admin/settings"
              state={{ category: "notifications" }}
              className="inline-flex items-center justify-center gap-1.5 font-semibold rounded-btn text-sm px-3 py-1.5 min-h-[40px] bg-white text-charcoal border border-charcoal/10 hover:bg-ivory-soft transition-all duration-150"
            >
              <SettingsIcon size={14} /> Settings
            </Link>
          </>
        }
      />

      <div className="mb-5 overflow-x-auto">
        <Tabs
          tabs={[{ label: "All", value: "all" }, { label: "Unread", value: "unread" }]}
          active={status === "unread" ? "unread" : "all"}
          onChange={(v) => setStatus(v as NotificationStatusFilter)}
        />
      </div>

      <div className="rounded-card bg-white shadow-soft">
        <div className="p-4 sm:p-5 border-b border-charcoal/6">
          <FilterBar>
            <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORY_OPTIONS} className="w-auto min-w-[170px]" />
            <Select aria-label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} options={branchOptions} className="w-auto min-w-[150px]" />
            <label className="flex items-center gap-2 text-sm text-charcoal-muted">
              From
              <input
                type="date" aria-label="From date" value={dateFrom} max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-h-[44px] rounded-btn border border-charcoal/12 bg-white px-3 py-2 text-sm text-charcoal focus:border-yolk-500 outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-charcoal-muted">
              To
              <input
                type="date" aria-label="To date" value={dateTo} min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="min-h-[44px] rounded-btn border border-charcoal/12 bg-white px-3 py-2 text-sm text-charcoal focus:border-yolk-500 outline-none"
              />
            </label>
            {filtersActive && <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button>}
          </FilterBar>
          {!rangeValid && <p className="text-xs text-danger mt-2" role="alert">The start date must be on or before the end date.</p>}
        </div>

        {refreshError && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-soft text-sm text-charcoal" role="status">
            <span className="flex-1">{refreshError} Showing the notifications you already had.</span>
            <button onClick={() => void load({ keepRows: true })} className="font-semibold text-amber hover:underline">Retry</button>
          </div>
        )}

        {state === "loading" && rangeValid && (
          <div className="p-5 space-y-4" role="status" aria-label="Loading notifications">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        )}

        {state === "error" && rangeValid && <ErrorState message={loadError} onRetry={() => void load()} />}

        {state === "success" && rangeValid && items.length === 0 && (
          <EmptyState
            icon={<BellOff size={22} />}
            title={filtersActive ? "No notifications match these filters" : "No notifications yet"}
            description={filtersActive ? "Try a different category, branch or date range." : "You're all caught up. New alerts from every branch will appear here."}
            action={filtersActive ? <Button variant="secondary" size="sm" onClick={resetFilters}>Reset filters</Button> : undefined}
          />
        )}

        {state === "success" && rangeValid && items.length > 0 && (
          <ul aria-label="Notifications">
            {items.map((n) => (
              <NotificationRow key={n.id} item={n} pending={pendingIds.has(n.id)} onToggleRead={(i) => void setRead(i, !i.read)} onDelete={setDeleting} />
            ))}
          </ul>
        )}
      </div>

      {state === "success" && rangeValid && total > 0 && (
        <Pagination page={page} pageSize={DEFAULT_PAGE_SIZE} total={total} onPageChange={setPage} />
      )}

      <ConfirmModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        isLoading={deleting !== null && pendingIds.has(deleting.id)}
        title="Delete this notification?"
        description="Only the notification is removed. The related sale, stock, credit or other business record is not changed."
        confirmLabel="Delete"
        isDangerous
      />
      <ConfirmModal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => void confirmClearRead()}
        isLoading={bulkBusy === "clear-read"}
        title="Clear all read notifications?"
        description="Every read notification, from all branches, is deleted. Unread notifications and all business records stay as they are."
        confirmLabel="Clear read"
        isDangerous
      />
    </div>
  );
}
