import { Store } from "lucide-react";
import { Button, DataTable, EmptyState } from "../ui";
import type { Column } from "../ui/DataTable";
import { ReceiverSourceBadge, UpiStatusBadge } from "./UpiBadges";
import type { UpiAccountStatus } from "./UpiBadges";
import type { BranchUpi, CommonUpi } from "../../types/upi";

// Status of the account the branch is *configured* to use (presentation of
// stored state). Which account is actually used comes from `effective`.
function accountStatus(branch: BranchUpi, common: CommonUpi | null): UpiAccountStatus {
  if (branch.mode === "CUSTOM") {
    if (!branch.custom) return "not-configured";
    return branch.custom.enabled ? "enabled" : "disabled";
  }
  if (!common) return "not-configured";
  return common.enabled ? "enabled" : "disabled";
}

function accountLabel(branch: BranchUpi): string {
  if (branch.mode === "COMMON") return "Common UPI";
  return branch.custom ? "Custom UPI" : "Custom UPI (not set up)";
}

function EffectiveReceiverCell({ branch }: { branch: BranchUpi }) {
  const { effective, mode } = branch;
  if (effective.source === "NONE") {
    return (
      <div className="space-y-1">
        <ReceiverSourceBadge source="NONE" />
        <p className="text-xs text-charcoal-muted">Cashier can’t generate a UPI QR.</p>
      </div>
    );
  }
  const fellBack = mode === "CUSTOM" && effective.source === "COMMON";
  return (
    <div className="space-y-1 min-w-0">
      <ReceiverSourceBadge source={effective.source} />
      <p className="text-sm text-charcoal break-all">
        {effective.payeeName ? `${effective.payeeName} · ` : ""}
        <span className="font-mono text-[13px]">{effective.upiId}</span>
      </p>
      {fellBack && <p className="text-xs text-charcoal-muted">Custom account isn’t available, so the common account is used.</p>}
    </div>
  );
}

interface BranchUpiTableProps {
  branches: BranchUpi[];
  common: CommonUpi | null;
  onEdit: (branch: BranchUpi) => void;
}

export function BranchUpiTable({ branches, common, onEdit }: BranchUpiTableProps) {
  const columns: Column<BranchUpi>[] = [
    {
      key: "branch",
      header: "Branch",
      isPrimary: true,
      render: (b) => (
        <div>
          <p className="font-medium text-charcoal">{b.shopName}</p>
          {(b.shopCode || b.location) && (
            <p className="text-xs text-charcoal-muted">{[b.shopCode, b.location].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      ),
    },
    { key: "account", header: "Payment Account", render: (b) => <span className="text-charcoal">{accountLabel(b)}</span> },
    { key: "status", header: "Status", render: (b) => <UpiStatusBadge status={accountStatus(b, common)} /> },
    { key: "effective", header: "Effective Receiver", render: (b) => <EffectiveReceiverCell branch={b} /> },
  ];

  if (branches.length === 0) {
    return (
      <EmptyState
        icon={<Store size={22} />}
        title="No branches found"
        description="Branches linked to your admin account will appear here."
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      rows={branches}
      rowKey={(b) => b.shopId}
      actionsRender={(b) => (
        <Button size="sm" variant="secondary" onClick={() => onEdit(b)} aria-label={`Edit UPI configuration for ${b.shopName}`}>
          Edit
        </Button>
      )}
    />
  );
}
