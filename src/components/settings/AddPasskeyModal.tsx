import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { Fingerprint } from "lucide-react";
import { Button, Input } from "../ui";
import * as securityApi from "../../api/security";
import { createPasskey, describePasskeyError } from "../../lib/webauthn";
import type { PasskeyCreationOptionsJSON, PasskeySummary } from "../../types/security";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (passkey: PasskeySummary) => void;
}

/**
 * Two steps on purpose. Step 1 re-checks the password and fetches the server's
 * challenge. Step 2 is a SEPARATE click that calls the browser's passkey
 * prompt immediately — Safari (and others) refuse to open that prompt if a
 * network round-trip happened between the click and the call.
 */
export function AddPasskeyModal({ isOpen, onClose, onAdded }: Props) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<{ challengeId: string; options: PasskeyCreationOptionsJSON } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setPassword("");
      setPending(null);
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

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      setPending(await securityApi.beginPasskeyRegistration(password));
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await createPasskey(pending.options);
      const passkey = await securityApi.finishPasskeyRegistration({
        challengeId: pending.challengeId,
        name: name.trim() || undefined,
        response,
      });
      onAdded(passkey);
    } catch (err: any) {
      // A DOMException comes from the browser prompt; anything else is an ApiError.
      setError(err instanceof DOMException ? describePasskeyError(err) : err?.message || describePasskeyError(err));
      // The server burns the challenge on any failed verification, so start over.
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Add a passkey">
      <div className="absolute inset-0 bg-charcoal/40" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm bg-ivory-card rounded-card shadow-lift p-6 space-y-4">
        {!pending ? (
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-lg text-charcoal mb-1">Add a passkey</h3>
              <p className="text-sm text-charcoal-muted">
                Use Windows Hello, your fingerprint or face, a phone, or a security key. Your biometric data never leaves your device.
              </p>
            </div>
            <Input label="Name (optional)" value={name} maxLength={60} placeholder="e.g. Shop laptop" onChange={(e) => setName(e.target.value)} />
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
              <Button type="submit" size="sm" isLoading={busy} disabled={!password}>Continue</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-yolk-100 p-2.5 text-yolk-800"><Fingerprint size={22} /></div>
              <div>
                <h3 className="font-display font-bold text-lg text-charcoal mb-1">Create your passkey</h3>
                <p className="text-sm text-charcoal-muted">Your device will now ask you to verify it's you.</p>
              </div>
            </div>
            {error && <p className="text-xs text-danger" role="alert">{error}</p>}
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button type="button" size="sm" onClick={handleCreate} isLoading={busy}>Create passkey</Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
