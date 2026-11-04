import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, X } from "lucide-react";
import * as securityApi from "../../api/security";
import { SECURITY_STATUS_CHANGED_EVENT } from "../../lib/securityEvents";

const DISMISS_KEY = "eggmart_admin_recovery_banner_dismissed";

/**
 * Non-blocking nudge shown while the Admin has neither a passkey nor recovery
 * codes. It never prevents anything: it can be dismissed for the session and
 * fails silently if the status can't be loaded.
 */
export function RecoveryWarningBanner() {
  const [show, setShow] = useState(false);

  const check = useCallback(async () => {
    try {
      const status = await securityApi.fetchSecurityStatus();
      setShow(status.noRecoveryMethodConfigured);
    } catch {
      setShow(false);
    }
  }, []);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { /* storage unavailable */ }
    if (!dismissed) void check();
    window.addEventListener(SECURITY_STATUS_CHANGED_EVENT, check);
    return () => window.removeEventListener(SECURITY_STATUS_CHANGED_EVENT, check);
  }, [check]);

  if (!show) return null;

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* storage unavailable */ }
    setShow(false);
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-btn bg-amber-soft px-4 py-3" role="status">
      <ShieldAlert size={18} className="text-amber shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-charcoal">
        <strong>Set up account recovery.</strong> You have no passkey or recovery codes, so a forgotten password can't be recovered.{" "}
        <Link to="/admin/settings" state={{ category: "security" }} className="font-semibold underline underline-offset-2">Set it up</Link>
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-charcoal-muted hover:text-charcoal">
        <X size={16} />
      </button>
    </div>
  );
}
