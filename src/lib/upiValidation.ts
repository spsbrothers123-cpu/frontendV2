// Application-level UPI validation rules.
//
// PROPOSED rules — not yet verified against BackendV2. The backend is the
// authoritative validator and must enforce the final agreed contract; keep
// this file in lock-step with it.
//
// Format validation does NOT verify that a UPI account exists or who owns it.

const UPI_ID_RE = /^[A-Za-z0-9._-]{2,256}@[A-Za-z]{2,64}$/;
// C0 controls, DEL and C1 controls.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/;

export const PAYEE_NAME_MIN = 2;
export const PAYEE_NAME_MAX = 50;

export function validateUpiId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "UPI ID is required.";
  if (!UPI_ID_RE.test(value)) {
    return "Enter a UPI ID like name@provider (letters, numbers, dot, hyphen or underscore before the @).";
  }
  return null;
}

export function validatePayeeName(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Payee name is required.";
  if (value.length < PAYEE_NAME_MIN) return `Payee name must be at least ${PAYEE_NAME_MIN} characters.`;
  if (value.length > PAYEE_NAME_MAX) return `Payee name must be at most ${PAYEE_NAME_MAX} characters.`;
  if (CONTROL_CHARS_RE.test(value)) return "Payee name contains invalid characters.";
  return null;
}

export interface UpiFormErrors {
  upiId?: string;
  payeeName?: string;
}

export function validateUpiAccount(values: { upiId: string; payeeName: string }): UpiFormErrors {
  const errors: UpiFormErrors = {};
  const idError = validateUpiId(values.upiId);
  const nameError = validatePayeeName(values.payeeName);
  if (idError) errors.upiId = idError;
  if (nameError) errors.payeeName = nameError;
  return errors;
}

// PROVISIONAL: maps backend error `code`s to form fields. api/client.ts
// normalizes errors to { status, message, code } and drops field maps, so the
// backend must send per-field codes. Confirm names in UPI_API_CONTRACT.md.
const FIELD_ERROR_CODES: Record<string, keyof UpiFormErrors> = {
  UPI_ID_INVALID: "upiId",
  PAYEE_NAME_INVALID: "payeeName",
};

export function fieldForErrorCode(code?: string): keyof UpiFormErrors | null {
  return (code && FIELD_ERROR_CODES[code]) || null;
}
