import { useEffect, useState } from "react";
import { Input, Button } from "../ui";
import * as settingsApi from "../../api/settings";
import type { ShopSettings } from "../../types";
import { useToast } from "../../context/ToastContext";

export function ShopSettingsPanel() {
  const { showToast } = useToast();
  const [values, setValues] = useState<ShopSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi.fetchShopSettings().then((v) => { setValues(v); setLoading(false); });
  }, []);

  async function handleSave() {
    if (!values) return;
    setSaving(true);
    try {
      const saved = await settingsApi.saveShopSettings(values);
      setValues(saved);
      showToast("Shop settings saved.");
    } catch (err: any) {
      showToast(err?.message || "Couldn't save shop settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !values) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-11 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4 max-w-xl">
      <Input label="Shop Name" value={values.shopName} onChange={(e) => setValues({ ...values, shopName: e.target.value })} />
      <Input label="Address" value={values.address} onChange={(e) => setValues({ ...values, address: e.target.value })} />
      <Input label="GSTIN" hint="Leave blank if not registered for GST." value={values.gstin} onChange={(e) => setValues({ ...values, gstin: e.target.value })} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Phone" value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} />
        <Input label="Email" type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
      </div>
      <div className="pt-2"><Button onClick={handleSave} isLoading={saving}>Save Changes</Button></div>
    </div>
  );
}
