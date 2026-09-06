import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, LayoutGrid, List } from "lucide-react";
import * as settingsApi from "../../api/settings";
import type { AppearanceSettings, ThemePreference, ProductDisplayMode } from "../../types";
import { useToast } from "../../context/ToastContext";

const themeOptions: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <Sun size={16} /> },
  { value: "dark", label: "Dark", icon: <Moon size={16} /> },
  { value: "system", label: "System", icon: <Monitor size={16} /> },
];

const displayOptions: { value: ProductDisplayMode; label: string; icon: React.ReactNode }[] = [
  { value: "grid", label: "Grid", icon: <LayoutGrid size={16} /> },
  { value: "list", label: "List", icon: <List size={16} /> },
];

export function AppearanceSettingsPanel() {
  const { showToast } = useToast();
  const [values, setValues] = useState<AppearanceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi.fetchAppearanceSettings().then((v) => { setValues(v); setLoading(false); });
  }, []);

  async function persist(next: AppearanceSettings) {
    setValues(next);
    setSaving(true);
    try {
      await settingsApi.saveAppearanceSettings(next);
      showToast("Appearance updated.");
    } catch (err: any) {
      showToast(err?.message || "Couldn't save appearance settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !values) {
    return <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <p className="text-sm font-medium text-charcoal mb-2">Theme</p>
        <div className="flex gap-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => persist({ ...values, theme: opt.value })}
              className={`flex-1 flex flex-col items-center gap-1.5 rounded-btn border py-3 text-sm font-medium transition-colors duration-150 ${
                values.theme === opt.value ? "border-yolk-500 bg-yolk-100 text-charcoal" : "border-charcoal/12 text-charcoal-muted hover:bg-charcoal/5"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-charcoal mb-2">Product Display</p>
        <div className="flex gap-2">
          {displayOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => persist({ ...values, productDisplay: opt.value })}
              className={`flex-1 flex flex-col items-center gap-1.5 rounded-btn border py-3 text-sm font-medium transition-colors duration-150 ${
                values.productDisplay === opt.value ? "border-yolk-500 bg-yolk-100 text-charcoal" : "border-charcoal/12 text-charcoal-muted hover:bg-charcoal/5"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {saving && <p className="text-xs text-charcoal-muted">Saving…</p>}
    </div>
  );
}
