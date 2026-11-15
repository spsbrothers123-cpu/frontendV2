# Admin Notification Center — Proposed API Contract (DRAFT, not agreed with BackendV2)

**Nothing in this file is confirmed to exist.** The backend was not part of the
Phase 1 baseline (`A.zip`), so no endpoint below could be verified — including
the prototype `GET /admin/notifications` / `PATCH …/read` / `PATCH …/read-all`
calls that the old `api/notifications.ts` contained. The frontend never falls
back to mock data: if an endpoint is missing or answers in another shape, the
Notification Center shows its error state with a retry button.

All frontend requests live in `src/api/notifications.ts`; shapes in
`src/types/notifications.ts`; parsing in `src/lib/notifications.ts`.

## Conventions

- Authenticated, Central Admin only. The frontend sends no admin id.
- **One central Admin receives notifications for every branch.** Endpoints must
  NOT scope results to the admin's currently selected shop. `branchId` is a
  filter, never an access restriction.
- Responses may be bare or wrapped as `{ "success": true, "data": … }`.
- Timestamps are ISO 8601 (UTC is fine). Date filters (`dateFrom`/`dateTo`) are
  `YYYY-MM-DD`, inclusive, interpreted in **IST (Asia/Kolkata)**.
- Errors: HTTP status plus `{ "message": "human readable", "code": "OPTIONAL" }`.
  The frontend shows `message` verbatim.
- Unknown `category` / `type` / `target.kind` values must be tolerated by the
  backend contract: the UI shows unknown categories with a humanised label.

## Endpoints

| Purpose | Method + path (proposed) | Request | Response |
|---|---|---|---|
| List (bell + Center) | `GET /admin/notifications` | query: `status` (`unread`\|`read`, omit = all), `category`, `branchId`, `dateFrom`, `dateTo`, `page`, `pageSize` | `{ items, total, page, pageSize, unreadCount }` |
| Mark read / unread | `PATCH /admin/notifications/:id/read` | `{ "read": true \| false }` | 204 or any 2xx (body ignored) |
| Mark all read | `PATCH /admin/notifications/read-all` | – | 204 or any 2xx |
| Delete one | `DELETE /admin/notifications/:id` | – | 204 or any 2xx |
| Clear all read | `POST /admin/notifications/clear-read` | – | `{ "deletedCount": number }` |
| Load settings | `GET /admin/notification-settings` | – | `{ categories: [{ category, enabled }] }` |
| Save settings | `PUT /admin/notification-settings` | `{ categories: [{ category, enabled }] }` | the saved settings (same shape) |
| Daily summary details | `GET /admin/daily-summaries/:id` | – | `DailySummary` (below) |

(`/admin/notification-settings` is separate from `/admin/notifications/…` so
`settings` can never be mistaken for a notification `:id`.)

### Notification

```json
{
  "id": "string",
  "category": "inventory | cashier | credit | sales_purchases | security | daily_summary | <future>",
  "type": "inventory.low_stock",
  "severity": "info | warning | critical",
  "title": "Brown Eggs (Tray) is low",
  "message": "7 left at Main Shop.",
  "createdAt": "2026-11-05T09:00:00Z",
  "read": false,
  "branch": { "id": "shop-1", "name": "Main Shop" },
  "target": { "kind": "product", "id": "p123", "route": null }
}
```

- `id`, `title`, `createdAt` are required; a row without them is dropped by the client.
- `branch` is `null` for company-wide notifications (e.g. the daily summary).
- `target` is `null` when there is nothing to open.

### List response — requirements

- `unreadCount` is the number of unread notifications **across all branches and
  ignoring every filter and page**. It drives the bell's numeric badge. A
  response without a numeric `unreadCount` is rejected by the client.
- Newest first (`createdAt` descending).
- Notifications deleted by the admin must never be returned again, including
  after later synchronisation / regeneration (keep a tombstone).

### Navigation metadata (`target`)

The client resolves "open related record" in this order:

1. `target.route` — an internal path starting with `/admin/` (no `//`, `..`,
   backslashes or spaces). Treated as the **exact record**. Anything else is ignored.
2. `kind: "daily_summary"` + `id` → `/admin/daily-summaries/:id` (exact; page exists).
3. Known `kind` → the matching module page (**not** an exact record — see limitation below):

| `kind` | Opens |
|---|---|
| `product`, `inventory` | `/admin/inventory` |
| `bill`, `sale` | `/admin/history` |
| `purchase` | `/admin/purchases` |
| `expense` | `/admin/expenses` |
| `customer` | `/admin/customers` |
| `credit` | `/admin/credits` |
| `cashier` | `/admin/cashiers` |
| `session` | `/admin/sessions` |
| `recovery_request` | `/admin/sessions?tab=recovery` |

**Limitation:** apart from the Daily Summary page, existing Admin pages cannot
open a single record from a URL. Until they do (a separate, small change per
page), a `target.route` supplied by the backend only lands on that page.

### Settings

```json
{ "categories": [ { "category": "inventory", "enabled": true }, … ] }
```

- Return one entry per category the admin can configure (the six approved
  categories today). The client renders whatever is returned.
- **Critical Security notifications cannot be disabled.** The client shows the
  Security Alerts category as "Always on" and always sends `enabled: true` for
  it, but the backend must enforce this itself (ignore or reject `false`).

### DailySummary

```json
{
  "id": "2026-11-05",
  "businessDate": "2026-11-05",
  "windowStart": "2026-11-04T18:30:00Z",
  "windowEnd": "2026-11-05T16:30:00Z",
  "generatedAt": "2026-11-05T16:30:00Z",
  "metrics":  [ { "key": "sales", "label": "Net sales", "value": 125000, "format": "currency | count | percent | text" } ],
  "branches": [ { "branch": { "id": "shop-1", "name": "Main Shop" }, "metrics": [ /* same metric shape */ ] } ]
}
```

- Window is **12 AM–10 PM IST**; generated at **10 PM IST** (= 16:30 UTC).
  If `windowStart`/`windowEnd` are omitted the page shows the approved window text.
- Metrics are generic `{ key, label, value, format }` so the backend decides
  which figures a summary contains; the frontend invents none.

## Behaviour the backend must provide (frontend does not do these)

- Notification generation, daily-summary generation/scheduling, and 90-day retention purge.
- Read state changes only via `PATCH …/read` or `read-all`. Opening a
  notification or its record never changes it.
- Deleting a notification never touches the underlying business record.
- Respect per-category settings when generating notifications (except critical security).

## Open questions for review

1. **Security lock scope.** The rule says *critical* security alerts cannot be
   disabled. The UI currently locks the whole **Security Alerts** category on
   (simplest way to guarantee the rule). Should non-critical security alerts be
   switchable? That needs a per-severity setting in this contract.
2. **Existing prototype endpoints.** Does `GET /admin/notifications` /
   `PATCH /admin/notifications/read-all` already exist in BackendV2 and in what shape?
3. **Record-level deep links.** Which pages should gain open-by-id support, and
   will the backend supply `target.route`?
4. **Branch-specific records.** Opening a record from another branch does not
   switch the header shop (switching calls `POST /admin/shops/switch`, a
   server-side side effect). Confirm that is the desired behaviour.
