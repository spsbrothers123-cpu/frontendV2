// Admin Security Settings (recovery codes + passkeys). Mirrors the backend's
// GET /admin/security/status and related responses.

export interface RecoveryCodesStatus {
  configured: boolean;
  /** Unused, unrevoked codes left. */
  remaining: number;
  total: number;
  generatedAt: string | null;
}

export interface PasskeySummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  deviceType: "singleDevice" | "multiDevice" | string;
  backedUp: boolean;
}

export interface SecurityStatus {
  recoveryCodes: RecoveryCodesStatus;
  passkeys: {
    /** False when the server has no WebAuthn relying-party configured. */
    available: boolean;
    max: number;
    items: PasskeySummary[];
  };
  /** True when the Admin has no way to recover their account. */
  noRecoveryMethodConfigured: boolean;
}

export interface GeneratedRecoveryCodes {
  /** Shown to the Admin ONCE. Never persisted client-side. */
  codes: string[];
  total: number;
  regenerated: boolean;
  generatedAt: string;
}

// ── WebAuthn JSON shapes (what the backend sends/receives) ───────────────
export interface PasskeyCreationOptionsJSON {
  challenge: string;
  rp: { id?: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: "public-key"; alg: number }[];
  timeout?: number;
  excludeCredentials?: { id: string; type: "public-key"; transports?: string[] }[];
  authenticatorSelection?: {
    authenticatorAttachment?: string;
    residentKey?: string;
    requireResidentKey?: boolean;
    userVerification?: string;
  };
  attestation?: string;
  extensions?: Record<string, unknown>;
}

export interface PasskeyRegistrationResponseJSON {
  id: string;
  rawId: string;
  type: "public-key";
  response: { clientDataJSON: string; attestationObject: string; transports: string[] };
  clientExtensionResults: Record<string, unknown>;
  authenticatorAttachment?: string;
}

// ── Forgot Password (unauthenticated recovery) ───────────────────────────
export interface PasskeyRequestOptionsJSON {
  challenge: string;
  rpId?: string;
  timeout?: number;
  userVerification?: string;
  allowCredentials?: { id: string; type: "public-key"; transports?: string[] }[];
}

export interface PasskeyAssertionResponseJSON {
  id: string;
  rawId: string;
  type: "public-key";
  response: { clientDataJSON: string; authenticatorData: string; signature: string; userHandle?: string };
  clientExtensionResults: Record<string, unknown>;
  authenticatorAttachment?: string;
}

/** Short-lived, single-use proof that a recovery method was verified. Held in memory only. */
export interface RecoveryGrant {
  grantToken: string;
  expiresAt: string;
}
