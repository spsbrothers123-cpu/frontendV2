import { useCallback, useEffect, useState } from "react";
import { KeyRound, Check } from "lucide-react";
import { Button, StatusBadge, ErrorState, ConfirmModal } from "../ui";
import { useToast } from "../../context/ToastContext";
import * as invitationsApi from "../../api/invitations";
import type { InvitationCode } from "../../types";

// Codes are re-checked against the server on every load rather than timed
// out purely on the client, since expiry is decided by the backend clock
// (see api/invitations.ts). Polling while a code is active just means the
// UI notices that transition without a manual refresh.
const POLL_MS = 20_000;

export function InvitationCodeSection() {
  const { showToast } = useToast();
  const [code, setCode] = useState<InvitationCode | null>(null);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setCode(await invitationsApi.getActiveInvitationCode());
      setState("success");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isActive = code?.status === "ACTIVE";

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [isActive, load]);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const created = await invitationsApi.generateInvitationCode();
      setCode(created);
      setCopied(false);
      showToast(isActive ? "New code generated — the previous code no longer works." : "Invitation code generated.", "success");
    } catch {
      showToast("Couldn't generate a code. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRevoke() {
    if (!code) return;
    setIsRevoking(true);
    try {
      await invitationsApi.revokeInvitationCode(code.id);
      setCode({ ...code, status: "REVOKED" });
      showToast("Invitation code revoked.", "info");
      setConfirmingRevoke(false);
    } catch {
      showToast("Couldn't revoke this code. Please try again.", "error");
    } finally {
      setIsRevoking(false);
    }
  }

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Couldn't copy the code.", "error");
    }
  }

  return (
    <div className="rounded-card bg-white shadow-soft p-4 sm:p-5 mb-6">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-btn bg-yolk-100 flex items-center justify-center shrink-0">
          <KeyRound size={18} className="text-yolk-700" />
        </span>
        <div>
          <h2 className="font-display font-bold text-lg text-charcoal">Invitation Code</h2>
          <p className="text-sm text-charcoal-muted mt-0.5">
            Share this code with new cashiers so they can sign up for this shop.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {state === "error" && <ErrorState message="Couldn't load the invitation code." onRetry={load} />}

        {state === "loading" && <div className="h-[68px] rounded-btn bg-charcoal/5 animate-pulse" />}

        {state === "success" && isActive && code && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-btn bg-ivory-soft px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="font-display font-extrabold text-2xl tracking-[0.25em] text-charcoal">{code.code}</span>
              <StatusBadge status={code.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-charcoal-muted mr-1">
                Expires {new Date(code.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <Button size="sm" variant="secondary" onClick={handleCopy}>
                {copied ? <span className="inline-flex items-center gap-1"><Check size={14} />Copied</span> : "Copy"}
              </Button>
              <Button size="sm" variant="secondary" isLoading={isGenerating} onClick={handleGenerate}>Regenerate</Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmingRevoke(true)}>Revoke</Button>
            </div>
          </div>
        )}

        {state === "success" && !isActive && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-btn bg-ivory-soft px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <p className="text-sm text-charcoal-muted">
                {code ? "That code is no longer valid." : "No active invitation code."}
              </p>
              {code && <StatusBadge status={code.status} />}
            </div>
            <Button size="sm" variant="primary" isLoading={isGenerating} onClick={handleGenerate}>Generate Code</Button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmingRevoke}
        onClose={() => setConfirmingRevoke(false)}
        onConfirm={handleRevoke}
        title="Revoke this invitation code?"
        description="Anyone who hasn't signed up with this code yet won't be able to use it afterward."
        confirmLabel="Revoke"
        isDangerous
        isLoading={isRevoking}
      />
    </div>
  );
}
