import { apiClient } from "./client";
import type { ApprovedRecovery, CashierRecoveryRequest, RecoveryListFilter } from "../types/cashierRecovery";

// Central Admin — Cashier recovery management. Backend: /api/admin/cashier-recovery/*
//
// Deliberately NO mock path: recovery is only meaningful against the real
// backend, and this app must never pretend a code was issued.
//
// Authorization is enforced by the server (only the one configured Central
// Admin; independent of the selected shop). These calls therefore send NO
// shopId, and switching shops has no effect on what is returned.
//
// The one-time code appears only in the approve() response. It is returned to
// the caller and must be kept in React state only — never in the URL,
// localStorage or sessionStorage, and never logged.

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

const BASE = "/admin/cashier-recovery";

export async function fetchRecoveryRequests(filter: RecoveryListFilter): Promise<CashierRecoveryRequest[]> {
  const { data } = await apiClient.get<ApiEnvelope<CashierRecoveryRequest[]>>(BASE, { params: { filter } });
  return data.data;
}

/**
 * Re-authenticates with the Admin's CURRENT password (verified server-side on
 * this request) and records that the Cashier's identity was checked in person.
 */
export async function approveRecoveryRequest(id: string, currentPassword: string): Promise<ApprovedRecovery> {
  const { data } = await apiClient.post<ApiEnvelope<ApprovedRecovery>>(
    `${BASE}/${encodeURIComponent(id)}/approve`,
    { currentPassword, identityVerified: true }
  );
  return data.data;
}

/** Rejects a pending request, or revokes an already-approved one (invalidating its code). */
export async function rejectRecoveryRequest(id: string): Promise<CashierRecoveryRequest> {
  const { data } = await apiClient.post<ApiEnvelope<CashierRecoveryRequest>>(`${BASE}/${encodeURIComponent(id)}/reject`, {});
  return data.data;
}
