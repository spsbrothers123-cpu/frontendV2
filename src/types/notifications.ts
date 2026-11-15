// ── Admin Notification Center types ─────────────────────────────────
// Phase 1 (frontend only). The backend notification API does not exist yet;
// the proposed contract lives in NOTIFICATIONS_API_CONTRACT.md.
//
// Categories, event types and target kinds are open-ended strings with a
// list of known values, so a category the backend adds later is still shown
// (under a humanised label) instead of crashing or being dropped.

export const KNOWN_NOTIFICATION_CATEGORIES = [
  "inventory",
  "cashier",
  "credit",
  "sales_purchases",
  "security",
  "daily_summary",
] as const;

export type KnownNotificationCategory = (typeof KNOWN_NOTIFICATION_CATEGORIES)[number];
export type NotificationCategory = KnownNotificationCategory | (string & {});

export type NotificationSeverity = "info" | "warning" | "critical";

/** Points at the business record a notification is about. */
export interface NotificationTarget {
  /** e.g. "product", "bill", "purchase", "credit", "cashier", "session", "daily_summary". */
  kind: string;
  id: string | null;
  /** Optional internal Admin route the backend wants opened (must start with /admin/). */
  route: string | null;
}

export interface NotificationBranch {
  id: string;
  name: string;
}

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  /** Specific event, e.g. "inventory.low_stock". Free-form so new events need no UI change. */
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  read: boolean;
  /** null/absent = not tied to one branch (e.g. the company-wide daily summary). */
  branch: NotificationBranch | null;
  target: NotificationTarget | null;
}

export type NotificationStatusFilter = "all" | "unread" | "read";

export interface NotificationListQuery {
  status?: NotificationStatusFilter;
  category?: string;
  branchId?: string;
  /** YYYY-MM-DD, inclusive. */
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface NotificationListResult {
  items: NotificationItem[];
  /** Total rows matching the query (all pages). */
  total: number;
  page: number;
  pageSize: number;
  /** Unread notifications across ALL branches and filters — drives the bell counter. */
  unreadCount: number;
}

/** Something that already happened on the server; the UI mirrors it locally. */
export type NotificationChange =
  | { type: "read-state"; id: string; read: boolean }
  | { type: "deleted"; id: string }
  | { type: "all-read" }
  | { type: "read-cleared"; deletedCount: number };

// ── Settings ─────────────────────────────────────────────────────────
export interface NotificationCategorySetting {
  category: NotificationCategory;
  enabled: boolean;
}

export interface NotificationSettings {
  categories: NotificationCategorySetting[];
}

// ── Daily Business Summary ───────────────────────────────────────────
export type SummaryMetricFormat = "currency" | "count" | "percent" | "text";

export interface SummaryMetric {
  key: string;
  label: string;
  value: number | string;
  format: SummaryMetricFormat;
}

export interface SummaryBranch {
  branch: NotificationBranch;
  metrics: SummaryMetric[];
}

export interface DailySummary {
  id: string;
  /** YYYY-MM-DD business date (IST). */
  businessDate: string;
  /** Reporting window; the approved rule is 12 AM–10 PM IST. */
  windowStart: string | null;
  windowEnd: string | null;
  generatedAt: string | null;
  metrics: SummaryMetric[];
  branches: SummaryBranch[];
}
