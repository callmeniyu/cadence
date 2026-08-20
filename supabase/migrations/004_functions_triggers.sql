-- =============================================================================
-- ServiceFlow — 004_functions_triggers.sql
-- Business logic that must not be trusted to the browser: workspace/owner
-- creation, booking codes, invoice numbering, atomic booking + overlap
-- handling, status transitions, and simulated payments.
-- =============================================================================

-- -----------------------------------------------------------------------
-- updated_at bookkeeping
-- -----------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  perform 1;
end $$;

create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger trg_businesses_updated before update on businesses for each row execute function set_updated_at();
create trigger trg_services_updated before update on services for each row execute function set_updated_at();
create trigger trg_customers_updated before update on customers for each row execute function set_updated_at();
create trigger trg_appointments_updated before update on appointments for each row execute function set_updated_at();
create trigger trg_invoices_updated before update on invoices for each row execute function set_updated_at();

-- -----------------------------------------------------------------------
-- handle_new_user: auto-create a profiles row when a Supabase Auth user
-- signs up (spec section 9). SECURITY DEFINER because auth.users triggers
-- run outside the new user's own RLS context.
-- -----------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- -----------------------------------------------------------------------
-- booking code / invoice number generators
-- -----------------------------------------------------------------------
create or replace function generate_booking_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no ambiguous chars
  code text;
  i int;
  attempt int := 0;
begin
  loop
    code := 'SF-';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from appointments where booking_code = code);
    attempt := attempt + 1;
    if attempt > 20 then
      raise exception 'Could not generate a unique booking code';
    end if;
  end loop;
  return code;
end;
$$;

create or replace function next_invoice_number(p_business_id uuid)
returns text language plpgsql as $$
declare
  yr text := to_char(now(), 'YYYY');
  seq int;
begin
  select count(*) + 1 into seq
  from invoices
  where business_id = p_business_id and invoice_number like ('INV-' || yr || '-%');
  return 'INV-' || yr || '-' || lpad(seq::text, 5, '0');
end;
$$;

-- -----------------------------------------------------------------------
-- create_business_workspace: the only way a business + owner membership
-- may be created. Runs as the caller (auth.uid()) — a user can never pass
-- another user's id and make them owner (spec section 57).
-- -----------------------------------------------------------------------
create or replace function create_business_workspace(
  p_name text, p_slug text, p_business_type text, p_phone text,
  p_email text, p_address text, p_timezone text, p_currency text
) returns businesses
language plpgsql security definer set search_path = public as $$
declare
  v_business businesses;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into businesses (owner_user_id, name, slug, business_type, phone, email, address, timezone, currency)
  values (auth.uid(), p_name, p_slug, p_business_type, p_phone, p_email, p_address, p_timezone, p_currency)
  returning * into v_business;

  insert into business_members (business_id, user_id, role, active)
  values (v_business.id, auth.uid(), 'owner', true);

  return v_business;
end;
$$;

grant execute on function create_business_workspace to authenticated;

