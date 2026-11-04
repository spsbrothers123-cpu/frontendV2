import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, Input } from "../ui";

interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  isDangerous?: boolean;
  /** Optional extra fields rendered above the password input. */
  children?: ReactNode;
  /**
   * Runs with the entered password. Throw (e.g. an ApiError) to keep the modal
   * open and show the message inline; resolve to signal success. The parent is
   * responsible for closing the modal on success.
   */
  onSubmit: (currentPassword: string) => Promise<void>;
}

/**
 * "Recent authentication" prompt: every sensitive recovery action asks the
 * Admin to re-enter their current password, which the SERVER verifies on that
 * request. The password lives only in this component's state and is cleared
 * on close and after every attempt.
 */
export function PasswordPromptModal({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel,
  isDangerous,
  children,
  onSubmit,
}: PasswordPromptModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(password);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-charcoal/40" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-sm bg-ivory-card rounded-card shadow-lift p-6 space-y-4">
        <div>
          <h3 className="font-display font-bold text-lg text-charcoal mb-1">{title}</h3>
          <p className="text-sm text-charcoal-muted">{description}</p>
        </div>
        {children}
        <Input
          label="Current password"
          type="password"
          name="current-password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
          hint={error ? undefined : "Re-enter your password to confirm it's you."}
        />
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant={isDangerous ? "danger" : "primary"} size="sm" isLoading={busy} disabled={!password}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}
