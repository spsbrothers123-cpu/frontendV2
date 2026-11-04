import { apiClient } from "./client";
import type { PasskeyAssertionResponseJSON, PasskeyRequestOptionsJSON, RecoveryGrant } from "../types/security";

// Admin Forgot Password — backend: /api/auth/admin/recovery/* (unauthenticated).
//
// Deliberately NO mock path: recovery is only meaningful against the real
// backend, and this app must never pretend a password was reset.
//
// The server answers every verification failure with the same generic error
// (code RECOVERY_VERIFICATION_FAILED) so nothing here can reveal whether an
// email belongs to an Admin or which recovery methods it has.
//
// The grant is returned to the page and kept in React state ONLY — never in the
// URL, localStorage or sessionStorage.

export async function beginPasskeyRecovery(
  email: string
): Promise<{ challengeId: string; options: PasskeyRequestOptionsJSON }> {
  const { data } = await apiClient.post("/auth/admin/recovery/passkey/options", { email });
  return data;
}

export async function finishPasskeyRecovery(input: {
  email: string;
  challengeId: string;
  response: PasskeyAssertionResponseJSON;
}): Promise<RecoveryGrant> {
  const { data } = await apiClient.post<RecoveryGrant>("/auth/admin/recovery/passkey/verify", input);
  return data;
}

export async function verifyRecoveryCode(email: string, code: string): Promise<RecoveryGrant> {
  const { data } = await apiClient.post<RecoveryGrant>("/auth/admin/recovery/code/verify", { email, code });
  return data;
}

/** The account is whatever the grant was issued to — no email is sent here. */
export async function resetPasswordWithGrant(grantToken: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/admin/recovery/reset-password", { grantToken, newPassword });
}
