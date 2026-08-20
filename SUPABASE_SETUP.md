# Supabase Setup Guide

This walks through connecting ServiceFlow to a real Supabase project. None
of these steps have been executed in this environment — no Supabase project
credentials were available — so treat the SQL and Edge Function as
**implemented against the schema, not remotely verified**. Run the
verification checklist at the bottom before trusting this in production.

## 1. Create a Supabase project

1. Create a project at https://supabase.com/dashboard.
2. Note the **Project URL** and the **anon/publishable key** (Project
   Settings → API). You will need these for `.env`.
3. Note the **service-role key** as well — it is needed once, for deploying
   the Edge Function's environment, and must **never** be placed in `.env`
   or any file under `src/`.

## 2. Run the database migrations, in order

Using the Supabase SQL Editor (or the CLI's `supabase db push` against a
linked project), run each file in `supabase/migrations/` **in numeric
order**:

```
001_schema.sql               -- tables, incl. the double-booking exclusion constraint
002_constraints_indexes.sql  -- CHECK constraints + indexes
003_rls.sql                  -- helper functions + RLS policies on all tables
004_functions_triggers.sql   -- triggers, booking/invoice/payment RPCs, reporting RPCs
005_seed.sql                 -- optional demo data (see below)
```

`001_schema.sql` requires the `pgcrypto` and `btree_gist` extensions; the
migration enables both itself, but confirm they're allowed on your plan
(both are available on all Supabase tiers as of this writing).

### About `005_seed.sql`

Supabase Auth users can't be created reliably from plain SQL (auth.users
needs Supabase's auth service to set encrypted passwords, identities,
etc.). `005_seed.sql` is a template: sign up through the app UI (or
Supabase Studio → Authentication → Add user) for the account(s) you want,
complete onboarding as that user to create the business via
`create_business_workspace()`, then fill in the two UUID variables at the
top of `005_seed.sql` and run it to add sample services/customers/
appointments under that real business. The file also contains a full
manual RLS test matrix (owner/admin/staff/customer/anonymous) — walk
through it before considering RLS "done."

## 3. Deploy the Edge Function

```bash
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy create-public-booking
```

The function needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in its
environment — Supabase sets these automatically for deployed Edge
Functions, so no manual secret configuration should be required. If you
test locally with `supabase functions serve`, the CLI also injects these
automatically from your linked project.

## 4. Configure environment variables

In `.env` (copy from `.env.example`):

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
VITE_DEMO_MODE=false
```

Restart `npm run dev` (or rebuild) after changing `.env` — Vite only reads
`VITE_*` variables at build/start time.

## 5. Sign up and onboard

With `VITE_DEMO_MODE=false`, `/register` now creates a real Supabase Auth
user (a `profiles` row is created automatically by the `handle_new_user`
trigger), and `/onboarding` calls the `create_business_workspace()` RPC to
create your business + owner membership. From there the entire app — admin
dashboard, public booking page at `/b/your-slug`, customer portal — runs
against Postgres instead of localStorage.

## 6. RLS verification checklist

This is the actual list from `005_seed.sql`, repeated here for visibility.
**None of these have been run against a live project in this environment.**
Run them (via Supabase Studio's "Run as user" in the SQL editor, or by
hitting the REST/RPC API with each role's JWT) before production use:

**Owner**
- [ ] Select own business row → succeeds
- [ ] Update own business settings → succeeds
- [ ] Insert into `business_members` directly → denied (must go through
      `create_business_workspace`/invite flow)

**Admin**
- [ ] Update services/appointments/customers/invoices in own business →
      succeeds
- [ ] Update `business_members` to set `role='owner'` on self → denied

**Staff**
- [ ] Select appointments assigned to self → succeeds
- [ ] Select appointments assigned to a different staff member → denied
- [ ] Select invoices/payments → denied (no staff SELECT policy exists)
- [ ] Update appointment status via `update_appointment_status()` on own
      assigned appointment → succeeds; on another staff member's → denied

**Customer** (authenticated, linked via `customers.auth_user_id`)
- [ ] Select own appointments → succeeds; another customer's → denied
- [ ] Select own invoices/payments → succeeds; another customer's → denied
- [ ] `cancel_own_appointment()` outside the cancellation window →
      succeeds; inside the window → denied with a friendly error

**Anonymous**
- [ ] Select `services` where `active=true and public_visible=true` →
      succeeds
- [ ] Select `customers`/`invoices`/`payments`/`appointments` directly →
      denied
- [ ] Call `create-public-booking` with a valid slot → creates appointment;
      with an already-booked slot → friendly conflict error, no row
      inserted (exclusion constraint enforced)

## 7. Known gaps to close before production

- The public "active businesses" SELECT policy on `businesses` currently
  exposes all columns, not just public-safe ones (RLS filters rows, not
  columns). Consider a `public.businesses_public` view exposing only
  `id, name, slug, business_type, address, phone, brand_color, timezone,
  currency` and pointing the public pages at that instead.
- `create-public-booking`'s weekday/availability check uses UTC rather than
  the business's timezone — acceptable for a UTC-based or nearby-timezone
  business, but should be made timezone-aware for global use.
- Reporting RPCs (`get_revenue_series`, etc.) query source tables directly;
  fine for a single business at moderate scale, but should move to
  materialized views if usage grows.
- No automated CI is configured to re-run the RLS test matrix on schema
  changes — currently a manual checklist only.
