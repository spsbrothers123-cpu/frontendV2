import { useCallback, useEffect, useState } from "react";
import { UserCog, Users } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import {
  DataTable,
  ErrorState,
  EmptyState,
  StatusBadge,
  Button,
  Tabs,
  ConfirmModal,
  Textarea,
} from "../components/ui";
import type { Column } from "../components/ui/DataTable";
import { useToast } from "../context/ToastContext";
import * as cashiersApi from "../api/cashiers";
import { CashierEditDrawer } from "../components/cashiers/CashierEditDrawer";
import { InvitationCodeSection } from "../components/cashiers/InvitationCodeSection";
import { activeCashierAtBranch, branchCashierError } from "../components/cashiers/branchCashierRules";
import type { CashierRequest, CashierAccount, CashierUpdateValues } from "../types";

const REQUEST_STATUS_LABEL: Record<CashierRequest["status"], string> = {
  PENDING_ADMIN_APPROVAL: "Pending",
  REJECTED: "Cancelled",
};

export default function Cashiers() {
  const [tab, setTab] = useState<"requests" | "cashiers">("requests");

  return (
    <div>
      <PageHeader title="Cashiers" subtitle="Approve signup requests and manage cashier accounts." />
      <InvitationCodeSection />
      <Tabs
        tabs={[
          { label: "Requests", value: "requests" },
          { label: "Cashiers", value: "cashiers" },
        ]}
        active={tab}
        onChange={(v) => setTab(v as "requests" | "cashiers")}
      />
      <div className="mt-5">{tab === "requests" ? <RequestsSection /> : <CashiersSection />}</div>
    </div>
  );
}

