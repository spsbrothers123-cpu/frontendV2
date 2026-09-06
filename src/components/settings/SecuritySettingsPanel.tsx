import { useEffect, useState } from "react";
import { Input, Switch, Button, ConfirmModal } from "../ui";
import * as settingsApi from "../../api/settings";
import type { SecuritySettings } from "../../types";
import { useToast } from "../../context/ToastContext";

export function SecuritySettingsPanel() {
  const { showToast } = useToast();
  const [values, setValues] = useState<SecuritySettings | null>(null);
  const [pendingValues, setPendingValues] = useState<SecuritySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    settingsApi.fetchSecuritySettings().then((v) => { setValues(v); setLoading(false); });
  }, []);

  async function commit(next: SecuritySettings) {
    setSaving(true);
    try {
      const saved = await settingsApi.saveSecuritySettings(next);
      setValues(saved);
      showToast("Security settings saved.");
    } catch (err: any) {
      showToast(err?.message || "Couldn't save security settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  // Turning off refund confirmation is a sensitive change — require
  // an explicit confirmation before it takes effect.
  function handleRefundConfirmationChange(checked: boolean) {
    if (!values) return;
    if (checked) {
      commit({ ...values, requireConfirmationForRefunds: true });
      return;
    }
    setPendingValues({ ...values, requireConfirmationForRefunds: false });
    setConfirming(true);
  }

  if (loading || !values) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4 max-w-xl">
      <Input
        label="Session Timeout (minutes)"
        type="number"
        min={5}
        value={values.sessionTimeoutMinutes}
        onChange={(e) => setValues({ ...values, sessionTimeoutMinutes: Number(e.target.value) })}
      />
      <div className="pt-1"><Button size="sm" variant="secondary" onClick={() => commit(values)} isLoading={saving}>Save Timeout</Button></div>

      <div className="pt-4 border-t border-charcoal/8">
        <Switch
          label="Require confirmation for refunds"
          hint="Cashiers must confirm before a refund is processed."
          checked={values.requireConfirmationForRefunds}
          onChange={handleRefundConfirmationChange}
        />
      </div>

      <ConfirmModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => { if (pendingValues) commit(pendingValues); setConfirming(false); }}
        title="Turn off refund confirmation?"
        description="Cashiers will be able to process refunds without an extra confirmation step. This can make accidental refunds more likely."
        confirmLabel="Turn Off"
        isDangerous
      />
    </div>
  );
}
