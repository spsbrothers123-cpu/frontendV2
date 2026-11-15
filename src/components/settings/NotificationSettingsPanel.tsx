import { useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button, ErrorState, Skeleton, Switch } from "../ui";
import * as notificationsApi from "../../api/notifications";
import { useToast } from "../../context/ToastContext";
import {
  NOTIFICATION_RETENTION_DAYS,
  categoryDescription,
  categoryLabel,
  errorMessage,
  isCategoryLocked,
} from "../../lib/notifications";
import { KNOWN_NOTIFICATION_CATEGORIES } from "../../types/notifications";
import type { NotificationCategorySetting } from "../../types/notifications";

// Known categories first, in a fixed order; anything extra the backend returns follows.
function sortCategories(list: NotificationCategorySetting[]): NotificationCategorySetting[] {
  const rank = (c: string) => {
    const i = (KNOWN_NOTIFICATION_CATEGORIES as readonly string[]).indexOf(c);
    return i === -1 ? KNOWN_NOTIFICATION_CATEGORIES.length : i;
  };
  return [...list].sort((a, b) => rank(a.category) - rank(b.category));
}

export function NotificationSettingsPanel() {
  const { showToast } = useToast();
  const [saved, setSaved] = useState<NotificationCategorySetting[] | null>(null);
  const [draft, setDraft] = useState<NotificationCategorySetting[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await notificationsApi.fetchNotificationSettings();
      const sorted = sortCategories(res.categories);
      setSaved(sorted);
      setDraft(sorted);
      setState("success");
    } catch (err) {
      setLoadError(errorMessage(err, "Couldn't load notification settings."));
      setState("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dirty = saved !== null && draft.some((d, i) => d.enabled !== saved[i]?.enabled);

  function toggle(category: string, enabled: boolean) {
    if (isCategoryLocked(category)) return;
    setDraft((prev) => prev.map((c) => (c.category === category ? { ...c, enabled } : c)));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      // Security alerts are always sent on, whatever the form state says.
      const payload = draft.map((c) => (isCategoryLocked(c.category) ? { ...c, enabled: true } : c));
      const res = await notificationsApi.saveNotificationSettings({ categories: payload });
      const sorted = sortCategories(res.categories);
      setSaved(sorted);
      setDraft(sorted);
      showToast("Notification settings saved.");
    } catch (err) {
      // The admin's unsaved choices stay on screen so they can retry.
      const msg = errorMessage(err, "Couldn't save notification settings.");
      setSaveError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading") {
    return <div className="space-y-3" role="status" aria-label="Loading notification settings">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }
  if (state === "error") return <ErrorState message={loadError} onRetry={() => void load()} />;

  return (
    <div className="max-w-xl">
      <ul className="divide-y divide-charcoal/6" aria-label="Notification categories">
        {draft.map((c) => {
          const locked = isCategoryLocked(c.category);
          const label = categoryLabel(c.category);
          return (
            <li key={c.category} className="py-3">
              {locked ? (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{label}</p>
                    <p className="text-xs text-charcoal-muted mt-0.5">Critical security alerts can't be turned off.</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-olive bg-olive-soft rounded-full px-2.5 py-1 shrink-0">
                    <Lock size={12} /> Always on
                  </span>
                </div>
              ) : (
                <Switch
                  id={`notif-${c.category}`}
                  label={label}
                  hint={categoryDescription(c.category) || undefined}
                  checked={c.enabled}
                  onChange={(v) => toggle(c.category, v)}
                />
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-charcoal-muted mt-4">Notifications are kept for {NOTIFICATION_RETENTION_DAYS} days, then removed automatically.</p>
      {saveError && <p className="text-sm text-danger mt-3" role="alert">{saveError}</p>}
      <div className="pt-4"><Button onClick={() => void handleSave()} isLoading={saving} disabled={!dirty}>Save Changes</Button></div>
    </div>
  );
}
