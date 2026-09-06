import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";
import type { ReactElement } from "react";

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory" role="status" aria-label="Checking session">
        <Loader2 className="animate-spin text-yolk-500" size={28} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  // Cashier accounts must never reach admin routes, even if a stale
  // token or cached role suggests otherwise — the backend session
  // (validated in AuthContext) is the source of truth here.
  if (user && user.role !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
