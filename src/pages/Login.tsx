import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui";

export default function Login() {
  const { login, isAuthenticated, isLoading, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <Loader2 className="animate-spin text-yolk-500" size={28} />
      </div>
    );
  }

  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || "/admin/dashboard";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      clearSessionExpired();
      navigate("/admin/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-8">
          <svg width="38" height="38" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <ellipse cx="16" cy="17" rx="12" ry="13.5" fill="#F0B429" />
            <ellipse cx="13" cy="13" rx="4.5" ry="5" fill="#FFF3C4" fillOpacity="0.55" />
          </svg>
          <div>
            <p className="font-display font-extrabold text-white text-lg leading-tight">EGG MART</p>
            <p className="text-xs text-white/50 leading-tight">Admin Panel</p>
          </div>
        </div>

        <div className="bg-ivory-card rounded-card shadow-lift p-6 sm:p-8">
          <h1 className="font-display font-bold text-xl text-charcoal mb-1">Admin sign in</h1>
          <p className="text-sm text-charcoal-muted mb-6">Sign in to manage products, customers, and sales.</p>

          {sessionExpired && (
            <p role="alert" className="text-sm text-danger bg-danger-soft rounded-btn px-3.5 py-2.5 mb-4">
              Your session has expired. Please sign in again.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-charcoal block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[44px] rounded-btn border border-charcoal/12 bg-white pl-10 pr-3.5 py-2.5 text-sm focus:border-yolk-500 outline-none transition-colors duration-150"
                  placeholder="admin@eggmart.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-charcoal block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[44px] rounded-btn border border-charcoal/12 bg-white pl-10 pr-3.5 py-2.5 text-sm focus:border-yolk-500 outline-none transition-colors duration-150"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-danger bg-danger-soft rounded-btn px-3.5 py-2.5">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth isLoading={submitting} size="lg">
              Sign in
            </Button>
          </form>

          <p className="text-xs text-charcoal-muted text-center mt-5">
            Mock mode: any email + a password of 4+ characters signs in.
          </p>
        </div>
      </div>
    </div>
  );
}
