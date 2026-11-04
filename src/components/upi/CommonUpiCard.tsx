import { useEffect, useRef, useState } from "react";
import { Button, ConfirmModal, Input, Switch } from "../ui";
import { UpiStatusBadge } from "./UpiBadges";
import { fieldForErrorCode, validateUpiAccount } from "../../lib/upiValidation";
import type { UpiFormErrors } from "../../lib/upiValidation";
import type { CommonUpi, CommonUpiValues } from "../../types/upi";

interface CommonUpiCardProps {
  common: CommonUpi | null;
  /** Branches currently resolving to the Common account (from backend `effective`). */
  affectedBranchCount: number;
  onSave: (values: CommonUpiValues) => Promise<void>;
}

export function CommonUpiCard({ common, affectedBranchCount, onSave }: CommonUpiCardProps) {
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState<UpiFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const savingRef = useRef(false);

  // Re-sync when the saved (backend) values change, e.g. after a save + refetch.
  useEffect(() => {
    setUpiId(common?.upiId ?? "");
    setPayeeName(common?.payeeName ?? "");
    setEnabled(common?.enabled ?? true);
    setErrors({});
    setFormError(null);
  }, [common?.upiId, common?.payeeName, common?.enabled, common?.updatedAt]);

  const dirty = common
    ? upiId.trim() !== common.upiId || payeeName.trim() !== common.payeeName || enabled !== common.enabled
    : upiId.trim() !== "" || payeeName.trim() !== "";

  async function persist() {
    if (savingRef.current) return; // prevent duplicate submissions
    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      await onSave({ upiId: upiId.trim(), payeeName: payeeName.trim(), enabled });
    } catch (err: any) {
      const field = fieldForErrorCode(err?.code);
      const message = err?.message || "Couldn't save the common UPI account. Please try again.";
      if (field) setErrors((prev) => ({ ...prev, [field]: message }));
      else setFormError(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !dirty) return;
    const next = validateUpiAccount({ upiId, payeeName });
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;
    // Disabling the fallback silently removes the receiver for branches relying on it.
    if (common?.enabled && !enabled && affectedBranchCount > 0) {
      setConfirmOpen(true);
      return;
    }
    void persist();
  }

  return (
    <section className="rounded-card bg-white shadow-soft p-4 sm:p-5" aria-labelledby="common-upi-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 id="common-upi-heading" className="font-display font-bold text-lg text-charcoal">Common UPI Account</h2>
          <p className="text-sm text-charcoal-muted mt-0.5 max-w-2xl">
            Default receiving account for branches that use the common account or whose custom account isn’t available.
          </p>
        </div>
        <UpiStatusBadge status={!common ? "not-configured" : common.enabled ? "enabled" : "disabled"} />
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div className="rounded-btn bg-danger-soft text-danger text-sm px-3.5 py-2.5" role="alert">{formError}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Payee / Business name"
            name="common-payee-name"
            required
            value={payeeName}
            error={errors.payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            maxLength={100}
            autoComplete="off"
          />
          <Input
            label="Receiving UPI ID"
            name="common-upi-id"
            required
            value={upiId}
            error={errors.upiId}
            hint="Format check only. It doesn’t confirm the account exists or who owns it."
            onChange={(e) => setUpiId(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>

        <Switch
          id="common-upi-enabled"
          label="Enabled"
          hint="When off, the common account is not used as a fallback."
          checked={enabled}
          onChange={setEnabled}
        />

        <div className="flex justify-end">
          <Button type="submit" isLoading={saving} disabled={!dirty}>Save configuration</Button>
        </div>
      </form>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        onConfirm={() => void persist()}
        title="Disable the common UPI account?"
        description={`${affectedBranchCount} ${affectedBranchCount === 1 ? "branch currently relies" : "branches currently rely"} on it. They will have no receiving account, and the Cashier Portal won’t be able to generate a UPI QR there until one is configured.`}
        confirmLabel="Disable and save"
        isDangerous
        isLoading={saving}
      />
    </section>
  );
}
