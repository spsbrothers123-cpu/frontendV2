import { useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, KeyRound, TriangleAlert } from "lucide-react";
import { Button } from "../ui";
import { PasswordPromptModal } from "./PasswordPromptModal";
import * as securityApi from "../../api/security";
import { downloadBlob } from "../../lib/download";
import { useToast } from "../../context/ToastContext";
import type { GeneratedRecoveryCodes, RecoveryCodesStatus } from "../../types/security";

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
}

/** Plain-text file the Admin can print or store in a password manager. */
function buildCodesFile(codes: string[], generatedAt: string): Blob {
  const lines = [
    "Egg Mart — Admin emergency recovery codes",
    `Generated: ${new Date(generatedAt).toLocaleString()}`,
    "",
    "Each code can be used ONCE to recover your Admin account if you forget your password.",
    "Anyone who has these codes can reset your password — keep them private and offline.",
    "Generating a new set invalidates every code below.",
    "",
    ...codes.map((c, i) => `${String(i + 1).padStart(2, " ")}. ${c}`),
    "",
  ];
  return new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
}

interface Props {
  status: RecoveryCodesStatus;
  onChanged: () => void;
}

export function RecoveryCodesSection({ status, onChanged }: Props) {
  const { showToast } = useToast();
  const [promptOpen, setPromptOpen] = useState(false);
  // The raw codes exist ONLY in this state, only until the Admin confirms they
  // saved them. They are never written to storage and are dropped on close.
  const [generated, setGenerated] = useState<GeneratedRecoveryCodes | null>(null);
  const [saved, setSaved] = useState(false);

  const hasExisting = status.generatedAt !== null;
  const low = status.configured && status.remaining <= 2;

  async function handleGenerate(currentPassword: string) {
    const result = await securityApi.generateRecoveryCodes(currentPassword);
    setGenerated(result);
    setSaved(false);
    setPromptOpen(false);
    onChanged();
  }

  async function copyAll() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.codes.join("\n"));
      showToast("Recovery codes copied.");
    } catch {
      showToast("Couldn't copy automatically — use Download instead.", "error");
    }
  }

  function download() {
    if (!generated) return;
    const day = new Date(generated.generatedAt).toISOString().slice(0, 10);
    downloadBlob(buildCodesFile(generated.codes, generated.generatedAt), {}, `eggmart-recovery-codes-${day}.txt`);
  }

  return (
    <section aria-labelledby="recovery-codes-heading" className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-charcoal-muted"><KeyRound size={18} /></div>
        <div className="flex-1">
          <h3 id="recovery-codes-heading" className="text-sm font-semibold text-charcoal">Emergency recovery codes</h3>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Eight one-time codes you can use to recover your Admin account if you forget your password. Optional.
          </p>
        </div>
      </div>

      <div className="rounded-btn border border-charcoal/10 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          {status.configured ? (
            <>
              <span className="font-medium text-charcoal">{status.remaining} of {status.total} codes unused</span>
              {formatDate(status.generatedAt) && <span className="text-charcoal-muted"> · generated {formatDate(status.generatedAt)}</span>}
              {low && <p className="text-xs text-amber mt-0.5">You're running low — consider generating a new set.</p>}
            </>
          ) : hasExisting ? (
            <span className="font-medium text-charcoal">No unused codes left</span>
          ) : (
            <span className="text-charcoal-muted">Not set up</span>
          )}
        </div>
        <Button size="sm" variant="secondary" onClick={() => setPromptOpen(true)}>
          {hasExisting ? "Regenerate codes" : "Generate codes"}
        </Button>
      </div>

      <PasswordPromptModal
        isOpen={promptOpen}
        onClose={() => setPromptOpen(false)}
        title={hasExisting ? "Regenerate recovery codes?" : "Generate recovery codes"}
        description={
          hasExisting
            ? "This creates a new set of eight codes and permanently invalidates every existing code, including unused ones."
            : "This creates eight one-time codes. They are shown once, so be ready to save them."
        }
        confirmLabel={hasExisting ? "Regenerate" : "Generate"}
        isDangerous={hasExisting}
        onSubmit={handleGenerate}
      />

      {generated &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Your recovery codes">
            {/* Deliberately NOT dismissible by backdrop/Escape: the codes can't be shown again. */}
            <div className="absolute inset-0 bg-charcoal/50" aria-hidden="true" />
            <div className="relative w-full max-w-md bg-ivory-card rounded-card shadow-lift p-6 space-y-4">
              <div>
                <h3 className="font-display font-bold text-lg text-charcoal">Save your recovery codes</h3>
                <p className="text-sm text-charcoal-muted mt-1">
                  {generated.regenerated ? "Your previous codes no longer work. " : ""}
                  Each code works once. <strong className="text-charcoal">This is the only time they are shown.</strong>
                </p>
              </div>

              <ol className="grid grid-cols-1 xs:grid-cols-2 gap-2" aria-label="Recovery codes">
                {generated.codes.map((code, i) => (
                  <li key={code} className="rounded-btn bg-white border border-charcoal/10 px-3 py-2 font-mono text-[13px] tracking-wide text-charcoal select-all">
                    <span className="text-charcoal-muted mr-2 select-none">{i + 1}.</span>{code}
                  </li>
                ))}
              </ol>

              <div className="flex items-start gap-2 rounded-btn bg-amber-soft px-3 py-2.5 text-xs text-charcoal">
                <TriangleAlert size={15} className="text-amber shrink-0 mt-0.5" />
                <span>Anyone with these codes can reset your Admin password. Store them offline or in a password manager — not in a shared chat or email.</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={copyAll}><Copy size={15} /> Copy</Button>
                <Button size="sm" variant="secondary" onClick={download}><Download size={15} /> Download</Button>
              </div>

              <label className="flex items-start gap-2.5 text-sm text-charcoal cursor-pointer">
                <input type="checkbox" className="mt-1" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
                I've saved these codes somewhere safe.
              </label>

              <div className="flex justify-end">
                <Button size="sm" disabled={!saved} onClick={() => setGenerated(null)}>Done</Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
