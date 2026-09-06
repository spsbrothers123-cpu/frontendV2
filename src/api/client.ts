import axios from "axios";

// Set VITE_API_BASE_URL in .env to point at the real backend.
// Until then, USE_MOCK (see mock.ts) serves data from an in-memory store
// so the whole app is fully clickable without a backend connection.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") === "true";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("eggmart_admin_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

// Clears any client-level auth state so a stale Authorization header can
// never be sent after logout or session expiry. The request interceptor
// re-reads the token from localStorage on every call, so clearing the
// default header here is the belt to that suspenders.
export function resetApiClientAuth() {
  delete apiClient.defaults.headers.common["Authorization"];
}

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(normalizeApiError(error));
  }
);

export interface ApiError {
  status: number | null;
  message: string;
  code?: string;
}

export function normalizeApiError(error: any): ApiError {
  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data;
    const message =
      data?.message ||
      (status === 401 && "Your session has expired. Please sign in again.") ||
      (status === 403 && "You don't have permission to do that.") ||
      (status === 404 && "We couldn't find what you were looking for.") ||
      (status === 409 && "This conflicts with existing data.") ||
      (status === 422 && "Some fields need your attention.") ||
      (status >= 500 && "Something went wrong on our end. Please try again.") ||
      "Something went wrong. Please try again.";
    return { status, message, code: data?.code };
  }
  if (error?.request) {
    return { status: null, message: "Network error. Check your connection and try again." };
  }
  return { status: null, message: error?.message || "Unexpected error." };
}
