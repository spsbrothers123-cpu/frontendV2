import { apiClient } from "./client";
import {
  buildListParams,
  normalizeDailySummary,
  normalizeListResponse,
  normalizeSettings,
  unwrapEnvelope,
} from "../lib/notifications";
import type {
  DailySummary,
  NotificationListQuery,
  NotificationListResult,
  NotificationSettings,
} from "../types/notifications";

// Every notification request lives in this file.
//
// There is deliberately NO mock/in-memory branch here: the Admin Notification
// Center only ever shows what the backend returns. Until the backend ships
// these endpoints the Center shows its error state — it never invents data.
// Proposed contract (not yet implemented anywhere): NOTIFICATIONS_API_CONTRACT.md.

const BASE = "/admin/notifications";
const enc = encodeURIComponent;

// NOTE for backend integration: expects GET /admin/notifications
//   ?status=unread|read &category &branchId &dateFrom &dateTo &page &pageSize
// -> { success, data: { items, total, page, pageSize, unreadCount } }
// `unreadCount` covers ALL branches and ignores filters (it drives the bell).
export async function fetchNotifications(query: NotificationListQuery = {}): Promise<NotificationListResult> {
  const { data } = await apiClient.get(BASE, { params: buildListParams(query) });
  return normalizeListResponse(data, query);
}

// NOTE for backend integration: expects PATCH /admin/notifications/:id/read { read: boolean }
// Read state changes ONLY through this call — opening a notification or its
// related record never marks it read.
export async function setNotificationRead(id: string, read: boolean): Promise<void> {
  await apiClient.patch(`${BASE}/${enc(id)}/read`, { read });
}

// NOTE for backend integration: expects PATCH /admin/notifications/read-all
// (existing prototype endpoint, kept). Marks every notification read.
export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch(`${BASE}/read-all`);
}

// NOTE for backend integration: expects DELETE /admin/notifications/:id
// Removes the notification only — never the business record it refers to.
// The backend must keep a tombstone so a deleted notification is not
// re-created by later synchronisation.
export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${enc(id)}`);
}

// NOTE for backend integration: expects POST /admin/notifications/clear-read
// -> { success, data: { deletedCount } }. Deletes every READ notification.
export async function clearReadNotifications(): Promise<{ deletedCount: number }> {
  const { data } = await apiClient.post(`${BASE}/clear-read`);
  const body = unwrapEnvelope(data) as { deletedCount?: unknown } | null;
  return { deletedCount: typeof body?.deletedCount === "number" ? body.deletedCount : 0 };
}

// NOTE for backend integration: expects GET/PUT /admin/notification-settings
// -> { success, data: { categories: [{ category, enabled }] } }
// The backend must refuse to disable critical security notifications.
export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const { data } = await apiClient.get("/admin/notification-settings");
  return normalizeSettings(data);
}

export async function saveNotificationSettings(values: NotificationSettings): Promise<NotificationSettings> {
  const { data } = await apiClient.put("/admin/notification-settings", values);
  return normalizeSettings(data);
}

// NOTE for backend integration: expects GET /admin/daily-summaries/:id
// The summary covers 12 AM–10 PM IST and is generated at 10 PM IST.
export async function fetchDailySummary(id: string): Promise<DailySummary> {
  const { data } = await apiClient.get(`/admin/daily-summaries/${enc(id)}`);
  return normalizeDailySummary(data);
}
