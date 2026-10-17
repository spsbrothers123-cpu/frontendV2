import { apiClient, USE_MOCK } from "./client";
import { delay, store, genId, getEffectiveInvitationCode } from "./mockStore";
import type { InvitationCode } from "../types";

// NOTE for backend integration: invitation codes are GENERIC. A code only
// authorizes someone to register as an Egg Mart cashier; it carries no
// shop. The shop a cashier joins is decided at signup from the Branch Name
// they type (backend: resolveOrCreateShopByLocation), and approval uses the
// shopId stored on that cashier — never anything the Admin app has selected.
// So none of these calls send a shopId, and the Global Shop Selector has no
// influence on them. The backend scopes a code to the requesting admin
// (createdByAdminId).

const CODE_TTL_MINUTES = 30;

function generateSixDigitCode(): string {
  // Mock-only: real generation must happen server-side using a
  // cryptographically secure random source. The frontend must never be
  // trusted to mint the code itself.
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// expects GET /admin/invitation-codes/active
// Returns this admin's current invitation code, or null if none exists.
export async function getActiveInvitationCode(): Promise<InvitationCode | null> {
  if (USE_MOCK) return delay(getEffectiveInvitationCode(), 350);
  const { data } = await apiClient.get<{ data: InvitationCode | null }>("/admin/invitation-codes/active");
  return data.data;
}

// expects POST /admin/invitation-codes (no body)
// Invalidates this admin's existing active code and mints a new generic one.
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
