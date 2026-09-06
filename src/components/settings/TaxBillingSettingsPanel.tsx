import { useEffect, useState } from "react";
import { Input, Textarea, Button, Switch } from "../ui";
import * as settingsApi from "../../api/settings";
import type { TaxBillingSettings } from "../../types";
import { useToast } from "../../context/ToastContext";

export function TaxBillingSettingsPanel() {
  const { showToast } = useToast();
  const [values, setValues] = useState<TaxBillingSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi.fetchTaxSettings().then((v) => { setValues(v); setLoading(false); });
  }, []);

  async function handleSave() {
    if (!values) return;
    setSaving(true);
    try {
      const saved = await settingsApi.saveTaxSettings(values);
      setValues(saved);
      showToast("Tax & billing settings saved.");
    } catch (err: any) {
      showToast(err?.message || "Couldn't save settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !values) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4 max-w-xl">
      <Switch label="Enable GST" hint="Apply GST to bills and invoices." checked={values.gstEnabled} onChange={(v) => setValues({ ...values, gstEnabled: v })} />
      {values.gstEnabled && (
        <Input
          label="GST Percentage"
          type="number"
          min={0}
          max={28}
          value={values.gstPercentage}
          onChange={(e) => setValues({ ...values, gstPercentage: Number(e.target.value) })}
        />
      )}
      <Input label="Invoice Prefix" value={values.invoicePrefix} onChange={(e) => setValues({ ...values, invoicePrefix: e.target.value })} />
      <Textarea label="Invoice Footer Note" value={values.invoiceFooterNote} onChange={(e) => setValues({ ...values, invoiceFooterNote: e.target.value })} />
      <div className="pt-2"><Button onClick={handleSave} isLoading={saving}>Save Changes</Button></div>
    </div>
  );
}
