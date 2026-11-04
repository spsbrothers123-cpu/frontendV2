import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button, Input } from "../ui";
import type { CashierRecoveryRequest } from "../../types/cashierRecovery";
import { formatRemaining, useNow } from "./recoveryTime";

interface Props {
  request: CashierRecoveryRequest;
  onClose: () => void;
  /**
   * Runs with the entered password. Throw (e.g. an ApiError) to keep the modal
   * open and show the message inline; resolve when finished. The parent closes
   * the modal.
   */
  onApprove: (currentPassword: string) => Promise<void>;
}

/**
 * Approval step: the Admin must (1) explicitly confirm they verified the
 * Cashier's identity in person and (2) re-enter their own password, which the
 * SERVER verifies on the approve request itself. The password lives only in
 * this component's state and is cleared after every attempt. The parent mounts
 * this component only while a request is being approved, so closing it discards
 * all state (password and confirmation included).
 */
export function ApproveRecoveryModal({ request, onClose, onApprove }: Props) {
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useNow(1000);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const remaining = formatRemaining(request.expiresAt, now);
  const lapsed = remaining === null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!verified || !password || busy || lapsed) return;
    setBusy(true);
    setError(null);
    try {
      await onApprove(password);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Approve recovery request">
      <div className="absolute inset-0 bg-charcoal/40" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-md bg-ivory-card rounded-card shadow-lift p-6 space-y-4">
        <div>
          <h3 className="font-display font-bold text-lg text-charcoal mb-1">Approve password recovery</h3>
          <p className="text-sm text-charcoal-muted">
            A one-time recovery code will be generated. You will see it once and hand it to the cashier in person.
          </p>
        </div>

        <dl className="rounded-btn bg-charcoal/5 px-4 py-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-charcoal-muted">Cashier</dt>
          <dd className="font-semibold text-charcoal">{request.cashier.name}</dd>
          <dt className="text-charcoal-muted">Account</dt>
          <dd className="text-charcoal break-all">{request.cashier.email}</dd>
          <dt className="text-charcoal-muted">Shop</dt>
          <dd className="text-charcoal">
            {request.shop?.name ?? "—"}
            {request.cashier.branchName ? ` · ${request.cashier.branchName}` : ""}
          </dd>
          <dt className="text-charcoal-muted">Request expires</dt>
          <dd className={lapsed ? "text-danger font-semibold" : "text-charcoal font-semibold"}>
            {lapsed ? "Expired" : `in ${remaining}`}
          </dd>
        </dl>

        <label className="flex items-start gap-3 text-sm text-charcoal cursor-pointer">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
            disabled={busy || lapsed}
            className="mt-0.5 w-4 h-4 accent-yolk-500"
          />
          <span>
            I have verified this cashier's identity <strong>in person</strong>.
          </span>
        </label>

        <Input
          label="Your password"
          type="password"
          name="current-password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy || lapsed}
          error={error ?? undefined}
          hint={error ? undefined : "Re-enter your own password to confirm it's you."}
        />

        <p className="text-xs text-charcoal-muted">
          Approval does not extend the 15-minute deadline. You can never see the cashier's password — they choose a new one themselves.
        </p>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={busy} disabled={!verified || !password || lapsed}>
            Approve &amp; generate code
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}
