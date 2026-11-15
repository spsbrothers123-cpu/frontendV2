// Pure helpers for the Admin Notification Center: labels, formatting,
// request-param building, response parsing, list updates and navigation
// targets. No React, no network — everything here is unit-testable.
import type {
  DailySummary,
  KnownNotificationCategory,
  NotificationChange,
  NotificationItem,
  NotificationListQuery,
  NotificationListResult,
  NotificationSeverity,
  NotificationSettings,
  NotificationTarget,
  SummaryBranch,
  SummaryMetric,
  SummaryMetricFormat,
} from "../types/notifications";

export const NOTIFICATION_TIME_ZONE = "Asia/Kolkata";
export const NOTIFICATION_RETENTION_DAYS = 90;

// ── Categories ───────────────────────────────────────────────────────
export const CATEGORY_LABELS: Record<KnownNotificationCategory, string> = {
  inventory: "Inventory Alerts",
  cashier: "Cashier Activity",
  credit: "Credit Management",
  sales_purchases: "Sales & Purchases",
  security: "Security Alerts",
  daily_summary: "Daily Business Summary",
};

export const CATEGORY_DESCRIPTIONS: Record<KnownNotificationCategory, string> = {
  inventory: "Low or out-of-stock products and stock changes.",
  cashier: "Register sessions, sign-ups and recovery requests.",
  credit: "Pending and overdue customer credit and payments.",
  sales_purchases: "Notable sales, cancellations and purchases.",
  security: "Sign-in, account and permission events.",
  daily_summary: "The end-of-day summary for all branches.",
};

/** Categories whose notifications can never be switched off. */
const LOCKED_CATEGORIES: readonly string[] = ["security"];

export function isCategoryLocked(category: string): boolean {
  return LOCKED_CATEGORIES.includes(category);
}

export function categoryLabel(category: string): string {
  const known = (CATEGORY_LABELS as Record<string, string | undefined>)[category];
  if (known) return known;
  // Unknown category from a newer backend: "stock_transfer" → "Stock transfer".
  const words = category.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Other";
}

export function categoryDescription(category: string): string {
  return (CATEGORY_DESCRIPTIONS as Record<string, string | undefined>)[category] ?? "";
}

// ── Formatting ───────────────────────────────────────────────────────
export function formatUnreadBadge(count: number): string {
  return count > 99 ? "99+" : String(Math.max(0, Math.floor(count)));
}

export function formatNotificationTime(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = now - t;
  if (diff >= 0 && diff < 60_000) return "Just now";
  if (diff >= 0 && diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff >= 0 && diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: NOTIFICATION_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(t);
}

export function formatFullTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return `${new Intl.DateTimeFormat("en-IN", {
    timeZone: NOTIFICATION_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(t)} IST`;
}

export function errorMessage(err: unknown, fallback: string): string {
  const m = (err as { message?: unknown } | null | undefined)?.message;
  return typeof m === "string" && m ? m : fallback;
}

export function isDateRangeValid(from: string, to: string): boolean {
  return !from || !to || from <= to;
}

// ── Request building ─────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 15;

export function buildListParams(q: NotificationListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (q.status && q.status !== "all") params.status = q.status;
  if (q.category && q.category !== "all") params.category = q.category;
  if (q.branchId && q.branchId !== "all") params.branchId = q.branchId;
  if (q.dateFrom) params.dateFrom = q.dateFrom;
  if (q.dateTo) params.dateTo = q.dateTo;
  params.page = q.page ?? 1;
  params.pageSize = q.pageSize ?? DEFAULT_PAGE_SIZE;
  return params;
}

// ── Response parsing ─────────────────────────────────────────────────
// Backend contract is not final, so the parser is strict about what the UI
// depends on (ids, titles, timestamps, the unread count) and lenient about
// everything else. A response that doesn't fit throws instead of letting the
// UI show wrong numbers.
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function unexpected(): { status: null; message: string } {
  return { status: null, message: "The server sent notifications in an unexpected format. Please try again." };
}

