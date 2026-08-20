# ServiceFlow — Project Progress

Status: **COMPLETE** (demo mode fully built & tested; Supabase backend
implemented but not remotely verified — see checkpoint below).

## Final verification (last run)
- `npm run build` → succeeds, 0 errors, 0 warnings.
- `npm run lint` (oxlint) → 0 errors, 11 non-blocking stylistic warnings
  (react-refresh export-shape conventions in context/hook files).
- `npm test` (vitest) → **18/18 passing**:
  - `src/utils/slotEngine.test.js` (7): working-window slot packing, buffer
    handling, lead-time exclusion, blocked-time and appointment overlap
    exclusion.
  - `src/services/demo/demoProvider.test.js` (11): auth sign-up/sign-in +
    duplicate-email rejection, workspace/owner creation + duplicate-slug
    rejection, **double-booking rejection** (core anti-conflict guarantee),
    customer dedup by email across repeat bookings, invoice subtotal/tax/
    total computed from service price + business tax rate (never client
    input), and simulated payment success/failure correctly updating (or
    correctly *not* updating) invoice balance/status.
- SPA routing smoke-tested via `vite preview`: `/`, `/b/nova-wellness-studio`,
  `/app`, and an unknown path all return 200 with correct client-side
  fallback (no server-side routing needed for GitHub Pages/Netlify/Vercel-
  style static hosting).
- Responsive/accessibility spot check: media queries present and correct in
  all component/page stylesheets (KPI grids, detail grids, tables, modals,
  toasts, sidebar→bottom-nav collapse, hero); no raw `<img>` tags (icons are
  inline SVG via lucide-react); forms use paired `<label for>`/`id`; error
  text uses `role="alert"`; `:focus-visible` and `prefers-reduced-motion`
  are respected globally.

## What's built
Full React + Vite frontend (public marketing/booking site, booking wizard,
onboarding, full role-based admin app — dashboard/calendar/appointments/
customers/services/staff/invoices/payments/notifications/reports/settings —
and a customer self-service portal), a complete demo/development data
provider (localStorage-backed, seeded "Nova Wellness Studio" business), a
schema-matched but unverified live Supabase provider, and the full Supabase
backend as SQL: `001_schema.sql` (tables + GIST exclusion constraint for
double-booking), `002_constraints_indexes.sql`, `003_rls.sql` (RLS on all
15 tables, no `using (true)` on sensitive policies), `004_functions_
triggers.sql` (booking/invoice/payment RPCs, reporting RPCs), `005_seed.sql`
(seed template + manual RLS test matrix), and the `create-public-booking`
Edge Function.

Documentation: `README.md` (full — quick start, demo accounts, architecture,
security model, testing, known gaps), `SUPABASE_SETUP.md` (migration order,
Edge Function deployment, env vars, full RLS verification checklist, known
gaps to close before production).

## Supabase integration checkpoint (unchanged — stated plainly)
No Supabase project credentials were available in this environment.
`services/supabase/supabaseProvider.js`, all `supabase/migrations/*.sql`,
and `supabase/functions/create-public-booking/index.ts` are written to
match the frontend's provider contract and each other exactly, but have
**never been executed against a live Postgres/Supabase instance**. Nothing
in this repository or in any prior message should be read as claiming
otherwise. `SUPABASE_SETUP.md` §6 is the concrete checklist to run before
trusting RLS in production.

## Known, documented (not hidden) limitations
1. `create-public-booking`'s weekday/availability check uses UTC rather
   than the business's configured timezone.
2. The public "active businesses" RLS SELECT policy exposes all columns
   (RLS filters rows, not columns) — a `businesses_public` view is the
   recommended fix, noted in both `003_rls.sql` and `SUPABASE_SETUP.md`.
3. Reporting RPCs query source tables directly rather than materialized
   views — fine at demo/small-business scale.
4. Staff invitations record intent only; no outbound email is sent (out of
   scope for this build).
5. oxlint's 11 remaining warnings are react-refresh export-shape
   conventions (e.g. a context file exporting both a component and a hook)
   — cosmetic, not correctness issues.

## Continuation point
There is no further planned work; the acceptance checklist items
implementable without live Supabase credentials are complete. If resuming
with real credentials, start at `SUPABASE_SETUP.md` and work through its
numbered steps, then run the §6 RLS checklist before flipping
`VITE_DEMO_MODE=false` in any real deployment.
