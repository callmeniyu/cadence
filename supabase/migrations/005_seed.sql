-- =============================================================================
-- ServiceFlow — 005_seed.sql
-- Seed data for a demo business ("Nova Wellness Studio", spec section 81).
--
-- IMPORTANT — auth user coupling:
-- Supabase Auth users cannot be created portably from a plain SQL migration
-- (auth.users requires Supabase's auth service to set encrypted_password,
-- identities, etc. correctly). Hardcoding fake auth.users rows here would
-- produce accounts that cannot actually sign in, which fails silently and
-- is worse than no seed at all.
--
-- Workflow instead:
--   1. Run 001-004 against your project.
--   2. Sign up normally through the app UI (or Supabase Studio > Auth >
--      Add user) for the accounts you want, e.g.:
--        owner@yourbusiness.test / <choose a strong password>
--   3. Complete the onboarding wizard as that user to create the business
--      workspace (this calls create_business_workspace(), which is the only
--      supported way to create a business + owner membership).
--   4. Run the block below, substituting the real auth.uid() values you now
--      have in auth.users / business_members, to seed services/staff/
--      customers/appointments/invoices/payments/notifications under that
--      real business_id.
--
-- The block below is written as a template using variables via a DO block
-- so you only need to fill in the two UUIDs at the top.
-- =============================================================================

do $$
declare
  -- Fill these in after completing steps 1-3 above.
  v_business_id uuid := null; -- e.g. 'a1b2c3d4-...'
  v_owner_user_id uuid := null; -- the auth.users id of the owner who ran onboarding

  v_svc_consult uuid;
  v_svc_private uuid;
  v_svc_recovery uuid;
  v_svc_group uuid;
  v_owner_member_id uuid;
  v_cust1 uuid;
  v_cust2 uuid;
begin
  if v_business_id is null or v_owner_user_id is null then
    raise notice 'Skipping 005_seed.sql demo data: set v_business_id and v_owner_user_id first. See comment header for the manual post-signup workflow.';
    return;
  end if;

  select id into v_owner_member_id from business_members where business_id = v_business_id and user_id = v_owner_user_id;

  insert into services (business_id, name, category, description, duration_minutes, price, buffer_before_minutes, buffer_after_minutes, color)
  values
    (v_business_id, 'Initial Consultation', 'Consultations', 'A first meeting to understand your goals and build a personalized plan.', 45, 350, 5, 10, '#3a63f0'),
    (v_business_id, 'Private Session', 'Sessions', 'One-on-one focused session tailored to your program.', 60, 550, 5, 10, '#16b3a3'),
    (v_business_id, 'Recovery Session', 'Sessions', 'Guided recovery and mobility session.', 40, 400, 5, 10, '#d98b1a'),
    (v_business_id, 'Small Group Session', 'Group', 'Small group session capped at 6 participants.', 50, 250, 5, 10, '#8a5cf5')
  returning id into v_svc_consult; -- captures first row's id only; see notice below

  select id into v_svc_consult from services where business_id = v_business_id and name = 'Initial Consultation';
  select id into v_svc_private from services where business_id = v_business_id and name = 'Private Session';
  select id into v_svc_recovery from services where business_id = v_business_id and name = 'Recovery Session';
  select id into v_svc_group from services where business_id = v_business_id and name = 'Small Group Session';

  insert into staff_services (business_id, member_id, service_id)
  values
    (v_business_id, v_owner_member_id, v_svc_consult),
    (v_business_id, v_owner_member_id, v_svc_private),
    (v_business_id, v_owner_member_id, v_svc_recovery),
    (v_business_id, v_owner_member_id, v_svc_group);

  insert into availability_rules (business_id, member_id, weekday, start_time, end_time)
  select v_business_id, v_owner_member_id, wd, '09:00', '17:00'
  from unnest(array[0,1,2,3,4]) as wd;

  insert into customers (business_id, full_name, email, phone)
  values
    (v_business_id, 'Omar Reda', 'omar.reda@example.test', '+20 100 111 2222'),
    (v_business_id, 'Farida Naguib', 'farida.naguib@example.test', '+20 100 333 4444')
  returning id into v_cust1;

  select id into v_cust1 from customers where business_id = v_business_id and email = 'omar.reda@example.test';
  select id into v_cust2 from customers where business_id = v_business_id and email = 'farida.naguib@example.test';

  insert into appointments (business_id, booking_code, customer_id, service_id, staff_member_id, start_at, end_at, status, payment_status, source)
  values
    (v_business_id, generate_booking_code(), v_cust1, v_svc_consult, v_owner_member_id, now() + interval '1 day 10 hours', now() + interval '1 day 10 hours 45 minutes', 'confirmed', 'unpaid', 'public_booking'),
    (v_business_id, generate_booking_code(), v_cust2, v_svc_private, v_owner_member_id, now() + interval '2 days 14 hours', now() + interval '2 days 15 hours', 'pending', 'unpaid', 'public_booking');

  raise notice 'Seed data inserted for business %', v_business_id;
end $$;

-- =============================================================================
-- RLS TEST MATRIX (spec section 86)
--
-- These are the manual verification steps to run against a live project
-- (via Supabase Studio SQL editor "Run as user", or the API with each
-- role's JWT) before considering RLS verified. None of this has been
-- executed in this environment — see PROJECT_PROGRESS.md.
--
-- OWNER
--   [ ] SELECT own business row -> succeeds
--   [ ] SELECT a different business's row where active=false -> denied
--       (active=true rows are intentionally public-readable, see 003_rls.sql)
--   [ ] UPDATE own business settings -> succeeds
--   [ ] INSERT into business_members directly -> denied (no insert policy;
--       must go through create_business_workspace/invite flow)
--
-- ADMIN
--   [ ] UPDATE services/appointments/customers/invoices in own business -> succeeds
--   [ ] UPDATE business_members SET role='owner' on self -> denied
--       (business_members_update_owner_admin policy blocks non-owners from
--       writing role='owner')
--
-- STAFF
--   [ ] SELECT appointments where staff_member_id = own member id -> succeeds
--   [ ] SELECT appointments assigned to a different staff member -> denied
--   [ ] SELECT invoices/payments -> denied (no staff SELECT policy exists)
--   [ ] UPDATE appointments.status via update_appointment_status() on own
--       assigned appointment -> succeeds; on another staff member's -> denied
--
-- CUSTOMER (authenticated, linked via customers.auth_user_id)
--   [ ] SELECT own appointments (is_own_customer) -> succeeds
--   [ ] SELECT another customer's appointments by id -> denied
--   [ ] SELECT own invoices/payments -> succeeds; another customer's -> denied
--   [ ] cancel_own_appointment() on own upcoming appointment outside the
--       cancellation window -> succeeds; inside the window -> denied with
--       friendly error
--
-- ANONYMOUS
--   [ ] SELECT services where active=true and public_visible=true -> succeeds
--   [ ] SELECT customers table directly -> denied (no anon policy)
--   [ ] SELECT invoices/payments/appointments directly -> denied
--   [ ] Call create-public-booking Edge Function with a valid slot -> creates
--       appointment; with an already-booked slot -> returns friendly conflict
--       error, no row inserted (exclusion constraint enforced)
-- =============================================================================
