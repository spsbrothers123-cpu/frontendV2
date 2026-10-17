import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
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
          {sent ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-3 text-success" size={36} />
              <h1 className="font-display font-bold text-xl text-charcoal mb-1">Check your email</h1>
              <p className="text-sm text-charcoal-muted mb-6">
                If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
              </p>
              <Link to="/admin/login" className="text-sm font-medium text-yolk-600 hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-xl text-charcoal mb-1">Reset your password</h1>
              <p className="text-sm text-charcoal-muted mb-6">
                Enter your registered email and we'll send you a link to reset your password.
              </p>

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

                {error && (
                  <p role="alert" className="text-sm text-danger bg-danger-soft rounded-btn px-3.5 py-2.5">
                    {error}
                  </p>
                )}

                <Button type="submit" fullWidth isLoading={submitting} size="lg">
                  Send reset link
                </Button>
              </form>

              <Link
                to="/admin/login"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-muted hover:text-charcoal"
              >
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