-- -----------------------------------------------------------------------
-- create_authenticated_booking / create_admin_booking: the atomic,
-- authoritative booking path (spec sections 55-56). Price/duration are
-- always re-read from `services`, never trusted from the caller, and the
-- appointments_no_overlap exclusion constraint (001_schema.sql) makes the
-- final overlap decision atomically at insert time.
-- -----------------------------------------------------------------------
create or replace function create_authenticated_booking(
  p_business_id uuid, p_service_id uuid, p_staff_member_id uuid,
  p_start_at timestamptz, p_customer_note text, p_source text
) returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_service services;
  v_business businesses;
  v_customer customers;
  v_staff_id uuid := p_staff_member_id;
  v_end timestamptz;
  v_status text;
  v_appt appointments;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_service from services where id = p_service_id and business_id = p_business_id and active;
  if not found then raise exception 'This service is no longer available.'; end if;

  select * into v_business from businesses where id = p_business_id and active;
  if not found then raise exception 'This business is not available.'; end if;

  if v_staff_id is null then
    select member_id into v_staff_id from staff_services
    where business_id = p_business_id and service_id = p_service_id limit 1;
  end if;
  if v_staff_id is null then raise exception 'No staff can currently perform this service.'; end if;

  v_end := p_start_at + make_interval(mins => v_service.duration_minutes);

  select * into v_customer from customers where business_id = p_business_id and auth_user_id = auth.uid();
  if not found then
    insert into customers (business_id, auth_user_id, full_name, email, phone)
    select p_business_id, auth.uid(), coalesce(p.full_name, ''), u.email, coalesce(p.phone, '')
    from auth.users u left join profiles p on p.id = u.id
    where u.id = auth.uid()
    returning * into v_customer;
  end if;

  v_status := case when v_business.requires_approval then 'pending' else 'confirmed' end;

  insert into appointments (business_id, booking_code, customer_id, service_id, staff_member_id, start_at, end_at, status, customer_note, source, created_by)
  values (p_business_id, generate_booking_code(), v_customer.id, p_service_id, v_staff_id, p_start_at, v_end, v_status, p_customer_note, p_source, auth.uid())
  returning * into v_appt;

  insert into appointment_activity (business_id, appointment_id, actor_user_id, event_type, message)
  values (p_business_id, v_appt.id, auth.uid(), 'created', 'Booking created (' || replace(p_source, '_', ' ') || ').');

  insert into notifications (business_id, user_id, type, title, message, entity_type, entity_id)
  select p_business_id, bm.user_id, 'booking_created', 'New booking',
         v_customer.full_name || ' booked ' || v_service.name || '.', 'appointment', v_appt.id
  from business_members bm where bm.business_id = p_business_id and bm.role = 'owner';

  return v_appt;
exception
  when exclusion_violation then
    raise exception 'That time slot is no longer available. Please choose another time.';
end;
$$;

grant execute on function create_authenticated_booking to authenticated;

create or replace function create_admin_booking(
  p_business_id uuid, p_service_id uuid, p_staff_member_id uuid, p_start_at timestamptz,
  p_customer_full_name text, p_customer_email text, p_customer_phone text, p_customer_note text
) returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_service services;
  v_customer customers;
  v_end timestamptz;
  v_appt appointments;
begin
  if not has_business_role(p_business_id, array['owner','admin']) then
    raise exception 'You do not have permission to perform this action.';
  end if;

  select * into v_service from services where id = p_service_id and business_id = p_business_id;
  if not found then raise exception 'Service not found.'; end if;
  v_end := p_start_at + make_interval(mins => v_service.duration_minutes);

  select * into v_customer from customers where business_id = p_business_id and lower(email) = lower(p_customer_email);
  if not found then
    insert into customers (business_id, full_name, email, phone)
    values (p_business_id, p_customer_full_name, p_customer_email, p_customer_phone)
    returning * into v_customer;
  end if;

  insert into appointments (business_id, booking_code, customer_id, service_id, staff_member_id, start_at, end_at, status, customer_note, source, created_by)
  values (p_business_id, generate_booking_code(), v_customer.id, p_service_id, p_staff_member_id, p_start_at, v_end, 'confirmed', p_customer_note, 'admin', auth.uid())
  returning * into v_appt;

  insert into appointment_activity (business_id, appointment_id, actor_user_id, event_type, message)
  values (p_business_id, v_appt.id, auth.uid(), 'created', 'Booking created by staff.');

  return v_appt;
exception
  when exclusion_violation then
    raise exception 'That time slot is no longer available. Please choose another time.';
end;
$$;

grant execute on function create_admin_booking to authenticated;

-- -----------------------------------------------------------------------
-- update_appointment_status: validates the transition centrally so the
-- allowed-transition map in constants/status.js and the DB never drift.
-- -----------------------------------------------------------------------
create or replace function update_appointment_status(p_appointment_id uuid, p_status text)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_appt appointments;
  v_allowed boolean;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if not found then raise exception 'Appointment not found.'; end if;

  if not (
    has_business_role(v_appt.business_id, array['owner','admin'])
    or (has_business_role(v_appt.business_id, array['staff']) and v_appt.staff_member_id = my_member_id(v_appt.business_id))
  ) then
    raise exception 'You do not have permission to perform this action.';
  end if;

  v_allowed := case v_appt.status
    when 'pending' then p_status in ('confirmed','cancelled')
    when 'confirmed' then p_status in ('checked_in','cancelled','no_show')
    when 'checked_in' then p_status in ('in_progress','cancelled')
    when 'in_progress' then p_status in ('completed','cancelled')
    else false
  end;
  if not v_allowed then
    raise exception 'That status change is not allowed from the current status.';
  end if;

  update appointments set status = p_status where id = p_appointment_id returning * into v_appt;

  insert into appointment_activity (business_id, appointment_id, actor_user_id, event_type, message)
  values (v_appt.business_id, v_appt.id, auth.uid(), 'status_changed', 'Status changed to ' || replace(p_status, '_', ' ') || '.');

  if p_status = 'cancelled' then
    insert into notifications (business_id, user_id, type, title, message, entity_type, entity_id)
    select v_appt.business_id, bm.user_id, 'booking_cancelled', 'Booking cancelled',
           'Appointment ' || v_appt.booking_code || ' was cancelled.', 'appointment', v_appt.id
    from business_members bm where bm.business_id = v_appt.business_id and bm.role = 'owner';
  end if;

  return v_appt;
