// UPI Management types.
//
// STATUS: shapes below follow the PROPOSED contract in UPI_API_CONTRACT.md.
// They are NOT yet confirmed against BackendV2. Adjust here (and only here +
// api/upiApi.ts) once the contract is finalized.

/** Which account a branch is configured to use. */
export type UpiMode = "COMMON" | "CUSTOM";

/** Where the backend resolved the receiving account from. */
export type UpiEffectiveSource = "SHOP" | "COMMON" | "NONE";

export interface UpiAccount {
  upiId: string;
  payeeName: string;
  enabled: boolean;
}

export interface CommonUpi extends UpiAccount {
  updatedAt?: string;
}

/**
 * Backend-resolved receiver (same resolver the Cashier Portal uses).
 * The frontend only DISPLAYS this; it never re-implements resolution.
 */
export interface UpiEffectiveReceiver {
  source: UpiEffectiveSource;
  upiId: string | null;
  payeeName: string | null;
  reason?: string | null;
}

export interface BranchUpi {
  shopId: string;
  shopName: string;
  shopCode?: string | null;
  location?: string | null;
  mode: UpiMode;
  /**
   * Saved custom account. Retained (dormant) while mode === "COMMON";
   * the backend must never use it for payment generation in that mode.
   */
  custom: UpiAccount | null;
  effective: UpiEffectiveReceiver;
  updatedAt?: string;
}

export interface UpiOverview {
  common: CommonUpi | null;
  branches: BranchUpi[];
}

export interface CommonUpiValues {
  upiId: string;
  payeeName: string;
  enabled: boolean;
}

/** COMMON sends only { mode } so saved custom details stay untouched. */
export type BranchUpiValues =
  | { mode: "COMMON" }
  | { mode: "CUSTOM"; upiId: string; payeeName: string; enabled: boolean };

export type UpiFieldName = "upiId" | "payeeName";
