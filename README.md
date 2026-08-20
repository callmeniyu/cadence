# ServiceFlow

Appointment scheduling and lightweight business management for service
businesses (clinics, salons, gyms, training centers, consultants, repair
services). Customers book online without creating an account; staff manage
their calendar, customers, invoices, and payments from a role-based admin
dashboard; customers who do register get a self-service portal.

Built with **React 19 + Vite**, **React Router**, **TanStack Query**,
**react-hook-form + zod**, **recharts**, and **Supabase** (Postgres, Auth,
Row Level Security, Edge Functions) as the backend.

---

## Status at a glance

- ✅ Frontend: fully built — public site, booking flow, authenticated admin
  app, customer portal. `npm run build` succeeds with 0 errors/warnings.
- ✅ Demo mode: fully working and the only backend **actually tested** in
  this environment (18 automated tests passing — see `npm test`).
- ✅ Supabase backend: complete SQL migrations (schema, constraints, RLS
  policies, functions/RPCs, seed template) and an Edge Function, written to
  match the frontend's data provider contract exactly.
- ⚠️ Supabase backend has **not been executed against a live project** in
  this environment — no project credentials were available. See
  [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) and the "Supabase integration
  checkpoint" section of [`PROJECT_PROGRESS.md`](./PROJECT_PROGRESS.md) for
  exactly what remains to be verified and how to do it.

---

## Quick start (demo mode — no backend required)

```bash
npm install
npm run dev
```

Open the printed local URL. The app starts in demo mode (`VITE_DEMO_MODE=true`
in `.env`), backed entirely by an in-browser, localStorage-persisted fake
database seeded with a demo business, **Nova Wellness Studio**. Nothing
leaves your browser.

### Demo accounts

All demo accounts use the password `demo1234`.

| Role     | Email                          |
|----------|---------------------------------|
| Owner    | owner@novawellness.demo         |
| Admin    | admin@novawellness.demo         |
| Staff    | staff1@novawellness.demo        |
| Staff    | staff2@novawellness.demo        |
| Customer | customer@novawellness.demo      |

The login page has one-click buttons to fill these in. You can also try the
public booking flow without logging in at `/b/nova-wellness-studio`.

To reset all demo data back to the original seed, clear your browser's
localStorage for the app's origin (or call `resetDemoData()` exported from
`src/services/demo/demoStore.js` in the console).

---

## Project structure

```
src/
  app/            Router, route guards, providers, query client
  components/
    common/        Design-system primitives (Button, Card, Modal, Toast, ...)
    layout/         Public header/footer, authenticated app shell, portal shell
  constants/       Status enums, transitions, roles — single source of truth
  features/        One folder per domain (auth, business, booking, staff, ...),
                    each exposing React Query hooks over the service layer
  lib/             supabaseClient.js — anon-key-only client boundary
  pages/           Route-level components (public, app, portal)
  schemas/         zod validation schemas, one per form/domain
  services/
    demo/           localStorage-backed fake backend + seed data
    supabase/       Real Supabase queries/RPC calls, same API surface as demo
    index.js        Picks demo vs. live provider based on VITE_DEMO_MODE
  styles/          Design tokens (CSS variables) + base reset
  utils/           formatting, slugs, ids, the shared slot-generation engine,
                    friendly error mapping

supabase/
  migrations/      001_schema, 002_constraints_indexes, 003_rls,
                    004_functions_triggers, 005_seed (+ RLS test matrix)
  functions/
    create-public-booking/   Edge Function for anonymous booking
```

### Why a "provider" abstraction?

`src/services/index.js` exports one flat API (`auth`, `businessApi`,
`servicesApi`, `bookingApi`, `appointmentsApi`, `invoicesApi`, `paymentsApi`,
`notificationsApi`, `reportsApi`, `portalApi`, ...) backed by **either**
`services/demo/demoProvider.js` **or** `services/supabase/supabaseProvider.js`,
selected by `VITE_DEMO_MODE`. Every page and hook in the app is written
against this one contract, so switching from demo data to a real Supabase
project requires **zero UI code changes** — only environment variables.

---

## Switching to a real Supabase backend

See [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) for the full walkthrough
(migrations, Edge Function deployment, environment variables, and the
manual RLS verification checklist). Short version:

```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
VITE_DEMO_MODE=false
```

---

## Security model (summary)

- **Row Level Security everywhere.** Every table is RLS-enabled; policies
  are role- and ownership-scoped (owner/admin/staff/customer), never
  `using (true)` for anything sensitive. See `supabase/migrations/003_rls.sql`.
- **Server-side authority for money and time.** Price, tax, and duration are
  always recomputed from `services`/`businesses` inside a Postgres RPC or
  Edge Function — never trusted from a browser-submitted total. See
  `004_functions_triggers.sql` and `functions/create-public-booking`.
- **Double-booking is a database-level guarantee**, not just a UI check: a
  `GIST` exclusion constraint (`appointments_no_overlap`) on
  `(staff_member_id, tstzrange(start_at, end_at))` makes overlapping
  "active" appointments for the same staff member physically impossible to
  insert, regardless of what the client believes was available.
- **No service-role key ever ships to the browser.** `src/lib/supabaseClient.js`
  only ever holds the anon/publishable key. The service-role key exists
  only inside the Edge Function runtime, for the one flow (anonymous public
  booking) that needs to safely create a guest customer row.
- **No real payment data anywhere.** `payments.method` is constrained to
  `cash | demo_card | bank_transfer | wallet`; `demo_card` is explicitly a
  simulation, never a real card processor integration.

---

## Testing

```bash
npm test        # vitest — 18 tests: slot-engine correctness + demo-provider
                 # integration (auth, double-booking rejection, invoice math,
                 # payment simulation)
npm run lint     # oxlint — 0 errors
npm run build    # production build — 0 errors/warnings
```

The test suite runs against the **demo provider**, i.e. the actual code
path exercised by the running app in this environment. It is not a
substitute for running the RLS test matrix in
`supabase/migrations/005_seed.sql` against a real Supabase project before
production use — that has not been done here (no project access).

---

## Known limitations / honest gaps

- Public booking Edge Function computes weekday using UTC rather than the
  business's configured timezone (documented inline in
  `create-public-booking/index.ts`); demo mode's client-side slot engine
  uses local browser time. For businesses far from UTC this can shift which
  calendar day a slot is grouped under near midnight — a timezone-aware
  rewrite is a follow-up.
- `businesses` RLS exposes all columns (including operational settings
  like `tax_rate_percent`) to anyone via the public "active businesses"
  policy, since Postgres RLS filters rows, not columns. A public-safe view
  is the recommended hardening step before production (noted in
  `003_rls.sql`).
- Reporting RPCs read directly from source tables; fine at demo scale, but
  should move to materialized views for a business with a large appointment
  history.
- Staff invitations (`membership_invitations`) record intent only — actually
  emailing an invite link and completing the accept flow is out of scope
  for this build.
