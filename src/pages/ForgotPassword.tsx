import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2, KeyRound, FileKey2, Lock, Eye, EyeOff, Fingerprint } from "lucide-react";
import { Button } from "../components/ui";
import * as recoveryApi from "../api/recovery";
import { describePasskeyAuthError, getPasskeyAssertion, isPasskeySupported } from "../lib/webauthn";
import type { RecoveryGrant } from "../types/security";

// Admin Forgot Password: prove ownership with a registered passkey or an
// emergency recovery code, then choose a new password. There is NO emailed
// link for Admins. Every check happens on the server; this page only walks the
// Admin through the steps.
//
// The page never learns (and never shows) whether an email belongs to an
// Admin or which recovery methods that account has — both options are always
// offered and a failure reads the same either way.

type Step = "email" | "method" | "code" | "password" | "done";

const inputClass =
  "w-full min-h-[44px] rounded-btn border border-charcoal/12 bg-white py-2.5 text-sm focus:border-yolk-500 outline-none transition-colors duration-150";

function Shell({ children }: { children: ReactNode }) {
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
        <div className="bg-ivory-card rounded-card shadow-lift p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-danger bg-danger-soft rounded-btn px-3.5 py-2.5">
      {message}
    </p>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // The recovery grant lives in memory only: not in the URL, not in storage.
  const [grant, setGrant] = useState<RecoveryGrant | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passkeysSupported = isPasskeySupported();

  function goTo(next: Step) {
    setError(null);
    setStep(next);
  }

  function startOver(message?: string) {
    setGrant(null);
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setStep("method");
    setError(message ?? null);
  }

  function handleEmail(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your admin email.");
      return;
    }
    goTo("method");
  }

  async function handlePasskey() {
    setError(null);
    setBusy(true);
    try {
      const { challengeId, options } = await recoveryApi.beginPasskeyRecovery(email.trim());
      let response;
      try {
        response = await getPasskeyAssertion(options);
      } catch (err) {
        // A cancelled/failed browser prompt — nothing was sent to the server.
        setError(describePasskeyAuthError(err));
        return;
      }
      setGrant(await recoveryApi.finishPasskeyRecovery({ email: email.trim(), challengeId, response }));
      goTo("password");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Enter one of your recovery codes.");
      return;
    }
    setBusy(true);
    try {
      setGrant(await recoveryApi.verifyRecoveryCode(email.trim(), code.trim()));
      setCode(""); // the code is spent; don't keep it in memory
      goTo("password");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!grant) {
      startOver("Please verify your recovery method again.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await recoveryApi.resetPasswordWithGrant(grant.grantToken, password);
      setGrant(null);
      setPassword("");
      setConfirmPassword("");
      goTo("done");
    } catch (err: any) {
      if (err?.code === "RECOVERY_GRANT_INVALID") {
        // Expired, already used, or from another browser: a fresh verification is needed.
        startOver("Your recovery session expired. Please verify again.");
      } else {
        // e.g. password policy: keep the grant so the Admin can just fix it and retry.
        setError(err?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const backLink = (
    <Link
      to="/admin/login"
      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-muted hover:text-charcoal"
    >
      <ArrowLeft size={14} /> Back to sign in
    </Link>
  );

  if (step === "done") {
    return (
      <Shell>
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-3 text-success" size={36} />
          <h1 className="font-display font-bold text-xl text-charcoal mb-1">Password reset</h1>
          <p className="text-sm text-charcoal-muted mb-6">
            Your password has been changed and you've been signed out everywhere. Sign in with your new password.
          </p>
          <Button fullWidth size="lg" onClick={() => navigate("/admin/login", { replace: true })}>
            Go to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  if (step === "password") {
    return (
      <Shell>
        <h1 className="font-display font-bold text-xl text-charcoal mb-1">Set a new password</h1>
        <p className="text-sm text-charcoal-muted mb-6">Verified. Choose a new password for your admin account.</p>
        <form onSubmit={handlePassword} className="space-y-4" noValidate>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-charcoal block mb-1.5">New password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pl-10 pr-10`}
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
            <label htmlFor="confirmPassword" className="text-sm font-medium text-charcoal block mb-1.5">
              Confirm new password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${inputClass} pl-10 pr-3.5`}
                placeholder="••••••••"
              />
            </div>
          </div>
          <ErrorText message={error} />
          <Button type="submit" fullWidth isLoading={busy} size="lg">Reset password</Button>
        </form>
        {backLink}
      </Shell>
    );
  }

  if (step === "code") {
    return (
      <Shell>
        <h1 className="font-display font-bold text-xl text-charcoal mb-1">Use a recovery code</h1>
        <p className="text-sm text-charcoal-muted mb-6">
          Enter one of the emergency recovery codes you saved. Each code works only once.
        </p>
        <form onSubmit={handleCode} className="space-y-4" noValidate>
          <div>
            <label htmlFor="code" className="text-sm font-medium text-charcoal block mb-1.5">Recovery code</label>
            <div className="relative">
              <FileKey2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
              <input
                id="code"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${inputClass} pl-10 pr-3.5 font-mono tracking-wide`}
                placeholder="XXXX-XXXX-XXXX-XXXX-…"
              />
            </div>
          </div>
          <ErrorText message={error} />
          <Button type="submit" fullWidth isLoading={busy} size="lg">Verify code</Button>
        </form>
        <button
          type="button"
          onClick={() => goTo("method")}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-muted hover:text-charcoal"
        >
          <ArrowLeft size={14} /> Choose another method
        </button>
      </Shell>
    );
  }

  if (step === "method") {
    return (
      <Shell>
        <h1 className="font-display font-bold text-xl text-charcoal mb-1">Verify it's you</h1>
        <p className="text-sm text-charcoal-muted mb-6">
          Choose how to confirm ownership of <strong className="break-all">{email}</strong>.
        </p>

        <div className="space-y-3">
          {passkeysSupported && (
            <Button type="button" fullWidth size="lg" variant="secondary" isLoading={busy} onClick={handlePasskey}>
              <Fingerprint size={18} /> Use a passkey
            </Button>
          )}
          <Button type="button" fullWidth size="lg" variant="secondary" disabled={busy} onClick={() => goTo("code")}>
            <KeyRound size={18} /> Use a recovery code
          </Button>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorText message={error} />
          </div>
        )}

        <p className="mt-5 text-xs text-charcoal-muted">
          Admin passwords can't be reset by email. If you have neither a passkey nor a recovery code, contact your
          Egg Mart system owner.
        </p>

        <button
          type="button"
          onClick={() => goTo("email")}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-muted hover:text-charcoal"
        >
          <ArrowLeft size={14} /> Use a different email
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display font-bold text-xl text-charcoal mb-1">Reset your password</h1>
      <p className="text-sm text-charcoal-muted mb-6">
        Enter your admin email, then confirm it's you with a passkey or a recovery code.
      </p>

      <form onSubmit={handleEmail} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-charcoal block mb-1.5">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-muted" />
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} pl-10 pr-3.5`}
              placeholder="admin@eggmart.com"
            />
          </div>
        </div>
        <ErrorText message={error} />
        <Button type="submit" fullWidth size="lg">Continue</Button>
      </form>

      {backLink}
    </Shell>
  );
}