end;
$$;

grant execute on function update_appointment_status to authenticated;

-- Customers may cancel only their own appointment, only within policy.
create or replace function cancel_own_appointment(p_appointment_id uuid)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_appt appointments;
  v_business businesses;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if not found or not is_own_customer(v_appt.customer_id) then
    raise exception 'You do not have permission to perform this action.';
  end if;
  select * into v_business from businesses where id = v_appt.business_id;
  if v_appt.start_at < now() + make_interval(hours => v_business.cancellation_window_hours) then
    raise exception 'This appointment is inside the cancellation window and can no longer be cancelled online.';
  end if;

  update appointments set status = 'cancelled' where id = p_appointment_id returning * into v_appt;
  insert into appointment_activity (business_id, appointment_id, actor_user_id, event_type, message)
  values (v_appt.business_id, v_appt.id, auth.uid(), 'status_changed', 'Cancelled by customer.');
  return v_appt;
end;
$$;

grant execute on function cancel_own_appointment to authenticated;

-- -----------------------------------------------------------------------
-- Invoicing: totals are always (re)computed here, never trusted from the
-- browser (spec section 25/58).
-- -----------------------------------------------------------------------
create or replace function create_invoice_from_appointment(p_appointment_id uuid)
returns invoices
language plpgsql security definer set search_path = public as $$
declare
  v_appt appointments;
  v_service services;
  v_business businesses;
  v_subtotal numeric(10,2);
  v_tax numeric(10,2);
  v_invoice invoices;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if not found or not has_business_role(v_appt.business_id, array['owner','admin']) then
    raise exception 'You do not have permission to perform this action.';
  end if;
  select * into v_service from services where id = v_appt.service_id;
  select * into v_business from businesses where id = v_appt.business_id;

  v_subtotal := v_service.price;
  v_tax := round(v_subtotal * v_business.tax_rate_percent / 100, 2);

  insert into invoices (business_id, appointment_id, customer_id, invoice_number, status, subtotal, tax_amount, total, amount_paid, balance)
  values (v_appt.business_id, v_appt.id, v_appt.customer_id, next_invoice_number(v_appt.business_id), 'draft', v_subtotal, v_tax, v_subtotal + v_tax, 0, v_subtotal + v_tax)
  returning * into v_invoice;

  insert into invoice_items (invoice_id, description, quantity, unit_price, line_total, sort_order)
  values (v_invoice.id, v_service.name, 1, v_subtotal, v_subtotal, 0);

  return v_invoice;
end;
$$;

grant execute on function create_invoice_from_appointment to authenticated;

create or replace function update_draft_invoice(p_invoice_id uuid, p_items jsonb, p_tax_rate_percent numeric)
returns invoices
language plpgsql security definer set search_path = public as $$
declare
  v_invoice invoices;
  v_subtotal numeric(10,2) := 0;
  v_item jsonb;
  v_line numeric(10,2);
  v_idx int := 0;
