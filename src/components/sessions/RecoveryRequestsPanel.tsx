import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, Lock } from "lucide-react";
import { Button, ConfirmModal, DataTable, EmptyState, ErrorState, FilterBar, StatusBadge, Tabs } from "../ui";
import type { Column } from "../ui/DataTable";
import { useToast } from "../../context/ToastContext";
import type { ApiError } from "../../api/client";
import * as recoveryApi from "../../api/cashierRecovery";
import type { ApprovedRecovery, CashierRecoveryRequest, RecoveryListFilter } from "../../types/cashierRecovery";
import { ApproveRecoveryModal } from "./ApproveRecoveryModal";
import { RecoveryCodeModal } from "./RecoveryCodeModal";
import { formatDateTime, formatRemaining, useNow } from "./recoveryTime";

const FILTERS: { label: string; value: RecoveryListFilter }[] = [
  { label: "Active", value: "active" },
  { label: "History", value: "history" },
  { label: "All", value: "all" },
];

const POLL_MS = 20_000;

// Request errors that mean "this request moved on" — refresh instead of retrying.
const STALE_CODES = new Set([
  "RECOVERY_REQUEST_EXPIRED",
  "RECOVERY_REQUEST_NOT_ACTIONABLE",
  "RECOVERY_REQUEST_NOT_FOUND",
  "RECOVERY_ACCOUNT_NOT_ACTIVE",
]);

type LoadState = "loading" | "success" | "error" | "forbidden" | "unconfigured";

/**
 * Admin → Sessions → Recovery Requests.
 *
 * Lists Cashier recovery requests from EVERY shop. It sends no shopId and does
 * not read the shop selector, so switching shops changes nothing here. The
 * server decides who may use it (only the one Central Admin); this component
 * just reflects a refusal.
 *
 * Mounted only while its tab is open, so a non-central Admin who never opens
 * the tab never touches these endpoints.
 */
