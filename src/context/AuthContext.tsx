import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import * as authApi from "../api/auth";
import { registerUnauthorizedHandler, resetApiClientAuth } from "../api/client";
import type { AdminUser } from "../types";

interface AuthContextValue {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Full secure-logout sequence: tell the backend (best-effort), then
  // clear every piece of local credential/session state and reset the
  // API client so no stale Authorization header can leak into a later
  // request from a different account.
  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      authApi.clearToken();
      resetApiClientAuth();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      authApi.clearToken();
      resetApiClientAuth();
      setUser(null);
      setSessionExpired(true);
    });
  }, []);

  useEffect(() => {
    // Backend is the source of truth for the session — we never trust a
    // cached role from localStorage alone. A stored token is only ever
    // treated as "worth checking", not as proof of an active session.
    (async () => {
      const token = authApi.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.fetchCurrentUser();
        if (me.role !== "admin") {
          await handleLogout();
        } else {
          setUser(me);
        }
      } catch {
        authApi.clearToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [handleLogout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    if (res.user.role !== "admin") {
      throw { status: 403, message: "This account doesn't have admin access." };
    }
    authApi.setToken(res.token);
    setUser(res.user);
    setSessionExpired(false);
  }, []);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, sessionExpired, login, logout: handleLogout, clearSessionExpired }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