begin
  select * into v_invoice from invoices where id = p_invoice_id;
  if not found or not has_business_role(v_invoice.business_id, array['owner','admin']) then
    raise exception 'You do not have permission to perform this action.';
  end if;
  if v_invoice.status <> 'draft' then
    raise exception 'Only draft invoices can be edited.';
  end if;

  delete from invoice_items where invoice_id = p_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_line := round((v_item->>'quantity')::numeric * (v_item->>'unitPrice')::numeric, 2);
    v_subtotal := v_subtotal + v_line;
    insert into invoice_items (invoice_id, description, quantity, unit_price, line_total, sort_order)
    values (p_invoice_id, v_item->>'description', (v_item->>'quantity')::numeric, (v_item->>'unitPrice')::numeric, v_line, v_idx);
    v_idx := v_idx + 1;
  end loop;

  update invoices set
    subtotal = v_subtotal,
    tax_amount = round(v_subtotal * p_tax_rate_percent / 100, 2),
    total = v_subtotal + round(v_subtotal * p_tax_rate_percent / 100, 2),
    balance = (v_subtotal + round(v_subtotal * p_tax_rate_percent / 100, 2)) - amount_paid
  where id = p_invoice_id
  returning * into v_invoice;

  return v_invoice;
end;
$$;

grant execute on function update_draft_invoice to authenticated;

create or replace function issue_invoice(p_invoice_id uuid)
returns invoices
language plpgsql security definer set search_path = public as $$
declare
  v_invoice invoices;
  v_business businesses;
begin
  select * into v_invoice from invoices where id = p_invoice_id;
  if not found or not has_business_role(v_invoice.business_id, array['owner','admin']) then
    raise exception 'You do not have permission to perform this action.';
  end if;
  select * into v_business from businesses where id = v_invoice.business_id;

  update invoices set status = 'issued', issued_at = now(), due_date = (now() + make_interval(days => v_business.invoice_due_days))::date
  where id = p_invoice_id returning * into v_invoice;

  insert into notifications (business_id, user_id, type, title, message, entity_type, entity_id)
  select v_invoice.business_id, bm.user_id, 'invoice_issued', 'Invoice issued',
         'Invoice ' || v_invoice.invoice_number || ' was issued.', 'invoice', v_invoice.id
  from business_members bm where bm.business_id = v_invoice.business_id and bm.role = 'owner';

  return v_invoice;
end;
$$;

grant execute on function issue_invoice to authenticated;

-- -----------------------------------------------------------------------
-- record_simulated_payment: the only way payments/invoice balances can be
-- written. Never collects or stores real card data (spec section 27/87).
-- -----------------------------------------------------------------------
create or replace function record_simulated_payment(
  p_business_id uuid, p_invoice_id uuid, p_appointment_id uuid,
  p_customer_id uuid, p_amount numeric, p_method text, p_outcome text
) returns payments
language plpgsql security definer set search_path = public as $$
declare
  v_payment payments;
  v_invoice invoices;
  v_status text := case when p_outcome = 'fail' then 'failed' else 'successful' end;
  v_new_paid numeric(10,2);
  v_new_balance numeric(10,2);
  v_new_status text;
begin
  if not has_business_role(p_business_id, array['owner','admin']) then
    raise exception 'You do not have permission to perform this action.';
  end if;
  if p_method not in ('cash','demo_card','bank_transfer','wallet') then
    raise exception 'Invalid payment method.';
  end if;

  insert into payments (business_id, invoice_id, appointment_id, customer_id, amount, method, status, reference, paid_at, created_by)
  values (p_business_id, p_invoice_id, p_appointment_id, p_customer_id, p_amount, p_method, v_status,
          'SIM-' || upper(substr(md5(random()::text), 1, 8)),
          case when v_status = 'successful' then now() else null end, auth.uid())
  returning * into v_payment;

  if v_status = 'successful' and p_invoice_id is not null then
    select * into v_invoice from invoices where id = p_invoice_id;
    v_new_paid := v_invoice.amount_paid + p_amount;
    v_new_balance := greatest(v_invoice.total - v_new_paid, 0);
    v_new_status := case when v_new_balance <= 0 then 'paid' else 'partially_paid' end;

    update invoices set amount_paid = v_new_paid, balance = v_new_balance, status = v_new_status,
      paid_at = case when v_new_balance <= 0 then now() else paid_at end
    where id = p_invoice_id;

    if v_invoice.appointment_id is not null then
      update appointments set payment_status = v_new_status where id = v_invoice.appointment_id;
    end if;

    insert into notifications (business_id, user_id, type, title, message, entity_type, entity_id)
    select p_business_id, bm.user_id, 'payment_recorded', 'Payment recorded',
           'A payment was recorded for invoice ' || v_invoice.invoice_number || '.', 'payment', v_payment.id
    from business_members bm where bm.business_id = p_business_id and bm.role = 'owner';
  elsif v_status = 'successful' and p_appointment_id is not null then
    update appointments set payment_status = 'paid' where id = p_appointment_id;
  end if;

  return v_payment;
