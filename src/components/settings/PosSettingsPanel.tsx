import { useEffect, useState } from "react";
import { Input, Textarea, Select, Switch, Button } from "../ui";
import * as settingsApi from "../../api/settings";
import type { PosSettings } from "../../types";
import { useToast } from "../../context/ToastContext";

export function PosSettingsPanel() {
  const { showToast } = useToast();
  const [values, setValues] = useState<PosSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi.fetchPosSettings().then((v) => { setValues(v); setLoading(false); });
  }, []);

  async function handleSave() {
    if (!values) return;
    setSaving(true);
    try {
      const saved = await settingsApi.savePosSettings(values);
      setValues(saved);
      showToast("POS settings saved.");
    } catch (err: any) {
      showToast(err?.message || "Couldn't save POS settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !values) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-11 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4 max-w-xl">
      <Select
        label="Invoice Format"
        value={values.invoiceFormat}
        onChange={(e) => setValues({ ...values, invoiceFormat: e.target.value as PosSettings["invoiceFormat"] })}
        options={[
          { label: "A4", value: "A4" },
          { label: "Thermal 80mm", value: "Thermal 80mm" },
          { label: "Thermal 58mm", value: "Thermal 58mm" },
        ]}
      />
      <Input label="Printer Name" hint="Optional — leave blank to choose at print time." value={values.printerName} onChange={(e) => setValues({ ...values, printerName: e.target.value })} />
      <Textarea label="Receipt Footer" value={values.receiptFooter} onChange={(e) => setValues({ ...values, receiptFooter: e.target.value })} />
      <Switch label="Auto-print receipt" hint="Print automatically after each sale." checked={values.autoPrintReceipt} onChange={(v) => setValues({ ...values, autoPrintReceipt: v })} />
      <div className="pt-2"><Button onClick={handleSave} isLoading={saving}>Save Changes</Button></div>
    </div>
  );
}