export function RecoveryRequestsPanel() {
  const { showToast } = useToast();
  const now = useNow(1000);

  const [filter, setFilter] = useState<RecoveryListFilter>("active");
  const [items, setItems] = useState<CashierRecoveryRequest[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [approving, setApproving] = useState<CashierRecoveryRequest | null>(null);
  const [issued, setIssued] = useState<ApprovedRecovery | null>(null);
  const [rejecting, setRejecting] = useState<CashierRecoveryRequest | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  // Guards against an older, slower response overwriting a newer one.
  const loadSeq = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const seq = ++loadSeq.current;
      if (!silent) setState("loading");
      try {
        const rows = await recoveryApi.fetchRecoveryRequests(filter);
        if (seq !== loadSeq.current) return;
        setItems(rows);
        setState("success");
      } catch (err) {
        if (seq !== loadSeq.current) return;
        const e = err as ApiError;
        if (e.status === 403) setState("forbidden");
        else if (e.status === 503) setState("unconfigured");
        else if (!silent) setState("error");
        // A failed background refresh keeps the last good list on screen.
      }
    },
    [filter]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Keep the active list fresh while the tab is visible.
  useEffect(() => {
    if (filter === "history" || state === "forbidden" || state === "unconfigured") return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [filter, state, load]);

  /** Handles errors common to approve/reject. Returns true if it fully handled it. */
  function handleTerminalError(err: ApiError): boolean {
    if (err.status === 403 && err.code === "CENTRAL_ADMIN_REQUIRED") {
      setApproving(null);
      setRejecting(null);
      setState("forbidden");
      return true;
    }
    if (err.status === 503) {
      setApproving(null);
      setRejecting(null);
      setState("unconfigured");
      return true;
    }
    if (err.code && STALE_CODES.has(err.code)) {
      setApproving(null);
      setRejecting(null);
      showToast(err.message, "error");
      load(true);
      return true;
    }
    return false;
  }

  async function handleApprove(password: string) {
    if (!approving) return;
    try {
      const result = await recoveryApi.approveRecoveryRequest(approving.id, password);
      setApproving(null);
      setIssued(result);
      load(true);
    } catch (err) {
      // Wrong password / throttling / validation: rethrow so the modal shows it inline.
      if (handleTerminalError(err as ApiError)) return;
      throw err;
    }
  }

  async function handleReject() {
    if (!rejecting) return;
    setRejectBusy(true);
    try {
      await recoveryApi.rejectRecoveryRequest(rejecting.id);
      showToast(rejecting.status === "APPROVED" ? "Recovery code revoked." : "Recovery request rejected.", "success");
      setRejecting(null);
      load(true);
    } catch (err) {
      if (!handleTerminalError(err as ApiError)) {
        showToast((err as ApiError).message || "Couldn't reject the request.", "error");
      }
    } finally {
      setRejectBusy(false);
    }
  }

  const columns: Column<CashierRecoveryRequest>[] = [
    {
      key: "cashier",
      header: "Cashier",
      isPrimary: true,
      render: (r) => <span className="font-medium text-charcoal">{r.cashier.name}</span>,
    },
    {
      key: "account",
      header: "Account",
      render: (r) => <span className="text-charcoal-muted break-all">{r.cashier.email}</span>,
    },
    {
      key: "shop",
      header: "Shop / Branch",
      render: (r) => (
        <span className="text-charcoal">
          {r.shop?.name ?? "—"}
          {r.cashier.branchName ? <span className="text-charcoal-muted"> · {r.cashier.branchName}</span> : null}
        </span>
      ),
    },
    {
      key: "requested",
      header: "Requested",
      render: (r) => <span className="text-charcoal-muted">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: "expires",
      header: "Expires",
      render: (r) => {
        const live = r.status === "PENDING" || r.status === "APPROVED";
        const remaining = live ? formatRemaining(r.expiresAt, now) : null;
        return (
          <span className="text-charcoal-muted">
            {formatDateTime(r.expiresAt)}
            {live && (
              <span className={`block text-xs font-semibold ${remaining ? "text-amber" : "text-danger"}`}>
                {remaining ? `${remaining} left` : "Expired"}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const lapsed = (r.status === "PENDING" || r.status === "APPROVED") && formatRemaining(r.expiresAt, now) === null;
        return <StatusBadge status={lapsed ? "Expired" : labelFor(r.status)} />;
      },
    },
  ];

  function actions(r: CashierRecoveryRequest) {
    const live = (r.status === "PENDING" || r.status === "APPROVED") && formatRemaining(r.expiresAt, now) !== null;
    if (!live) return <span className="text-charcoal-muted">—</span>;
    if (r.status === "PENDING") {
      return (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" onClick={() => setApproving(r)}>Approve</Button>
          <Button size="sm" variant="secondary" onClick={() => setRejecting(r)}>Reject</Button>
        </div>
      );
    }
    // APPROVED: the code has already been issued — it can only be revoked.
    return (
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => setRejecting(r)}>Revoke code</Button>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
      <p className="text-sm text-charcoal-muted mb-4">
        Cashier password-recovery requests from every shop. Verify the cashier in person before approving, then hand them the one-time code.
        Requests expire 15 minutes after they are submitted.
      </p>

      {state !== "forbidden" && state !== "unconfigured" && (
        <FilterBar>
          <Tabs tabs={FILTERS} active={filter} onChange={(v) => setFilter(v as RecoveryListFilter)} />
        </FilterBar>
      )}

      <div className="mt-4">
        {state === "forbidden" && (
          <EmptyState
            icon={<Lock size={22} />}
            title="Central administrator only"
            description="Only the central administrator can view and approve cashier recovery requests."
          />
        )}
        {state === "unconfigured" && (
          <EmptyState
            icon={<Lock size={22} />}
            title="Recovery isn't set up on this server yet"
            description="The server needs its central administrator and recovery settings configured before requests can be managed."
          />
        )}
        {state === "error" && <ErrorState message="Couldn't load recovery requests." onRetry={() => load()} />}
        {state === "success" && items.length === 0 && (
          <EmptyState
            icon={<KeyRound size={22} />}
            title={filter === "active" ? "No active recovery requests" : "No recovery requests"}
            description={filter === "active" ? "When a cashier taps Forgot Password, their request appears here." : "Nothing to show for this filter yet."}
          />
        )}
        {(state === "loading" || (state === "success" && items.length > 0)) && (
          <DataTable columns={columns} rows={items} rowKey={(r) => r.id} isLoading={state === "loading"} actionsRender={actions} />
        )}
      </div>

      {approving && <ApproveRecoveryModal key={approving.id} request={approving} onClose={() => setApproving(null)} onApprove={handleApprove} />}
      {issued && <RecoveryCodeModal issued={issued} onClose={() => setIssued(null)} />}
      <ConfirmModal
        isOpen={rejecting !== null}
        onClose={() => (rejectBusy ? undefined : setRejecting(null))}
        onConfirm={handleReject}
        isLoading={rejectBusy}
        isDangerous
        title={rejecting?.status === "APPROVED" ? "Revoke recovery code?" : "Reject recovery request?"}
        description={
          rejecting?.status === "APPROVED"
            ? `The code issued to ${rejecting.cashier.name} will stop working. They'll need to submit a new request.`
            : `${rejecting?.cashier.name ?? "The cashier"} won't be able to reset their password with this request. They can submit a new one.`
        }
        confirmLabel={rejecting?.status === "APPROVED" ? "Revoke code" : "Reject request"}
      />
    </div>
  );
}

function labelFor(status: CashierRecoveryRequest["status"]): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