end;
$$;

grant execute on function record_simulated_payment to authenticated;

-- -----------------------------------------------------------------------
-- Reporting RPCs (aggregate server-side rather than shipping full tables
-- to the browser — spec section 79/91).
-- -----------------------------------------------------------------------
create or replace function get_dashboard_kpis(p_business_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  if not is_business_member(p_business_id) then
    raise exception 'You do not have permission to perform this action.';
  end if;

  select jsonb_build_object(
    'appointmentsToday', (select count(*) from appointments where business_id = p_business_id and start_at::date = now()::date),
    'upcomingAppointments', (select count(*) from appointments where business_id = p_business_id and start_at > now() and status in ('pending','confirmed','checked_in','in_progress')),
    'newCustomersThisMonth', (select count(*) from customers where business_id = p_business_id and created_at >= date_trunc('month', now())),
    'monthlyRevenue', (select coalesce(sum(amount_paid), 0) from invoices where business_id = p_business_id and paid_at >= date_trunc('month', now())),
    'outstandingAmount', (select coalesce(sum(balance), 0) from invoices where business_id = p_business_id and status <> 'void'),
    'completionRate', (
      select case when count(*) filter (where status <> 'cancelled') = 0 then 0
        else 100.0 * count(*) filter (where status = 'completed') / count(*) filter (where status <> 'cancelled') end
      from appointments where business_id = p_business_id
    ),
    'noShowRate', (
      select case when count(*) filter (where status in ('completed','no_show')) = 0 then 0
        else 100.0 * count(*) filter (where status = 'no_show') / count(*) filter (where status in ('completed','no_show')) end
      from appointments where business_id = p_business_id
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function get_dashboard_kpis to authenticated;

create or replace function get_revenue_series(p_business_id uuid, p_days int)
returns table(date date, revenue numeric)
language sql stable security definer set search_path = public as $$
  select d::date, coalesce(sum(i.amount_paid), 0)
  from generate_series(now()::date - (p_days - 1), now()::date, interval '1 day') d
  left join invoices i on i.business_id = p_business_id and i.paid_at::date = d::date
  where is_business_member(p_business_id)
  group by d order by d;
$$;

grant execute on function get_revenue_series to authenticated;

create or replace function get_bookings_series(p_business_id uuid, p_days int)
returns table(date date, bookings bigint)
language sql stable security definer set search_path = public as $$
  select d::date, count(a.id)
  from generate_series(now()::date - (p_days - 1), now()::date, interval '1 day') d
  left join appointments a on a.business_id = p_business_id and a.created_at::date = d::date
  where is_business_member(p_business_id)
  group by d order by d;
$$;

grant execute on function get_bookings_series to authenticated;

create or replace function get_service_popularity(p_business_id uuid)
returns table(name text, count bigint)
language sql stable security definer set search_path = public as $$
  select s.name, count(a.id)
  from services s
  join appointments a on a.service_id = s.id and a.status <> 'cancelled'
  where s.business_id = p_business_id and is_business_member(p_business_id)
  group by s.name order by count(a.id) desc;
$$;

grant execute on function get_service_popularity to authenticated;

create or replace function get_staff_workload(p_business_id uuid)
returns table(name text, count bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(p.full_name, 'Unknown'), count(a.id)
  from business_members bm
  join profiles p on p.id = bm.user_id
  left join appointments a on a.staff_member_id = bm.id and a.status <> 'cancelled'
  where bm.business_id = p_business_id and is_business_member(p_business_id)
  group by p.full_name;
$$;

grant execute on function get_staff_workload to authenticated;

create or replace function get_new_customers_series(p_business_id uuid, p_days int)
returns table(date date, customers bigint)
language sql stable security definer set search_path = public as $$
  select d::date, count(c.id)
  from generate_series(now()::date - (p_days - 1), now()::date, interval '1 day') d
  left join customers c on c.business_id = p_business_id and c.created_at::date = d::date
  where is_business_member(p_business_id)
  group by d order by d;
$$;

grant execute on function get_new_customers_series to authenticated;
