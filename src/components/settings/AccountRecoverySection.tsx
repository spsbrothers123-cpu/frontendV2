import { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { RecoveryCodesSection } from "./RecoveryCodesSection";
import { PasskeysSection } from "./PasskeysSection";
import * as securityApi from "../../api/security";
import { SECURITY_STATUS_CHANGED_EVENT } from "../../lib/securityEvents";
import type { SecurityStatus } from "../../types/security";

export function AccountRecoverySection() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await securityApi.fetchSecurityStatus());
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || "Couldn't load account recovery settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleChanged = useCallback(async () => {
    await load();
    window.dispatchEvent(new Event(SECURITY_STATUS_CHANGED_EVENT));
  }, [load]);

  return (
    <div className="pt-5 mt-5 border-t border-charcoal/8 space-y-5">
      <div>
        <h3 className="font-display font-bold text-base text-charcoal">Account recovery</h3>
        <p className="text-sm text-charcoal-muted mt-0.5">
          Set up a way to get back into your Admin account if you forget your password. Both options are optional.
        </p>
      </div>

      {loadError && <p className="text-sm text-danger" role="alert">{loadError}</p>}

      {!status && !loadError && (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-16 bg-charcoal/5 rounded-btn animate-pulse" />)}</div>
      )}

      {status && (
        <>
          {status.noRecoveryMethodConfigured && (
            <div className="flex items-start gap-3 rounded-btn bg-amber-soft px-4 py-3" role="status">
              <ShieldAlert size={18} className="text-amber shrink-0 mt-0.5" />
              <p className="text-sm text-charcoal">
                <strong>No recovery method is set up.</strong> If you forget your password, you won't be able to get back into your account on your own.
                Add a passkey or generate recovery codes below.
              </p>
            </div>
          )}
          <PasskeysSection passkeys={status.passkeys} onChanged={handleChanged} />
          <RecoveryCodesSection status={status.recoveryCodes} onChanged={handleChanged} />
        </>
      )}
    </div>
  );
}
