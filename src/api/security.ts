import { apiClient } from "./client";
import type {
  GeneratedRecoveryCodes,
  PasskeyCreationOptionsJSON,
  PasskeyRegistrationResponseJSON,
  PasskeySummary,
  SecurityStatus,
} from "../types/security";

// Backend: /api/admin/security/* (ADMIN only). There is deliberately no mock
// path — recovery credentials are only meaningful against the real backend,
// and this app must never pretend a recovery method was set up.
//
// Every sensitive call carries the Admin's CURRENT password, which the
// server verifies on that request ("recent authentication"). The password is
// sent only in the request body and is never stored by the client.

export async function fetchSecurityStatus(): Promise<SecurityStatus> {
  const { data } = await apiClient.get<SecurityStatus>("/admin/security/status");
  return data;
}

/** Generates the first set of 8 codes, or regenerates (invalidating the old set). */
export async function generateRecoveryCodes(currentPassword: string): Promise<GeneratedRecoveryCodes> {
  const { data } = await apiClient.post<GeneratedRecoveryCodes>("/admin/security/recovery-codes", { currentPassword });
  return data;
}

export async function beginPasskeyRegistration(
  currentPassword: string
): Promise<{ challengeId: string; options: PasskeyCreationOptionsJSON }> {
  const { data } = await apiClient.post("/admin/security/passkeys/register/options", { currentPassword });
  return data;
}

export async function finishPasskeyRegistration(input: {
  challengeId: string;
  name?: string;
  response: PasskeyRegistrationResponseJSON;
}): Promise<PasskeySummary> {
  const { data } = await apiClient.post<{ passkey: PasskeySummary }>("/admin/security/passkeys/register/verify", input);
  return data.passkey;
}

export async function removePasskey(id: string, currentPassword: string): Promise<void> {
  await apiClient.post(`/admin/security/passkeys/${encodeURIComponent(id)}/remove`, { currentPassword });
}
