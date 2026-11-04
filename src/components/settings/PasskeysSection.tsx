import { useState } from "react";
import { Fingerprint, Trash2 } from "lucide-react";
import { Button } from "../ui";
import { AddPasskeyModal } from "./AddPasskeyModal";
import { PasswordPromptModal } from "./PasswordPromptModal";
import * as securityApi from "../../api/security";
import { isPasskeySupported } from "../../lib/webauthn";
import { useToast } from "../../context/ToastContext";
import type { PasskeySummary, SecurityStatus } from "../../types/security";

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

interface Props {
  passkeys: SecurityStatus["passkeys"];
  onChanged: () => void;
}

export function PasskeysSection({ passkeys, onChanged }: Props) {
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PasskeySummary | null>(null);

  const supported = isPasskeySupported();
  const atLimit = passkeys.items.length >= passkeys.max;
  const canAdd = passkeys.available && supported && !atLimit;

  let unavailableReason: string | null = null;
  if (!passkeys.available) unavailableReason = "Passkeys aren't available on this server yet. Recovery codes still work.";
  else if (!supported) unavailableReason = "This browser or connection doesn't support passkeys. Try an up-to-date browser over HTTPS.";
  else if (atLimit) unavailableReason = `You've reached the limit of ${passkeys.max} passkeys. Remove one to add another.`;

  async function handleRemove(currentPassword: string) {
    if (!removing) return;
    await securityApi.removePasskey(removing.id, currentPassword);
    showToast(`Removed "${removing.name}".`);
    setRemoving(null);
    onChanged();
  }

  return (
    <section aria-labelledby="passkeys-heading" className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-charcoal-muted"><Fingerprint size={18} /></div>
        <div className="flex-1">
          <h3 id="passkeys-heading" className="text-sm font-semibold text-charcoal">Passkeys</h3>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Verify it's you with Windows Hello or your device's biometrics if you forget your password. You can register more than one. Optional.
          </p>
        </div>
      </div>

      {passkeys.items.length > 0 && (
        <ul className="rounded-btn border border-charcoal/10 bg-white divide-y divide-charcoal/8">
          {passkeys.items.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-charcoal truncate">{p.name}</p>
                <p className="text-xs text-charcoal-muted">
                  Added {fmt(p.createdAt)} · {p.lastUsedAt ? `last used ${fmt(p.lastUsedAt)}` : "never used"} · {p.backedUp ? "synced across devices" : "this device only"}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setRemoving(p)} aria-label={`Remove passkey ${p.name}`}>
                <Trash2 size={15} /> Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)} disabled={!canAdd}>Add a passkey</Button>
        {unavailableReason && <p className="text-xs text-charcoal-muted">{unavailableReason}</p>}
      </div>

      <AddPasskeyModal
        isOpen={adding}
        onClose={() => setAdding(false)}
        onAdded={(p) => {
          setAdding(false);
          showToast(`Passkey "${p.name}" added.`);
          onChanged();
        }}
      />

      <PasswordPromptModal
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove this passkey?"
        description={`"${removing?.name ?? ""}" will no longer be usable to recover your account. You can add it again later.`}
        confirmLabel="Remove"
        isDangerous
        onSubmit={handleRemove}
      />
    </section>
  );
}
