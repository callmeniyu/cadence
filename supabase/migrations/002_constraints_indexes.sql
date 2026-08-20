-- =============================================================================
-- ServiceFlow — 002_constraints_indexes.sql
-- CHECK constraints for enum-like columns + invariants, and indexes for the
-- query patterns the app actually uses (spec section 48/80).
-- =============================================================================

-- ---- businesses ----
alter table businesses
  add constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint businesses_lead_time_nonneg check (booking_lead_time_minutes >= 0),
  add constraint businesses_cancel_window_nonneg check (cancellation_window_hours >= 0),
  add constraint businesses_slot_interval_positive check (slot_interval_minutes > 0),
  add constraint businesses_tax_rate_range check (tax_rate_percent >= 0 and tax_rate_percent <= 100),
  add constraint businesses_invoice_due_days_nonneg check (invoice_due_days >= 0);

-- ---- business_members ----
alter table business_members
  add constraint business_members_role_valid check (role in ('owner','admin','staff'));

create unique index if not exists business_members_one_owner_per_business
  on business_members (business_id)
  where role = 'owner' and active = true;

-- ---- services ----
alter table services
  add constraint services_duration_positive check (duration_minutes > 0),
  add constraint services_price_nonneg check (price >= 0),
  add constraint services_buffers_nonneg check (buffer_before_minutes >= 0 and buffer_after_minutes >= 0);

create index if not exists services_business_active_idx on services (business_id, active);

-- ---- staff_services ----
alter table staff_services
  add constraint staff_services_custom_duration_positive check (custom_duration_minutes is null or custom_duration_minutes > 0),
  add constraint staff_services_custom_price_nonneg check (custom_price is null or custom_price >= 0);

-- ---- availability_rules ----
alter table availability_rules
  add constraint availability_weekday_range check (weekday between 0 and 6),
  add constraint availability_end_after_start check (end_time > start_time);

create index if not exists availability_member_weekday_idx on availability_rules (member_id, weekday);

-- ---- blocked_times ----
alter table blocked_times
  add constraint blocked_times_end_after_start check (end_at > start_at);

create index if not exists blocked_times_member_idx on blocked_times (member_id, start_at);

-- ---- customers ----
create index if not exists customers_business_idx on customers (business_id);
create index if not exists customers_business_email_idx on customers (business_id, lower(email));
create index if not exists customers_auth_user_idx on customers (auth_user_id);

-- ---- appointments ----
alter table appointments
  add constraint appointments_status_valid check (status in ('pending','confirmed','checked_in','in_progress','completed','cancelled','no_show')),
  add constraint appointments_payment_status_valid check (payment_status in ('unpaid','partially_paid','paid','refunded')),
  add constraint appointments_source_valid check (source in ('public_booking','admin','customer_portal')),
  add constraint appointments_end_after_start check (end_at > start_at),
  add constraint appointments_booking_code_format check (booking_code ~ '^SF-[A-Z0-9]{4,10}$');

create index if not exists appointments_business_start_idx on appointments (business_id, start_at);
create index if not exists appointments_staff_start_idx on appointments (staff_member_id, start_at);
create index if not exists appointments_customer_idx on appointments (customer_id);
create index if not exists appointments_status_idx on appointments (business_id, status);
create index if not exists appointments_booking_code_idx on appointments (booking_code);

-- ---- appointment_activity ----
create index if not exists appointment_activity_appt_idx on appointment_activity (appointment_id, created_at desc);

-- ---- invoices ----
alter table invoices
  add constraint invoices_status_valid check (status in ('draft','issued','partially_paid','paid','void','overdue')),
  add constraint invoices_amounts_nonneg check (subtotal >= 0 and tax_amount >= 0 and total >= 0 and amount_paid >= 0),
  add constraint invoices_balance_consistent check (balance = total - amount_paid or status = 'void');

create index if not exists invoices_business_status_idx on invoices (business_id, status);
create index if not exists invoices_customer_idx on invoices (customer_id);

-- ---- invoice_items ----
alter table invoice_items
  add constraint invoice_items_qty_positive check (quantity > 0),
  add constraint invoice_items_unit_price_nonneg check (unit_price >= 0);

-- ---- payments ----
alter table payments
  add constraint payments_method_valid check (method in ('cash','demo_card','bank_transfer','wallet')),
  add constraint payments_status_valid check (status in ('pending','successful','failed','refunded')),
  add constraint payments_amount_nonneg check (amount >= 0);

create index if not exists payments_business_idx on payments (business_id, created_at desc);
create index if not exists payments_invoice_idx on payments (invoice_id);

-- ---- notifications ----
create index if not exists notifications_business_user_unread_idx on notifications (business_id, user_id, read_at);

-- ---- membership_invitations ----
alter table membership_invitations
  add constraint membership_invitations_role_valid check (role in ('owner','admin','staff')),
  add constraint membership_invitations_status_valid check (status in ('pending','accepted','revoked'));
