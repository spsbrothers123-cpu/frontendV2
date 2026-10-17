import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui";
import { resetPassword } from "../api/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "This link may have expired. Please request a new one.");
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
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-3 text-success" size={36} />
              <h1 className="font-display font-bold text-xl text-charcoal mb-1">Password reset</h1>
              <p className="text-sm text-charcoal-muted mb-6">
                Your password has been changed. You can now sign in with your new password.
              </p>
              <Button fullWidth size="lg" onClick={() => navigate("/admin/login", { replace: true })}>
                Go to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-xl text-charcoal mb-1">Set a new password</h1>
              <p className="text-sm text-charcoal-muted mb-6">
                Choose a new password for your admin account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="password" className="text-sm font-medium text-charcoal block mb-1.5">New password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full min-h-[44px] rounded-btn border border-charcoal/12 bg-white pl-10 pr-10 py-2.5 text-sm focus:border-yolk-500 outline-none transition-colors duration-150"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-charcoal-muted">At least 8 characters, with a letter and a number.</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-charcoal block mb-1.5">Confirm new password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Reset password
                </Button>
              </form>

              <Link to="/admin/login" className="mt-5 inline-block text-sm font-medium text-charcoal-muted hover:text-charcoal">
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
