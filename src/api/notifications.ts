import { apiClient, USE_MOCK } from "./client";
import { delay, store } from "./mockStore";
import type { NotificationItem } from "../types";

// NOTE for backend integration: expects GET /admin/notifications
export async function fetchNotifications(): Promise<NotificationItem[]> {
  if (USE_MOCK) return delay([...store.notifications].sort((a, b) => b.time.localeCompare(a.time)), 400);
  const { data } = await apiClient.get<NotificationItem[]>("/admin/notifications");
  return data;
}

// NOTE for backend integration: expects PATCH /admin/notifications/:id/read
export async function markNotificationRead(id: string): Promise<void> {
  if (USE_MOCK) {
    store.notifications = store.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    return delay(undefined, 250);
  }
  await apiClient.patch(`/admin/notifications/${id}/read`);
}

// NOTE for backend integration: expects PATCH /admin/notifications/read-all
export async function markAllNotificationsRead(): Promise<void> {
  if (USE_MOCK) {
    store.notifications = store.notifications.map((n) => ({ ...n, read: true }));
    return delay(undefined, 300);
  }
  await apiClient.patch("/admin/notifications/read-all");
}