function RequestsSection() {
  const { showToast } = useToast();
  const [items, setItems] = useState<CashierRequest[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [actingId, setActingId] = useState<string | null>(null);
  const [approving, setApproving] = useState<CashierRequest | null>(null);
  const [rejecting, setRejecting] = useState<CashierRequest | null>(null);
  const [reason, setReason] = useState("");
  // Used only to warn that a branch already has its one cashier. Failing to
  // load it is not fatal — the backend still refuses a second cashier.
  const [cashiers, setCashiers] = useState<CashierAccount[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [requests, current] = await Promise.all([
        cashiersApi.fetchCashierRequests(),
        cashiersApi.fetchCashiers().catch(() => [] as CashierAccount[]),
      ]);
      setItems(requests);
      setCashiers(current);
      setState("success");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmApprove() {
    if (!approving) return;
    setActingId(approving.id);
    try {
      await cashiersApi.approveCashierRequest(approving.id);
      showToast("Cashier approved successfully.", "success");
      setApproving(null);
      await load();
    } catch (err) {
      showToast(branchCashierError(err, "Couldn't approve this request. Please try again."), "error");
      setApproving(null);
      await load();
    } finally {
      setActingId(null);
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    setActingId(rejecting.id);
    try {
      await cashiersApi.rejectCashierRequest(rejecting.id, reason.trim() || undefined);
      showToast("Cashier request rejected.", "info");
      setRejecting(null);
      setReason("");
      await load();
    } catch (err) {
      showToast(branchCashierError(err, "Couldn't reject this request. Please try again."), "error");
    } finally {
      setActingId(null);
    }
  }

  const columns: Column<CashierRequest>[] = [
    {
      key: "name",
      header: "Name",
      isPrimary: true,
      render: (r) => (
        <div>
          <p className="font-medium text-charcoal">{r.name}</p>
          <p className="text-xs text-charcoal-muted">{r.email}</p>
        </div>
      ),
    },
    { key: "username", header: "Username", render: (r) => <span className="text-charcoal-muted">{r.username}</span> },
    { key: "shop", header: "Branch", render: (r) => <span>{r.shop?.name ?? "—"}</span> },
    {
      key: "branchName",
      header: "Signup branch name",
      render: (r) => <span className="text-charcoal-muted">{r.branchName || "—"}</span>,
    },
    {
      key: "invitationCodeMasked",
      header: "Invitation Code",
      render: (r) => <span className="text-charcoal-muted font-mono tracking-wide">{r.invitationCodeMasked}</span>,
    },
    {
      key: "signupDate",
      header: "Requested",
      render: (r) => <span className="text-charcoal-muted">{new Date(r.signupDate).toLocaleString("en-IN")}</span>,
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={REQUEST_STATUS_LABEL[r.status]} /> },
  ];

  if (state === "error") {
    return <div className="rounded-card bg-white shadow-soft"><ErrorState message="Couldn't load cashier requests." onRetry={load} /></div>;
  }

  if (state === "success" && items.length === 0) {
    return (
      <div className="rounded-card bg-white shadow-soft">
        <EmptyState icon={<UserCog size={22} />} title="No pending requests" description="New cashier signups will show up here for approval." />
      </div>
    );
  }

  return (
    <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
      <DataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        isLoading={state === "loading"}
        actionsRender={(r) => {
          if (r.status !== "PENDING_ADMIN_APPROVAL") return null;
          const holder = activeCashierAtBranch(cashiers, r.shop?.id, r.id);
          return (
            <div className="flex flex-col items-start gap-1.5">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="primary" disabled={actingId === r.id || !!holder} onClick={() => setApproving(r)}>Approve</Button>
                <Button size="sm" variant="danger" disabled={actingId === r.id} onClick={() => setRejecting(r)}>Reject</Button>
              </div>
              {holder && (
                <p className="text-xs text-charcoal-muted max-w-[16rem]">
                  {r.shop?.name} already has {holder.name}. Suspend them under Cashiers to approve a replacement.
                </p>
              )}
            </div>
          );
        }}
      />

      <ConfirmModal
        isOpen={!!approving}
        onClose={() => setApproving(null)}
        onConfirm={confirmApprove}
        title="Approve this cashier account?"
        description={`${approving?.name ?? "This cashier"} will become the one cashier for ${approving?.shop?.name ?? "this branch"} and can log in once approved. Stock belongs to the branch and is unaffected.`}
        confirmLabel="Approve"
        isLoading={actingId === approving?.id}
      />

      <ConfirmModal
        isOpen={!!rejecting}
        onClose={() => { setRejecting(null); setReason(""); }}
        onConfirm={confirmReject}
        title={`Reject ${rejecting?.name ?? "request"}?`}
        description="This cancels the signup request. The applicant won't be able to log in."
        confirmLabel="Reject request"
        isDangerous
        isLoading={actingId === rejecting?.id}
      />
      {rejecting && <RejectReasonOverlay reason={reason} onChange={setReason} />}
    </div>
  );
}

// ConfirmModal's own shape doesn't take extra body content, so the optional
// reason field is collected via this small floating card layered above it —
// simplest way to add one optional input without forking the shared modal.
function RejectReasonOverlay({ reason, onChange }: { reason: string; onChange: (v: string) => void }) {
  return (
    <div className="fixed inset-0 z-[51] flex items-end sm:items-center justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm mb-[15.5rem] sm:mb-0 sm:mt-[13.5rem] px-4">
        <Textarea
          label="Reason (optional)"
          placeholder="Let the applicant know why…"
          value={reason}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white shadow-lift"
        />
      </div>
    </div>
  );
}

function CashiersSection() {
  const { showToast } = useToast();
  const [items, setItems] = useState<CashierAccount[]>([]);
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<CashierAccount | null>(null);
  const [editing, setEditing] = useState<CashierAccount | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setItems(await cashiersApi.fetchCashiers());
      setState("success");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpdate(values: CashierUpdateValues) {
    if (!editing) return;
    const updated = await cashiersApi.updateCashier(editing.id, values);
    setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    showToast("Cashier updated.", "success");
  }

  async function confirmToggle() {
    if (!confirming) return;
    setActingId(confirming.id);
    try {
      const updated = await cashiersApi.setCashierStatus(confirming.id, !confirming.active);
      setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      showToast(updated.active ? `${updated.name} reactivated.` : `${updated.name} suspended.`, updated.active ? "success" : "info");
      setConfirming(null);
    } catch (err) {
      showToast(branchCashierError(err, "Couldn't update this cashier. Please try again."), "error");
      setConfirming(null);
      await load();
    } finally {
      setActingId(null);
    }
  }

  const columns: Column<CashierAccount>[] = [
    {
      key: "name",
      header: "Name",
      isPrimary: true,
      render: (c) => (
        <div>
          <p className="font-medium text-charcoal">{c.name}</p>
          <p className="text-xs text-charcoal-muted">{c.email}</p>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (c) => <span className="text-charcoal-muted">{c.phone || "—"}</span> },
    { key: "shop", header: "Branch", render: (c) => <span>{c.shop?.name ?? "—"}</span> },
    {
      key: "branchName",
      header: "Signup branch name",
      render: (c) => <span className="text-charcoal-muted">{c.branchName || "—"}</span>,
    },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.active ? "Active" : "Inactive"} /> },
  ];

  if (state === "error") {
    return <div className="rounded-card bg-white shadow-soft"><ErrorState message="Couldn't load cashiers." onRetry={load} /></div>;
  }

  if (state === "success" && items.length === 0) {
    return (
      <div className="rounded-card bg-white shadow-soft">
        <EmptyState icon={<Users size={22} />} title="No cashiers yet" description="Approved cashiers will appear here." />
      </div>
    );
  }

  return (
    <div className="rounded-card bg-white shadow-soft p-4 sm:p-5">
      <DataTable
        columns={columns}
        rows={items}
        rowKey={(c) => c.id}
        isLoading={state === "loading"}
        actionsRender={(c) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>Edit</Button>
            <Button
              size="sm"
              variant={c.active ? "danger" : "secondary"}
              disabled={actingId === c.id}
              onClick={() => setConfirming(c)}
            >
              {c.active ? "Suspend" : "Reactivate"}
            </Button>
          </div>
        )}
      />

      <ConfirmModal
        isOpen={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={confirmToggle}
        title={confirming?.active ? `Suspend ${confirming?.name}?` : `Reactivate ${confirming?.name}?`}
        description={
          confirming?.active
            ? "They'll be signed out immediately and can't log in until reactivated. Their bills, sessions and history are kept, and the branch's stock stays with the branch. The branch can then accept a replacement cashier."
            : "They'll be able to log in again. This only works if the branch has no other cashier."
        }
        confirmLabel={confirming?.active ? "Suspend" : "Reactivate"}
        isDangerous={confirming?.active}
        isLoading={actingId === confirming?.id}
      />

      <CashierEditDrawer
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        onSubmit={handleUpdate}
        cashier={editing}
      />
    </div>
  );
}
