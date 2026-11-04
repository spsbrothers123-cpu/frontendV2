import { useEffect, useRef, useState } from "react";
import { Drawer, Button, Input, Switch } from "../ui";
import { fieldForErrorCode, validateUpiAccount } from "../../lib/upiValidation";
import type { UpiFormErrors } from "../../lib/upiValidation";
import type { BranchUpi, BranchUpiValues, CommonUpi, UpiMode } from "../../types/upi";

interface BranchUpiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  branch: BranchUpi | null;
  common: CommonUpi | null;
  onSubmit: (shopId: string, values: BranchUpiValues) => Promise<void>;
}

const MODES: { value: UpiMode; label: string; hint: string }[] = [
  { value: "COMMON", label: "Use Common UPI Account", hint: "This branch receives payments on the common account." },
  { value: "CUSTOM", label: "Use Custom UPI Account", hint: "This branch receives payments on its own account." },
];

export function BranchUpiDrawer({ isOpen, onClose, branch, common, onSubmit }: BranchUpiDrawerProps) {
  const [mode, setMode] = useState<UpiMode>("COMMON");
  // Custom values live in state even while mode is COMMON, so toggling back
  // restores what was saved (dormant details). They are only sent in CUSTOM mode.
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState<UpiFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (isOpen && branch) {
      setMode(branch.mode);
      setUpiId(branch.custom?.upiId ?? "");
      setPayeeName(branch.custom?.payeeName ?? "");
      setEnabled(branch.custom?.enabled ?? true);
      setErrors({});
      setFormError(null);
    }
  }, [isOpen, branch]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!branch || savingRef.current) return; // prevent duplicate submissions
    setFormError(null);

    let values: BranchUpiValues;
    if (mode === "COMMON") {
      values = { mode: "COMMON" };
      setErrors({});
    } else {
      const next = validateUpiAccount({ upiId, payeeName });
      setErrors(next);
      if (Object.keys(next).length > 0) return;
      values = { mode: "CUSTOM", upiId: upiId.trim(), payeeName: payeeName.trim(), enabled };
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await onSubmit(branch.shopId, values);
      onClose();
    } catch (err: any) {
      // Keep the drawer open so the admin can correct and retry.
      const field = fieldForErrorCode(err?.code);
      const message = err?.message || "Couldn't save this branch's UPI configuration. Please try again.";
      if (field && mode === "CUSTOM") setErrors((prev) => ({ ...prev, [field]: message }));
      else setFormError(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const commonSummary = !common
    ? "No common UPI account is configured, so this branch will have no receiving account."
    : !common.enabled
      ? "The common UPI account is currently disabled, so this branch would have no receiving account."
      : `Common account: ${common.payeeName} · ${common.upiId}`;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      title="Branch UPI Account"
      subtitle={branch ? branch.shopName : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} isLoading={saving}>Save</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && (
          <div className="rounded-btn bg-danger-soft text-danger text-sm px-3.5 py-2.5" role="alert">{formError}</div>
        )}

        <fieldset className="space-y-2.5" disabled={saving}>
          <legend className="text-sm font-medium text-charcoal mb-2">Payment account</legend>
          {MODES.map((m) => (
            <label
              key={m.value}
              className={`flex items-start gap-3 rounded-btn border px-3.5 py-3 cursor-pointer transition-colors duration-150 ${
                mode === m.value ? "border-yolk-500 bg-yolk-50" : "border-charcoal/12 bg-white hover:bg-ivory-soft"
              }`}
            >
              <input
                type="radio"
                name="upi-mode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
                className="mt-1 accent-yolk-500"
              />
              <span>
                <span className="block text-sm font-medium text-charcoal">{m.label}</span>
                <span className="block text-xs text-charcoal-muted mt-0.5">{m.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {mode === "COMMON" ? (
          <div className="rounded-btn bg-ivory-soft px-3.5 py-3 text-sm text-charcoal space-y-1.5">
            <p className="break-words">{commonSummary}</p>
            {branch?.custom && (
              <p className="text-xs text-charcoal-muted">
                Saved custom details are kept but not used while this branch is on the common account.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Payee name"
              name="branch-payee-name"
              required
              value={payeeName}
              error={errors.payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              maxLength={100}
              autoComplete="off"
            />
            <Input
              label="Receiving UPI ID"
              name="branch-upi-id"
              required
              value={upiId}
              error={errors.upiId}
              hint="Format check only. It doesn’t confirm the account exists or who owns it."
              onChange={(e) => setUpiId(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <Switch
              id="branch-upi-enabled"
              label="Enabled"
              hint="A disabled custom account isn’t used. The branch falls back to the common account if it’s enabled."
              checked={enabled}
              onChange={setEnabled}
            />
          </div>
        )}
      </form>
    </Drawer>
  );
}
