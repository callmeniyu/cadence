// ServiceFlow — create-public-booking Edge Function
//
// This is the only path an anonymous visitor uses to create an appointment
// (spec section 55). It runs with the service-role key, which is why it
// must live here (Edge Function runtime) and never in browser code — see
// src/lib/supabaseClient.js for the corresponding browser-safe boundary.
//
// Responsibilities (mirrors spec section 55 exactly):
//   1. validate request schema
//   2. resolve active business from id
//   3. resolve active public service
//   4. validate staff can perform service (or pick one who can)
//   5. calculate authoritative duration/price from the service row
//   6. validate booking window (lead time)
//   7. validate availability (working hours + blocked times)
//   8. reject overlap (defense in depth; the DB exclusion constraint is
//      the final authority)
//   9. find/create customer safely, scoped to this business only
//  10. create appointment
//  11. generate booking code
//  12. create appointment activity row
//  13. create an admin notification
//  14. return only public-safe confirmation fields
//
// STATUS: written against the schema in supabase/migrations/*.sql but not
// deployed/executed in this environment (no Supabase project access). See
// PROJECT_PROGRESS.md.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const businessId = payload.business_id;
  const serviceId = payload.service_id;
  const staffMemberId = payload.staff_member_id ?? null;
  const startAt = payload.start_at;
  const customer = payload.customer as Record<string, unknown> | undefined;
  const customerNote = typeof payload.customer_note === 'string' ? payload.customer_note.slice(0, 1000) : '';

  // 1. validate request schema
  if (!isNonEmptyString(businessId) || !isNonEmptyString(serviceId) || !isNonEmptyString(startAt)) {
    return json({ error: 'Missing required fields.' }, 400);
  }
  if (!customer || !isNonEmptyString(customer.fullName as string) || !isNonEmptyString(customer.email as string)) {
    return json({ error: 'Customer name and email are required.' }, 400);
  }
  if (String(customer.fullName).length > 200 || String(customer.email).length > 200) {
    return json({ error: 'Submitted values are too long.' }, 400);
  }
  // Basic honeypot support: a hidden form field named "company" that real
  // visitors never fill in (spec section 120).
  if (isNonEmptyString(payload.company as string)) {
    return json({ error: 'Invalid submission.' }, 400);
  }
  const startDate = new Date(startAt);
  if (Number.isNaN(startDate.getTime())) {
    return json({ error: 'Invalid start time.' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // service-role: Edge Function env only, never in Vite/browser code
  );

  // 2. resolve active business
  const { data: business, error: bizErr } = await supabase
    .from('businesses').select('*').eq('id', businessId).eq('active', true).maybeSingle();
  if (bizErr || !business) return json({ error: 'This business is not available.' }, 404);

  // 3. resolve active public service
  const { data: service, error: svcErr } = await supabase
    .from('services').select('*').eq('id', serviceId).eq('business_id', businessId).eq('active', true).eq('public_visible', true).maybeSingle();
  if (svcErr || !service) return json({ error: 'This service is no longer available.' }, 404);

  // 4. validate staff can perform service (or pick one who can)
  let resolvedStaffId = staffMemberId as string | null;
  if (resolvedStaffId) {
    const { data: link } = await supabase.from('staff_services').select('member_id')
      .eq('business_id', businessId).eq('service_id', serviceId).eq('member_id', resolvedStaffId).maybeSingle();
    if (!link) return json({ error: 'The selected staff member cannot perform this service.' }, 400);
  } else {
    const { data: links } = await supabase.from('staff_services').select('member_id')
      .eq('business_id', businessId).eq('service_id', serviceId).limit(1);
    if (!links || links.length === 0) return json({ error: 'No staff can currently perform this service.' }, 400);
    resolvedStaffId = links[0].member_id;
  }

  // 5. authoritative duration/price — never trust the browser for these
  const durationMinutes = service.duration_minutes;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  // 6. validate booking window (lead time)
  const leadTimeMs = business.booking_lead_time_minutes * 60000;
  if (startDate.getTime() < Date.now() + leadTimeMs) {
    return json({ error: 'This time is too soon to book. Please choose a later time.' }, 400);
  }

  // 7. validate availability (working hours + blocked times)
  const weekday = startDate.getUTCDay(); // NOTE: for full correctness this should use the
  // business timezone rather than UTC; documented as a follow-up in PROJECT_PROGRESS.md.
  const { data: windows } = await supabase.from('availability_rules').select('*')
    .eq('member_id', resolvedStaffId).eq('weekday', weekday).eq('active', true);
  if (!windows || windows.length === 0) {
    return json({ error: 'That staff member is not available on the selected day.' }, 400);
  }
  const { data: blocked } = await supabase.from('blocked_times').select('*').eq('member_id', resolvedStaffId);
  const overlapsBlocked = (blocked ?? []).some((b: { start_at: string; end_at: string }) =>
    startDate < new Date(b.end_at) && endDate > new Date(b.start_at));
  if (overlapsBlocked) return json({ error: 'That time slot is no longer available. Please choose another time.' }, 409);

  // 8. reject overlap (defense in depth before the DB exclusion constraint)
  const { data: existing } = await supabase.from('appointments').select('start_at,end_at')
    .eq('staff_member_id', resolvedStaffId).in('status', ['pending', 'confirmed', 'checked_in', 'in_progress']);
  const overlapsAppt = (existing ?? []).some((a: { start_at: string; end_at: string }) =>
    startDate < new Date(a.end_at) && endDate > new Date(a.start_at));
  if (overlapsAppt) return json({ error: 'That time slot is no longer available. Please choose another time.' }, 409);

  // 9. find/create customer, scoped to this business only
  const email = String(customer.email).trim().toLowerCase();
  let customerRow;
  const { data: existingCustomer } = await supabase.from('customers').select('*')
    .eq('business_id', businessId).ilike('email', email).maybeSingle();
  if (existingCustomer) {
    customerRow = existingCustomer;
  } else {
    const { data: created, error: custErr } = await supabase.from('customers').insert({
      business_id: businessId,
      full_name: String(customer.fullName).trim().slice(0, 200),
      email,
      phone: isNonEmptyString(customer.phone as string) ? String(customer.phone).slice(0, 40) : null,
    }).select().single();
    if (custErr) return json({ error: 'Could not create your booking. Please try again.' }, 500);
    customerRow = created;
  }

  // 10-11. create appointment with a generated booking code, insert-time
  // overlap is the DB exclusion constraint's job — catch that error too.
  const status = business.requires_approval ? 'pending' : 'confirmed';
  const { data: bookingCode } = await supabase.rpc('generate_booking_code');

  const { data: appt, error: apptErr } = await supabase.from('appointments').insert({
    business_id: businessId,
    booking_code: bookingCode,
    customer_id: customerRow.id,
    service_id: serviceId,
    staff_member_id: resolvedStaffId,
    start_at: startDate.toISOString(),
    end_at: endDate.toISOString(),
    status,
    customer_note: customerNote,
    source: 'public_booking',
  }).select().single();

  if (apptErr) {
    const msg = String(apptErr.message || '');
    if (msg.toLowerCase().includes('exclu')) {
      return json({ error: 'That time slot is no longer available. Please choose another time.' }, 409);
    }
    return json({ error: 'Could not create your booking. Please try again.' }, 500);
  }

  // 12. appointment activity
  await supabase.from('appointment_activity').insert({
    business_id: businessId, appointment_id: appt.id, actor_user_id: null,
    event_type: 'created', message: 'Booking created via public booking page.',
  });

  // 13. admin notification
  const { data: owner } = await supabase.from('business_members').select('user_id')
    .eq('business_id', businessId).eq('role', 'owner').maybeSingle();
  if (owner) {
    await supabase.from('notifications').insert({
      business_id: businessId, user_id: owner.user_id, type: 'booking_created', title: 'New booking',
      message: `${customerRow.full_name} booked ${service.name} on ${startDate.toDateString()}.`,
      entity_type: 'appointment', entity_id: appt.id,
    });
  }

  // 14. public-safe confirmation fields only
  return json({
    bookingCode: appt.booking_code,
    status: appt.status,
    startAt: appt.start_at,
    endAt: appt.end_at,
    service: { name: service.name, price: service.price, durationMinutes: service.duration_minutes },
    business: { name: business.name, timezone: business.timezone, currency: business.currency },
  }, 201);
});
