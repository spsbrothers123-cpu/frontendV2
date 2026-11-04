# UPI Management — Proposed API Contract (DRAFT, not yet agreed with BackendV2)

Nothing here is confirmed to exist. The frontend routes live in one place
(`UPI_ROUTES` in `src/api/upiApi.ts`) and shapes in `src/types/upi.ts`.
All routes: authenticated, admin-only, scoped server-side to the requesting
admin. The frontend never sends an admin id.

## Endpoints

| Purpose | Method + path (proposed) | Body |
|---|---|---|
| Load everything | `GET /admin/upi/overview` | – |
| Save common account | `PUT /admin/upi/common` | `{ upiId, payeeName, enabled }` |
| Save branch config | `PUT /admin/upi/shops/:shopId` | `{ mode: "COMMON" }` or `{ mode: "CUSTOM", upiId, payeeName, enabled }` |

Write responses are not parsed; the UI refetches the overview after each save.

## GET overview response (bare or `{ success, data }`)

```json
{
  "common": { "upiId": "", "payeeName": "", "enabled": true, "updatedAt": "ISO" },
  "branches": [{
    "shopId": "", "shopName": "", "shopCode": "", "location": "",
    "mode": "COMMON | CUSTOM",
    "custom": { "upiId": "", "payeeName": "", "enabled": true },
    "effective": { "source": "SHOP | COMMON | NONE", "upiId": "", "payeeName": "", "reason": "" },
    "updatedAt": "ISO"
  }]
}
```
- `common` is `null` when never configured. `custom` is `null` when never saved.
- `branches` = every shop this admin is authorized for (same set as `GET /admin/shops`), independent of the active shop.
- `effective` is resolved by the backend with the SAME function the Cashier Portal uses:
  1. enabled custom account when `mode = CUSTOM`; 2. enabled common account; 3. `NONE`.
- When `mode = COMMON`, a saved `custom` account is retained but MUST NOT be used.
- `PUT { mode: "COMMON" }` must leave saved custom details untouched.

## Validation (proposed — backend is authoritative and must match)
- UPI ID: trimmed; `handle@provider`; handle 2–256 of `[A-Za-z0-9._-]`; provider 2–64 letters.
- Payee name: trimmed; 2–50 chars; no control characters.
- Format validation does not verify account ownership.

## Errors
- `400/422` field errors must include a `code`: `UPI_ID_INVALID`, `PAYEE_NAME_INVALID` (the client's error normalizer keeps only `message` + `code`).
- `401` session expired; `403` non-admin; `404`/`403` for a shop not owned by the admin.
- Optional: `409` if `updatedAt` is stale (two tabs editing) — not used by the UI yet.
