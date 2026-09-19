import { apiClient, USE_MOCK } from "./client";
import { delay, store, genId, getEffectiveInvitationCode } from "./mockStore";
import type { InvitationCode } from "../types";

// NOTE for backend integration: invitation codes are shop-scoped, and the
// shop a code belongs to is what a signing-up cashier is permanently
// assigned to. The target shop is passed EXPLICITLY on every call (never
// inferred from the admin's mutable "active shop"), and the backend
// re-verifies this admin owns it (AdminShopLink) before acting — so the
// value sent here is a request, not an authority.

const CODE_TTL_MINUTES = 30;

function generateSixDigitCode(): string {
  // Mock-only: real generation must happen server-side using a
  // cryptographically secure random source. The frontend must never be
  // trusted to mint the code itself.
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// expects GET /admin/invitation-codes/active?shopId=
// Returns that shop's current invitation code, or null if none exists.
export async function getActiveInvitationCode(shopId: string): Promise<InvitationCode | null> {
  if (USE_MOCK) return delay(getEffectiveInvitationCode(), 350);
  const { data } = await apiClient.get<{ data: InvitationCode | null }>("/admin/invitation-codes/active", {
    params: { shopId },
  });
  return data.data;
}

// expects POST /admin/invitation-codes { shopId }
// Invalidates any existing active code for that shop and mints a new one.
export async function generateInvitationCode(shopId: string): Promise<InvitationCode> {
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
  const { data } = await apiClient.post<{ data: InvitationCode }>("/admin/invitation-codes", { shopId });
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
