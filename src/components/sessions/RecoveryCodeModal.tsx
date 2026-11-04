import { useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "../ui";
import type { ApprovedRecovery } from "../../types/cashierRecovery";
import { formatRemaining, useNow } from "./recoveryTime";

interface Props {
  issued: ApprovedRecovery;
  onClose: () => void;
}

/**
 * Shows the one-time recovery code to the Admin.
 *
 * - Hidden until the Admin chooses to reveal it (so it isn't on screen while
 *   walking over to the cashier or if someone else is looking).
 * - There is deliberately NO copy button, link or share action: the code is
 *   read out / shown in person only, and never touches the clipboard, URL,
 *   storage or logs.
 * - It exists only in this component's props/state. The parent mounts this
 *   component only while a code is outstanding; closing discards it, and the
 *   server will never show it again.
 * - Backdrop click and Escape do NOT close it, so it can't be lost by accident.
 */
export function RecoveryCodeModal({ issued, onClose }: Props) {
  const [revealed, setRevealed] = useState(false);
  const now = useNow(1000);
  const remaining = formatRemaining(issued.expiresAt, now);
  const groups = issued.code.split("-");

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label="Recovery code">
      <div className="absolute inset-0 bg-charcoal/50" aria-hidden="true" />
      <div className="relative w-full max-w-md bg-ivory-card rounded-card shadow-lift p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-olive-soft text-olive flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-charcoal">Recovery code for {issued.request.cashier.name}</h3>
            <p className="text-sm text-charcoal-muted">{issued.request.cashier.email}</p>
          </div>
        </div>

        <div className="rounded-btn border border-charcoal/12 bg-white px-4 py-4">
          {revealed ? (
            <p className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-lg font-bold text-charcoal tracking-wider select-all" aria-label="Recovery code">
              {groups.map((g, i) => (
                <span key={i}>{g}</span>
              ))}
            </p>
          ) : (
            <p className="font-mono text-lg font-bold text-charcoal/40 tracking-wider" aria-label="Recovery code hidden">
              •••• •••• •••• •••• •••• •••• •••• ••••
            </p>
          )}
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal hover:text-yolk-700 transition-colors"
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
            {revealed ? "Hide code" : "Show code"}
          </button>
        </div>

        <ul className="text-sm text-charcoal-muted space-y-1.5 list-disc pl-5">
          <li>This code is shown <strong className="text-charcoal">once</strong>. It cannot be viewed again.</li>
          <li>Give it to the verified cashier <strong className="text-charcoal">in person</strong>. Don't send it by message.</li>
          <li>
            It works for one password reset only.{" "}
            {remaining ? (
              <>The request expires in <strong className="text-charcoal">{remaining}</strong>.</>
            ) : (
              <strong className="text-danger">The request has expired — the cashier must submit a new one.</strong>
            )}
          </li>
          <li>If the code is lost, reject the request from the list and ask the cashier to submit a new one.</li>
        </ul>

        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={onClose}>I've given the code to the cashier</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
