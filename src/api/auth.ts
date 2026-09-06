import { apiClient, USE_MOCK } from "./client";
import { delay, MOCK_ADMIN } from "./mockStore";
import type { AdminUser } from "../types";

const TOKEN_KEY = "eggmart_admin_token";
const REFRESH_TOKEN_KEY = "eggmart_admin_refresh_token";
// Any other session-scoped keys that should never survive a logout.
const SESSION_STORAGE_KEYS = ["eggmart_admin_cached_user"];

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AdminUser;
}

// NOTE for backend integration: expects POST /auth/admin/login
// returning { token, user }. Swap USE_MOCK off (see client.ts) once wired.
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  if (USE_MOCK) {
    if (!payload.email || !payload.password) {
      return Promise.reject({ status: 422, message: "Email and password are required." });
    }
    if (payload.password.length < 4) {
      return Promise.reject({ status: 401, message: "Invalid email or password." });
    }
    const res = { token: "mock-token-" + Date.now(), user: MOCK_ADMIN };
    return delay(res, 600);
  }
  const { data } = await apiClient.post<LoginResponse>("/auth/admin/login", payload);
  return data;
}

// NOTE for backend integration: expects POST /auth/logout (optional but
// recommended so the server can invalidate the session/token).
export async function logout(): Promise<void> {
  if (!USE_MOCK) {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // best-effort: still clear local state even if the call fails
    }
  }
}

// NOTE for backend integration: expects GET /auth/me to validate a token
// and fetch the current admin's profile — used on app load to confirm
// the session is still valid rather than trusting localStorage alone.
export async function fetchCurrentUser(): Promise<AdminUser> {
  if (USE_MOCK) {
    const token = getToken();
    if (!token) return Promise.reject({ status: 401, message: "Not authenticated." });
    return delay(MOCK_ADMIN, 300);
  }
  const { data } = await apiClient.get<AdminUser>("/auth/me");
  return data;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

// Clears every piece of locally-cached auth/session state: the access
// token, the refresh token (if the backend ever issues one), and any
// cached user/profile data. Used on logout and on session expiry so no
// stale credential or sensitive data is left behind in the browser.
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  SESSION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}