/** Accepts either a bare payload or the app's `{ success, data }` envelope. */
export function unwrapEnvelope(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "data" in raw && "success" in raw) {
    return (raw as { data: unknown }).data;
  }
  return raw;
}

const SEVERITIES: readonly NotificationSeverity[] = ["info", "warning", "critical"];

function parseTarget(raw: unknown): NotificationTarget | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const kind = str(r.kind);
  if (!kind) return null;
  return { kind, id: str(r.id), route: str(r.route) };
}

export function normalizeNotification(raw: unknown): NotificationItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  const title = str(r.title);
  const createdAt = str(r.createdAt);
  if (!id || !title || !createdAt || Number.isNaN(Date.parse(createdAt))) return null;

  const branchRaw = r.branch as Record<string, unknown> | null | undefined;
  const branchId = branchRaw ? str(branchRaw.id) : null;
  const branchName = branchRaw ? str(branchRaw.name) : null;

  return {
    id,
    category: str(r.category) ?? "other",
    type: str(r.type) ?? "",
    severity: SEVERITIES.includes(r.severity as NotificationSeverity) ? (r.severity as NotificationSeverity) : "info",
    title,
    message: typeof r.message === "string" ? r.message : "",
    createdAt,
    read: r.read === true,
    branch: branchId && branchName ? { id: branchId, name: branchName } : null,
    target: parseTarget(r.target),
  };
}

export function normalizeListResponse(raw: unknown, query: NotificationListQuery): NotificationListResult {
  const body = unwrapEnvelope(raw);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw unexpected();
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.items) || typeof b.unreadCount !== "number" || !Number.isFinite(b.unreadCount)) throw unexpected();

  const items = b.items.map(normalizeNotification).filter((n): n is NotificationItem => n !== null);
  return {
    items,
    total: typeof b.total === "number" && Number.isFinite(b.total) ? b.total : items.length,
    page: typeof b.page === "number" ? b.page : query.page ?? 1,
    pageSize: typeof b.pageSize === "number" ? b.pageSize : query.pageSize ?? DEFAULT_PAGE_SIZE,
    unreadCount: Math.max(0, Math.floor(b.unreadCount)),
  };
}

export function normalizeSettings(raw: unknown): NotificationSettings {
  const body = unwrapEnvelope(raw);
  const list = body && typeof body === "object" ? (body as { categories?: unknown }).categories : null;
  if (!Array.isArray(list)) throw unexpected();
  const categories = list.flatMap((c) => {
    const category = c && typeof c === "object" ? str((c as Record<string, unknown>).category) : null;
    if (!category) return [];
    return [{ category, enabled: (c as Record<string, unknown>).enabled !== false }];
  });
  return { categories };
}

const METRIC_FORMATS: readonly SummaryMetricFormat[] = ["currency", "count", "percent", "text"];

function parseMetrics(raw: unknown): SummaryMetric[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((m) => {
    if (!m || typeof m !== "object") return [];
    const r = m as Record<string, unknown>;
    const key = str(r.key);
    const label = str(r.label);
    const value = typeof r.value === "number" || typeof r.value === "string" ? r.value : null;
    if (!key || !label || value === null) return [];
    const format = METRIC_FORMATS.includes(r.format as SummaryMetricFormat) ? (r.format as SummaryMetricFormat) : "text";
    return [{ key, label, value, format }];
  });
}

