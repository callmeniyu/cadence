-- =============================================================================
-- ServiceFlow — 003_rls.sql
-- Row Level Security. Every application table exposed via the Data API has
-- RLS enabled here — access is always decided by the database, never only
-- by hiding buttons in the UI (spec section 3/49-54).
-- =============================================================================

-- -----------------------------------------------------------------------
-- Helper functions. SECURITY DEFINER so they can read business_members
-- (itself RLS-protected) without causing recursive-policy deadlocks, but
-- each one is narrowly scoped, takes no untrusted free-form SQL, and reads
-- auth.uid() rather than trusting a caller-supplied user id.
-- -----------------------------------------------------------------------

create or replace function is_business_member(p_business_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from business_members
    where business_id = p_business_id and user_id = auth.uid() and active = true
  );
$$;

create or replace function has_business_role(p_business_id uuid, p_roles text[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from business_members
    where business_id = p_business_id and user_id = auth.uid()
      and active = true and role = any(p_roles)
  );
$$;

create or replace function is_business_owner(p_business_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from business_members
    where business_id = p_business_id and user_id = auth.uid()
      and active = true and role = 'owner'
  );
$$;

-- Returns the caller's own business_members.id for a business, or null.
create or replace function my_member_id(p_business_id uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select id from business_members
  where business_id = p_business_id and user_id = auth.uid() and active = true
  limit 1;
$$;

-- Returns true if a customer row belongs to the calling authenticated user.
create or replace function is_own_customer(p_customer_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from customers where id = p_customer_id and auth_user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------
alter table profiles enable row level security;
alter table businesses enable row level security;
alter table business_members enable row level security;
alter table services enable row level security;
alter table staff_services enable row level security;
alter table availability_rules enable row level security;
alter table blocked_times enable row level security;
alter table customers enable row level security;
alter table appointments enable row level security;
alter table appointment_activity enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;
alter table membership_invitations enable row level security;

-- -----------------------------------------------------------------------
-- profiles: a user can read/update their own profile only. Business
-- members can additionally view the (non-sensitive) profile of other
-- members in a shared business, needed to show staff names on the
-- calendar/appointments UI.
-- -----------------------------------------------------------------------
create policy profiles_select_own on profiles for select
  using (id = auth.uid());

create policy profiles_select_co_member on profiles for select
  using (exists (
    select 1 from business_members bm1
    join business_members bm2 on bm1.business_id = bm2.business_id
    where bm1.user_id = auth.uid() and bm1.active and bm2.user_id = profiles.id and bm2.active
  ));

create policy profiles_update_own on profiles for update
  using (id = auth.uid());

-- profiles are inserted only by the handle_new_user trigger (security definer)

-- -----------------------------------------------------------------------
-- businesses
-- -----------------------------------------------------------------------
create policy businesses_select_member on businesses for select
  using (is_business_member(id));

-- Public may read active businesses (needed for the public landing/services
-- pages and slug routes). Only non-sensitive columns are exposed to the
-- product by convention in the frontend query — sensitive settings such as
-- tax_rate_percent are still technically readable by this broad SELECT
-- policy, so a future hardening step is to split this into a public "safe
-- view" (documented as a follow-up in PROJECT_PROGRESS.md).
create policy businesses_select_public_active on businesses for select
  using (active = true);

create policy businesses_update_owner_admin on businesses for update
  using (has_business_role(id, array['owner','admin']));

-- Insert only via create_business_workspace() RPC (SECURITY DEFINER), so no
-- direct-insert policy is granted to authenticated/anon roles here.

-- -----------------------------------------------------------------------
-- business_members
-- -----------------------------------------------------------------------
create policy business_members_select_member on business_members for select
  using (is_business_member(business_id) or user_id = auth.uid());

create policy business_members_update_owner_admin on business_members for update
  using (
    has_business_role(business_id, array['owner','admin'])
    -- admins may not edit the owner row or grant/claim ownership themselves
    and (role <> 'owner' or is_business_owner(business_id))
  )
  with check (
    role in ('owner','admin','staff')
    and (role <> 'owner' or is_business_owner(business_id))
  );

create policy business_members_delete_owner on business_members for delete
  using (is_business_owner(business_id) and role <> 'owner');

-- Insert restricted to the create_business_workspace()/invitation-accept
-- flow (SECURITY DEFINER functions) — no open insert policy.

-- -----------------------------------------------------------------------
-- services
-- -----------------------------------------------------------------------
create policy services_select_public on services for select
  using (active = true and public_visible = true);

create policy services_select_member on services for select
  using (is_business_member(business_id));

create policy services_write_owner_admin on services for all
  using (has_business_role(business_id, array['owner','admin']))
  with check (has_business_role(business_id, array['owner','admin']));

-- -----------------------------------------------------------------------
-- staff_services
-- -----------------------------------------------------------------------
create policy staff_services_select_member on staff_services for select
  using (is_business_member(business_id));

create policy staff_services_write_owner_admin on staff_services for all
  using (has_business_role(business_id, array['owner','admin']))
  with check (has_business_role(business_id, array['owner','admin']));

-- -----------------------------------------------------------------------
-- availability_rules / blocked_times
-- -----------------------------------------------------------------------
create policy availability_select_member on availability_rules for select
  using (is_business_member(business_id));

create policy availability_write_owner_admin on availability_rules for all
  using (has_business_role(business_id, array['owner','admin']))
  with check (has_business_role(business_id, array['owner','admin']));

create policy availability_write_self on availability_rules for all
  using (member_id = my_member_id(business_id))
  with check (member_id = my_member_id(business_id));

create policy blocked_times_select_member on blocked_times for select
  using (is_business_member(business_id));

create policy blocked_times_write_owner_admin on blocked_times for all
  using (has_business_role(business_id, array['owner','admin']))
  with check (has_business_role(business_id, array['owner','admin']));

create policy blocked_times_write_self on blocked_times for all
  using (member_id = my_member_id(business_id))
  with check (member_id = my_member_id(business_id));

-- -----------------------------------------------------------------------
-- customers — no direct broad access for anon; guest bookings are created
-- only via the create-public-booking Edge Function (service-role context).
-- -----------------------------------------------------------------------
create policy customers_select_owner_admin on customers for select
  using (has_business_role(business_id, array['owner','admin']));

create policy customers_select_staff_assigned on customers for select
  using (
    has_business_role(business_id, array['staff'])
    and exists (
      select 1 from appointments a
      where a.customer_id = customers.id and a.staff_member_id = my_member_id(business_id)
    )
  );

create policy customers_select_own on customers for select
  using (auth_user_id = auth.uid());

create policy customers_write_owner_admin on customers for all
  using (has_business_role(business_id, array['owner','admin']))
  with check (has_business_role(business_id, array['owner','admin']));

create policy customers_update_own on customers for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- -----------------------------------------------------------------------
-- appointments — deliberately NOT `using (true)` for any authenticated
-- policy (spec section 52).
-- -----------------------------------------------------------------------
create policy appointments_select_owner_admin on appointments for select
  using (has_business_role(business_id, array['owner','admin']));

create policy appointments_select_staff_assigned on appointments for select
  using (has_business_role(business_id, array['staff']) and staff_member_id = my_member_id(business_id));

create policy appointments_select_own_customer on appointments for select
  using (is_own_customer(customer_id));

create policy appointments_write_owner_admin on appointments for all
  using (has_business_role(business_id, array['owner','admin']))
  with check (has_business_role(business_id, array['owner','admin']));

-- Staff may update only operational fields (status, internal_note) on their
-- own assigned appointments — enforced by application code calling the
-- update_appointment_status() RPC; the broad UPDATE below is intentionally
-- limited to rows they own so a compromised client still cannot touch
-- another staff member's schedule.
create policy appointments_update_staff_assigned on appointments for update
  using (has_business_role(business_id, array['staff']) and staff_member_id = my_member_id(business_id))
  with check (has_business_role(business_id, array['staff']) and staff_member_id = my_member_id(business_id));

-- Customers may cancel (update status only, via RPC) their own upcoming
-- appointment; direct table UPDATE is intentionally not granted to
-- customers — see cancel_own_appointment() in 004_functions_triggers.sql.

-- Direct INSERT for appointments is not granted to anon/authenticated —
-- all booking paths go through create-public-booking (Edge Function) or
-- create_authenticated_booking()/create_admin_booking() (RPCs) so price,
-- duration and overlap are always computed/checked server-side.

-- -----------------------------------------------------------------------
-- appointment_activity
-- -----------------------------------------------------------------------
create policy appointment_activity_select on appointment_activity for select
  using (
    has_business_role(business_id, array['owner','admin'])
    or (has_business_role(business_id, array['staff']) and exists (
      select 1 from appointments a where a.id = appointment_activity.appointment_id and a.staff_member_id = my_member_id(business_id)
    ))
    or exists (
      select 1 from appointments a where a.id = appointment_activity.appointment_id and is_own_customer(a.customer_id)
    )
  );

-- inserts happen only via SECURITY DEFINER functions/triggers

-- -----------------------------------------------------------------------
-- invoices / invoice_items / payments — owner/admin full access; staff has
-- no financial access by default (spec section 54); customers see only
-- their own.
-- -----------------------------------------------------------------------
create policy invoices_select_owner_admin on invoices for select
  using (has_business_role(business_id, array['owner','admin']));

create policy invoices_select_own_customer on invoices for select
  using (is_own_customer(customer_id));

create policy invoices_write_owner_admin on invoices for all
  using (has_business_role(business_id, array['owner','admin']))
  with check (has_business_role(business_id, array['owner','admin']));

create policy invoice_items_select on invoice_items for select
  using (exists (
    select 1 from invoices i where i.id = invoice_items.invoice_id
      and (has_business_role(i.business_id, array['owner','admin']) or is_own_customer(i.customer_id))
  ));

create policy invoice_items_write_owner_admin on invoice_items for all
  using (exists (select 1 from invoices i where i.id = invoice_items.invoice_id and has_business_role(i.business_id, array['owner','admin'])))
  with check (exists (select 1 from invoices i where i.id = invoice_items.invoice_id and has_business_role(i.business_id, array['owner','admin'])));

create policy payments_select_owner_admin on payments for select
  using (has_business_role(business_id, array['owner','admin']));

create policy payments_select_own_customer on payments for select
  using (is_own_customer(customer_id));

create policy payments_write_owner_admin on payments for all
  using (has_business_role(business_id, array['owner','admin']))
  with check (has_business_role(business_id, array['owner','admin']));

-- -----------------------------------------------------------------------
-- notifications — per-user (or business-wide broadcast where user_id null)
-- -----------------------------------------------------------------------
create policy notifications_select_own on notifications for select
  using (user_id = auth.uid() or (user_id is null and is_business_member(business_id)));

create policy notifications_update_own on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- membership_invitations
-- -----------------------------------------------------------------------
create policy membership_invitations_select_owner_admin on membership_invitations for select
  using (has_business_role(business_id, array['owner','admin']));

create policy membership_invitations_write_owner_admin on membership_invitations for all
  using (has_business_role(business_id, array['owner','admin']))
  with check (has_business_role(business_id, array['owner','admin']));
