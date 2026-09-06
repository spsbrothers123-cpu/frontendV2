# Egg Mart — Admin Frontend (Phase 1)

Admin-only panel for RBR Egg Mart: Dashboard, Products, Customers, Expenses,
Purchases. Cashier and customer-facing frontends are **out of scope** here.

## Status: running on a mock backend

**Your real Egg Mart backend/frontend weren't available to inspect in this
build environment**, so per the brief's instruction not to invent endpoints,
this Phase 1 was built two-layered instead:

1. Every screen is fully wired to an **API module** (`src/api/*.ts`) whose
   function signatures, params, and return types already match what a real
   REST backend for this domain would look like (see the mapping below).
2. Each function currently serves data from an **in-memory mock store**
   (`src/api/mockStore.ts`) so the whole app — auth, CRUD, stock adjustment,
   purchases — is clickable end-to-end with no backend connected.

When you connect the real backend:

1. Set `VITE_API_BASE_URL` in `.env` to your API's base URL.
2. Set `VITE_USE_MOCK=false`.
3. Open each file in `src/api/` — every function has a `// NOTE for backend
   integration` comment stating the exact endpoint, method, and payload it
   expects. Confirm each against your actual backend routes and adjust the
   `apiClient.get/post/put/patch/delete` calls (already written, just behind
   the `USE_MOCK` flag) if a path or field name differs.
4. Delete or ignore `mockStore.ts` — nothing else references it directly.

No screen fabricates data that isn't backend-shaped: the one exception is
**Collect Payment** on the Customers page, which is intentionally disabled
and throws a clear "not connected" error, because that endpoint doesn't
exist yet anywhere in the spec or a real backend to confirm against.

## API mapping (Feature → Endpoint)

| Feature | Endpoint | Method | Notes |
|---|---|---|---|
| Admin login | `/auth/admin/login` | POST | `{ email, password }` -> `{ token, user }` |
| Current session check | `/auth/me` | GET | Validates token, returns admin profile |
| Logout | `/auth/logout` | POST | Best-effort; local session clears regardless |
| Dashboard KPIs | `/admin/dashboard/kpis` | GET | `?range=today\|week\|month` |
| Sales chart | `/admin/dashboard/sales` | GET | `?window=7d\|30d\|3m` |
| Recent transactions | `/admin/dashboard/transactions` | GET | `?limit=` |
| Low stock alerts | `/admin/dashboard/low-stock` | GET | |
| List/search products | `/admin/products` | GET | `?search&category&status&page&pageSize` |
| Create product | `/admin/products` | POST | |
| Update product | `/admin/products/:id` | PUT | |
| Adjust stock | `/admin/products/:id/adjust-stock` | PATCH | `{ delta }` |
| Soft delete product | `/admin/products/:id` | DELETE | Backend should flag inactive, not hard-delete |
| List/search customers | `/admin/customers` | GET | `?search&page&pageSize` |
| Create customer | `/admin/customers` | POST | |
| Update customer | `/admin/customers/:id` | PUT | |
| Customer purchase history | `/admin/customers/:id/purchase-history` | GET | |
| Customer payment history | `/admin/customers/:id/payments` | GET | **Not confirmed to exist** -- UI degrades gracefully on 404 |
| Collect credit payment | `/admin/customers/:id/collect-payment` | POST | **Not implemented** -- action stays disabled until wired |
| List/search expenses | `/admin/expenses` | GET | `?search&category&dateFrom&dateTo&page&pageSize` |
| Create/update/delete expense | `/admin/expenses[/:id]` | POST/PUT/DELETE | |
| List/search purchases | `/admin/purchases` | GET | `?search&page&pageSize` |
| Create purchase | `/admin/purchases` | POST | Backend expected to compute totals + increment product stock |

## Stack

React 18 - TypeScript - Vite - React Router 6 - Tailwind CSS - Recharts -
Axios - Lucide icons.

## Structure

```
src/
  api/          one module per feature + shared client/mock store
  components/
    layout/     Sidebar, TopHeader, AdminLayout, PageHeader
    ui/         Button, Input, DataTable, Drawer, Pagination, etc.
    products/ customers/ expenses/ purchases/   feature-specific drawers
  context/      AuthContext, ToastContext
  pages/        one file per route
  routes/       ProtectedRoute
  types/        shared TS interfaces
```

## Design system

- Colors, radii, and shadows are defined as Tailwind tokens in
  `tailwind.config.js` (`yolk`, `ivory`, `charcoal`, `olive`, `amber`,
  `danger`) matching the "Modern Retail Command Center" brief.
- Fonts: Inter (body) + DM Sans (headings), loaded in `src/index.css`.

## Responsiveness

- Sidebar: fixed + collapsible on desktop/laptop, icon rail on tablet width,
  full overlay drawer on mobile.
- KPI cards: 4 -> 2 -> 1 column grid across desktop/tablet/mobile.
- All data tables render as real `<table>`s on tablet and up, and as
  stacked cards on mobile (`DataTable` component, see
  `src/components/ui/DataTable.tsx`) -- no horizontal-scroll-only fallback.
- Drawers go full-screen on mobile, partial width on tablet/desktop.
- Tested visually against 375 / 768 / 1024 / 1440px breakpoints.

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run lint
```

Login accepts **any email** + a password of 4+ characters while
`VITE_USE_MOCK=true`.

## What's intentionally not here (Phase 2 placeholders)

Inventory, Credits, Reports, History, Sessions are visible in the sidebar
(per the brief) but are inert -- no route, no fake data -- ready to be built
out in Phase 2.
