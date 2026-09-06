import { apiClient, USE_MOCK } from "./client";
import { delay, MOCK_ADMIN } from "./mockStore";
import type { AdminProfile, AdminProfileFormValues } from "../types";

// NOTE for backend integration: expects GET /admin/profile
export async function fetchAdminProfile(): Promise<AdminProfile> {
  if (USE_MOCK) {
    return delay({ ...MOCK_ADMIN, lastLogin: new Date().toISOString() }, 400);
  }
  const { data } = await apiClient.get<AdminProfile>("/admin/profile");
  return data;
}

// NOTE for backend integration: expects PUT /admin/profile { name, email }
export async function updateAdminProfile(values: AdminProfileFormValues): Promise<AdminProfile> {
  if (USE_MOCK) {
    return delay({ ...MOCK_ADMIN, name: values.name, email: values.email, lastLogin: new Date().toISOString() }, 450);
  }
  const { data } = await apiClient.put<AdminProfile>("/admin/profile", values);
  return data;
}
