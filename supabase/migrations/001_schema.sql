-- =============================================================================
-- ServiceFlow — 001_schema.sql
-- Core tables. Run in order 001 -> 005 against a fresh Supabase project.
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist"; -- required for the tstzrange exclusion constraint

-- -----------------------------------------------------------------------
-- profiles: one row per auth.users row, created automatically by trigger
-- (see 004_functions_triggers.sql, handle_new_user).
-- -----------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- businesses
-- -----------------------------------------------------------------------
create table if not exists businesses (
  id                          uuid primary key default gen_random_uuid(),
  owner_user_id               uuid not null references auth.users(id),
  name                        text not null,
  slug                        text not null unique,
  business_type               text not null default 'other',
  phone                       text,
  email                       text,
  address                     text,
  timezone                    text not null default 'UTC',
  currency                    text not null default 'USD',
  brand_color                 text not null default '#3a63f0',
  logo_url                    text,
  active                      boolean not null default true,
  -- booking settings (kept on businesses per spec section 47 "prefer the
  -- simplest approach" rather than a separate 1:1 settings table)
  booking_lead_time_minutes   integer not null default 60,
  cancellation_window_hours   integer not null default 12,
  slot_interval_minutes       integer not null default 30,
  requires_approval           boolean not null default false,
  customer_can_choose_staff   boolean not null default true,
  tax_rate_percent            numeric(5,2) not null default 0,
  invoice_due_days            integer not null default 7,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- business_members (workspace membership / roles)
-- -----------------------------------------------------------------------
create table if not exists business_members (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'staff',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (business_id, user_id)
);

-- -----------------------------------------------------------------------
-- services
-- -----------------------------------------------------------------------
create table if not exists services (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references businesses(id) on delete cascade,
  name                   text not null,
  category               text,
  description            text,
  duration_minutes       integer not null,
  price                  numeric(10,2) not null,
  buffer_before_minutes  integer not null default 0,
  buffer_after_minutes   integer not null default 0,
  color                  text not null default '#3a63f0',
  active                 boolean not null default true,
  public_visible         boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- staff_services (which staff can perform which service, optional overrides)
-- -----------------------------------------------------------------------
create table if not exists staff_services (
  id                       uuid primary key default gen_random_uuid(),
  business_id              uuid not null references businesses(id) on delete cascade,
  member_id                uuid not null references business_members(id) on delete cascade,
  service_id               uuid not null references services(id) on delete cascade,
  custom_duration_minutes  integer,
  custom_price             numeric(10,2),
  created_at               timestamptz not null default now(),
  unique (member_id, service_id)
);

-- -----------------------------------------------------------------------
-- availability_rules (recurring weekly working windows per staff member)
-- -----------------------------------------------------------------------
create table if not exists availability_rules (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  member_id    uuid not null references business_members(id) on delete cascade,
  weekday      integer not null,
  start_time   time not null,
  end_time     time not null,
  active       boolean not null default true
);

-- -----------------------------------------------------------------------
-- blocked_times (one-off blocks: vacation, break, training, maintenance)
-- -----------------------------------------------------------------------
create table if not exists blocked_times (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  member_id    uuid not null references business_members(id) on delete cascade,
  start_at     timestamptz not null,
  end_at       timestamptz not null,
  reason       text,
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- customers (business-scoped; may optionally be linked to an auth user)
-- -----------------------------------------------------------------------
create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  auth_user_id  uuid references auth.users(id),
  full_name     text not null,
  email         text,
  phone         text,
  notes         text default '',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- appointments
-- -----------------------------------------------------------------------
create table if not exists appointments (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses(id) on delete cascade,
  booking_code      text not null unique,
  customer_id       uuid not null references customers(id),
  service_id        uuid not null references services(id),
  staff_member_id   uuid not null references business_members(id),
  start_at          timestamptz not null,
  end_at            timestamptz not null,
  status            text not null default 'pending',
  payment_status    text not null default 'unpaid',
  customer_note     text default '',
  internal_note     text default '',
  source            text not null default 'admin',
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Core double-booking protection (spec section 14): no two blocking
  -- appointments for the same staff member may overlap in time. Cancelled/
  -- no-show/completed appointments are excluded via the WHERE clause so
  -- they never block a slot once they're no longer "active".
  constraint appointments_no_overlap
    exclude using gist (
      staff_member_id with =,
      tstzrange(start_at, end_at, '[)') with &&
    )
    where (status in ('pending','confirmed','checked_in','in_progress'))
);

-- -----------------------------------------------------------------------
-- appointment_activity (timeline)
-- -----------------------------------------------------------------------
create table if not exists appointment_activity (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  appointment_id  uuid not null references appointments(id) on delete cascade,
  actor_user_id   uuid references auth.users(id),
  event_type      text not null,
  message         text not null,
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- invoices
-- -----------------------------------------------------------------------
create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  appointment_id  uuid references appointments(id),
  customer_id     uuid not null references customers(id),
  invoice_number  text not null,
  status          text not null default 'draft',
  subtotal        numeric(10,2) not null default 0,
  tax_amount      numeric(10,2) not null default 0,
  total           numeric(10,2) not null default 0,
  amount_paid     numeric(10,2) not null default 0,
  balance         numeric(10,2) not null default 0,
  issued_at       timestamptz,
  due_date        date,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (business_id, invoice_number)
);

-- -----------------------------------------------------------------------
-- invoice_items
-- -----------------------------------------------------------------------
create table if not exists invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references invoices(id) on delete cascade,
  description  text not null,
  quantity     numeric(10,2) not null default 1,
  unit_price   numeric(10,2) not null default 0,
  line_total   numeric(10,2) not null default 0,
  sort_order   integer not null default 0
);

-- -----------------------------------------------------------------------
-- payments (simulation only — never real card data, see spec section 27/87)
-- -----------------------------------------------------------------------
create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  invoice_id      uuid references invoices(id),
  appointment_id  uuid references appointments(id),
  customer_id     uuid not null references customers(id),
  amount          numeric(10,2) not null,
  method          text not null,
  status          text not null default 'pending',
  reference       text,
  paid_at         timestamptz,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  user_id      uuid references auth.users(id),
  customer_id  uuid references customers(id),
  type         text not null,
  title        text not null,
  message      text not null,
  entity_type  text,
  entity_id    uuid,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- membership_invitations (safe, manual-workflow staff invites — spec 23)
-- -----------------------------------------------------------------------
create table if not exists membership_invitations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  email        text not null,
  role         text not null default 'staff',
  status       text not null default 'pending',
  created_at   timestamptz not null default now()
);
