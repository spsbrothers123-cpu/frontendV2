// Central Admin — Cashier password recovery requests.
// Mirrors the Admin-facing shape of GET /api/admin/cashier-recovery.
// The server NEVER returns a code, a code hash, an IP address or a user agent
// here, so none of those exist in these types.

export type CashierRecoveryStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "COMPLETED";

export type RecoveryListFilter = "active" | "history" | "all";

export interface CashierRecoveryRequest {
  id: string;
  status: CashierRecoveryStatus;
  cashier: {
    id: string;
    name: string;
    /** The registered account identifier the Cashier signs in with. */
    email: string;
    phone: string | null;
    branchName: string | null;
  };
  shop: { id: string; name: string } | null;
  createdAt: string;
  /** Fixed at request time (createdAt + 15 min). Approval never moves it. */
  expiresAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  decidedBy: { id: string; name: string } | null;
}

/** Returned ONCE by approve. Held in component state only; never persisted. */
export interface ApprovedRecovery {
  code: string;
  expiresAt: string;
  request: CashierRecoveryRequest;
}