export function normalizeDailySummary(raw: unknown): DailySummary {
  const body = unwrapEnvelope(raw);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw unexpected();
  const r = body as Record<string, unknown>;
  const id = str(r.id);
  const businessDate = str(r.businessDate);
  if (!id || !businessDate) throw unexpected();

  const branches: SummaryBranch[] = Array.isArray(r.branches)
    ? r.branches.flatMap((b) => {
        if (!b || typeof b !== "object") return [];
        const br = (b as Record<string, unknown>).branch as Record<string, unknown> | undefined;
        const bid = br ? str(br.id) : null;
        const bname = br ? str(br.name) : null;
        if (!bid || !bname) return [];
        return [{ branch: { id: bid, name: bname }, metrics: parseMetrics((b as Record<string, unknown>).metrics) }];
      })
    : [];

  return {
    id,
    businessDate,
    windowStart: str(r.windowStart),
    windowEnd: str(r.windowEnd),
    generatedAt: str(r.generatedAt),
    metrics: parseMetrics(r.metrics),
    branches,
  };
}

// ── Local list updates (mirror what the server already confirmed) ────
export function countUnread(items: NotificationItem[]): number {
  return items.filter((n) => !n.read).length;
}

export function applyChange(items: NotificationItem[], change: NotificationChange): NotificationItem[] {
  switch (change.type) {
    case "read-state":
      return items.map((n) => (n.id === change.id ? { ...n, read: change.read } : n));
    case "deleted":
      return items.filter((n) => n.id !== change.id);
    case "all-read":
      return items.map((n) => (n.read ? n : { ...n, read: true }));
    case "read-cleared":
      return items.filter((n) => !n.read);
  }
}

/** Unread-counter delta caused by a change, given the item it applied to. */
export function unreadDelta(change: NotificationChange, item?: NotificationItem): number {
  if (change.type === "read-state") return item && item.read !== change.read ? (change.read ? -1 : 1) : 0;
  if (change.type === "deleted") return item && !item.read ? -1 : 0;
  return 0;
}

// ── Navigation targets ───────────────────────────────────────────────
export interface ResolvedTarget {
  path: string;
  label: string;
  /**
   * true  = the destination opens this exact record (Daily Summary page, or a
   *         route the backend supplied for it).
   * false = lands on the right module page; that page does not open single
   *         records by id yet.
   */
  exact: boolean;
}

const KIND_ROUTES: Record<string, { path: string; label: string }> = {
  product: { path: "/admin/inventory", label: "Inventory" },
  inventory: { path: "/admin/inventory", label: "Inventory" },
  bill: { path: "/admin/history", label: "History" },
  sale: { path: "/admin/history", label: "History" },
  purchase: { path: "/admin/purchases", label: "Purchases" },
  expense: { path: "/admin/expenses", label: "Expenses" },
  customer: { path: "/admin/customers", label: "Customers" },
  credit: { path: "/admin/credits", label: "Credits" },
  cashier: { path: "/admin/cashiers", label: "Cashiers" },
  session: { path: "/admin/sessions", label: "Sessions" },
  recovery_request: { path: "/admin/sessions?tab=recovery", label: "Recovery Requests" },
};

/** Only same-app Admin paths are ever navigated to; anything else is ignored. */
export function isSafeAdminRoute(route: string): boolean {
  return (
    route.startsWith("/admin/") &&
    !route.includes("//") &&
    !route.includes("\\") &&
    !route.includes("..") &&
    !/\s/.test(route)
  );
}

export const NOTIFICATION_CENTER_PATH = "/admin/notifications";

export function dailySummaryPath(id: string): string {
  return `/admin/daily-summaries/${encodeURIComponent(id)}`;
}

export function resolveNotificationTarget(n: Pick<NotificationItem, "target">): ResolvedTarget | null {
  const t = n.target;
  if (!t) return null;

  if (t.route && isSafeAdminRoute(t.route)) {
    return { path: t.route, label: "Open record", exact: true };
  }
  if (t.kind === "daily_summary" && t.id) {
    return { path: dailySummaryPath(t.id), label: "View summary", exact: true };
  }
  const module = KIND_ROUTES[t.kind];
  if (module) return { path: module.path, label: `Open ${module.label}`, exact: false };
  return null;
}
