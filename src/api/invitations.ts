import { apiClient, USE_MOCK } from "./client";
import { delay, store, genId, getEffectiveInvitationCode } from "./mockStore";
import type { InvitationCode } from "../types";

// NOTE for backend integration: invitation codes are shop-scoped — the
// backend must derive the shop from the authenticated admin's session,
// never from anything the client sends, so one admin can never generate
// or revoke a code belonging to another shop.

const CODE_TTL_MINUTES = 30;

function generateSixDigitCode(): string {
  // Mock-only: real generation must happen server-side using a
  // cryptographically secure random source. The frontend must never be
  // trusted to mint the code itself.
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// expects GET /admin/invitation-codes/active
// Returns the shop's current invitation code, or null if none exists.
export async function getActiveInvitationCode(): Promise<InvitationCode | null> {
  if (USE_MOCK) return delay(getEffectiveInvitationCode(), 350);
  const { data } = await apiClient.get<{ data: InvitationCode | null }>("/admin/invitation-codes/active");
  return data.data;
}

// expects POST /admin/invitation-codes
// Invalidates any existing active code and mints a new one.
export async function generateInvitationCode(): Promise<InvitationCode> {
  if (USE_MOCK) {
    const now = new Date();
    const expires = new Date(now.getTime() + CODE_TTL_MINUTES * 60_000);
    const created: InvitationCode = {
      id: genId("inv"),
      code: generateSixDigitCode(),
      status: "ACTIVE",
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    store.invitationCode = created;
    return delay(created, 500);
  }
  const { data } = await apiClient.post<{ data: InvitationCode }>("/admin/invitation-codes");
  return data.data;
}

// expects POST /admin/invitation-codes/:id/revoke
export async function revokeInvitationCode(id: string): Promise<void> {
  if (USE_MOCK) {
    const current = getEffectiveInvitationCode();
    if (current && current.id === id) {
      store.invitationCode = { ...current, status: "REVOKED" };
    }
    return delay(undefined, 350);
  }
  await apiClient.post(`/admin/invitation-codes/${id}/revoke`);
}
