import { uid, generateBookingCode, generateInvoiceNumber } from '../../utils/id';
import { addDays, addHours, subDays, setHours, setMinutes } from 'date-fns';
import { BLOCKING_APPOINTMENT_STATUSES } from '../../constants/status';

// -----------------------------------------------------------------------
// DEMO / DEVELOPMENT DATA PROVIDER
//
// This module simulates the Supabase-backed relational schema entirely in
// the browser (localStorage) so the full UI can be built, screenshot, and
// QA'd before real Supabase credentials exist (spec section 82/131).
//
// It intentionally mirrors the table shapes in supabase/migrations/ so
// swapping VITE_DEMO_MODE=false for the real `supabaseProvider` requires no
// UI changes. This file must never be imported when demo mode is off.
// -----------------------------------------------------------------------

const STORAGE_KEY = 'serviceflow_demo_db_v1';
const SESSION_KEY = 'serviceflow_demo_session_v1';

function emptyDb() {
  return {
    profiles: [],
    businesses: [],
    business_members: [],
    services: [],
    staff_services: [],
    availability_rules: [],
    blocked_times: [],
    customers: [],
    appointments: [],
    appointment_activity: [],
    invoices: [],
    invoice_items: [],
    payments: [],
    notifications: [],
    membership_invitations: [],
    _authUsers: [], // { id, email, password (demo-only, never do this for real!), full_name }
    _invoiceSeq: {}, // businessId -> counter
  };
}

let db = null;

function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    db = raw ? JSON.parse(raw) : null;
  } catch {
    db = null;
  }
  if (!db) {
    db = emptyDb();
    seed(db);
    persist();
  }
  return db;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetDemoData() {
  db = emptyDb();
  seed(db);
  persist();
  localStorage.removeItem(SESSION_KEY);
}

// --- session helpers (fake auth) ----------------------------------------

export function getDemoSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setDemoSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('sf-demo-auth-change', { detail: session }));
}

// --- generic CRUD helpers -------------------------------------------------

export function table(name) {
  return load()[name];
}

export function insert(name, row) {
  const record = { id: uid(), created_at: new Date().toISOString(), ...row };
  load()[name].push(record);
  persist();
  return record;
}

export function update(name, id, patch) {
  const t = load()[name];
  const idx = t.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`${name} record not found`);
  t[idx] = { ...t[idx], ...patch, updated_at: new Date().toISOString() };
  persist();
  return t[idx];
}

export function remove(name, id) {
  const t = load()[name];
  const idx = t.findIndex((r) => r.id === id);
  if (idx !== -1) t.splice(idx, 1);
  persist();
}

export function nextInvoiceNumber(businessId) {
  const d = load();
  const year = new Date().getFullYear();
  const key = `${businessId}_${year}`;
  d._invoiceSeq[key] = (d._invoiceSeq[key] || 0) + 1;
  persist();
  return generateInvoiceNumber(year, d._invoiceSeq[key]);
}

// -----------------------------------------------------------------------
// SEED DATA — "Nova Wellness Studio" demo business (spec section 81)
// -----------------------------------------------------------------------

function seed(d) {
  const now = new Date();

  // Demo auth users (reserved/example emails only, never real people)
  const ownerUser = { id: uid('user'), email: 'owner@novawellness.demo', password: 'demo1234', full_name: 'Amira Hassan' };
  const adminUser = { id: uid('user'), email: 'admin@novawellness.demo', password: 'demo1234', full_name: 'Youssef Adel' };
  const staffUser1 = { id: uid('user'), email: 'staff1@novawellness.demo', password: 'demo1234', full_name: 'Laila Mostafa' };
  const staffUser2 = { id: uid('user'), email: 'staff2@novawellness.demo', password: 'demo1234', full_name: 'Karim Fathy' };
  const customerUser = { id: uid('user'), email: 'customer@novawellness.demo', password: 'demo1234', full_name: 'Nadine Fares' };
  d._authUsers.push(ownerUser, adminUser, staffUser1, staffUser2, customerUser);

  [ownerUser, adminUser, staffUser1, staffUser2, customerUser].forEach((u) => {
    d.profiles.push({ id: u.id, full_name: u.full_name, phone: '+20 100 000 0000', avatar_url: null, created_at: now.toISOString() });
  });

  const business = {
    id: uid('biz'),
    owner_user_id: ownerUser.id,
    name: 'Nova Wellness Studio',
    slug: 'nova-wellness-studio',
    business_type: 'wellness',
    phone: '+20 2 2555 0100',
    email: 'hello@novawellness.demo',
    address: '14 Zamalek Corniche, Cairo, Egypt',
    timezone: 'Africa/Cairo',
    currency: 'EGP',
    brand_color: '#3a63f0',
    logo_url: null,
    active: true,
    booking_lead_time_minutes: 60,
    cancellation_window_hours: 12,
    slot_interval_minutes: 30,
    requires_approval: false,
    customer_can_choose_staff: true,
    tax_rate_percent: 14,
    invoice_due_days: 7,
    created_at: subDays(now, 120).toISOString(),
  };
  d.businesses.push(business);

  const members = [
    { id: uid('mem'), business_id: business.id, user_id: ownerUser.id, role: 'owner', active: true, created_at: subDays(now, 120).toISOString() },
    { id: uid('mem'), business_id: business.id, user_id: adminUser.id, role: 'admin', active: true, created_at: subDays(now, 100).toISOString() },
    { id: uid('mem'), business_id: business.id, user_id: staffUser1.id, role: 'staff', active: true, created_at: subDays(now, 90).toISOString() },
    { id: uid('mem'), business_id: business.id, user_id: staffUser2.id, role: 'staff', active: true, created_at: subDays(now, 60).toISOString() },
  ];
  d.business_members.push(...members);
  const staffMember1 = members[2];
  const staffMember2 = members[3];

  const serviceDefs = [
    { name: 'Initial Consultation', category: 'Consultations', description: 'A first meeting to understand your goals and build a personalized plan.', duration_minutes: 45, price: 350, color: '#3a63f0' },
    { name: 'Private Session', category: 'Sessions', description: 'One-on-one focused session tailored to your program.', duration_minutes: 60, price: 550, color: '#16b3a3' },
    { name: 'Recovery Session', category: 'Sessions', description: 'Guided recovery and mobility session.', duration_minutes: 40, price: 400, color: '#d98b1a' },
    { name: 'Small Group Session', category: 'Group', description: 'Small group session capped at 6 participants.', duration_minutes: 50, price: 250, color: '#8a5cf5' },
  ];
  const services = serviceDefs.map((s) => ({
    id: uid('svc'),
    business_id: business.id,
    ...s,
    buffer_before_minutes: 5,
    buffer_after_minutes: 10,
    active: true,
    public_visible: true,
    created_at: subDays(now, 110).toISOString(),
  }));
  d.services.push(...services);

  // Assign services to staff
  for (const svc of services) {
    d.staff_services.push({ id: uid('ss'), business_id: business.id, member_id: staffMember1.id, service_id: svc.id, custom_duration_minutes: null, custom_price: null });
    if (svc.name !== 'Small Group Session') {
      d.staff_services.push({ id: uid('ss'), business_id: business.id, member_id: staffMember2.id, service_id: svc.id, custom_duration_minutes: null, custom_price: null });
    }
  }

  // Availability: Sun-Thu 09:00-17:00 for both staff (regional business week)
  for (const weekday of [0, 1, 2, 3, 4]) {
    d.availability_rules.push({ id: uid('avail'), business_id: business.id, member_id: staffMember1.id, weekday, start_time: '09:00', end_time: '17:00', active: true });
    d.availability_rules.push({ id: uid('avail'), business_id: business.id, member_id: staffMember2.id, weekday, start_time: '10:00', end_time: '18:00', active: true });
  }

  // A blocked time: staff2 on personal break tomorrow afternoon
  d.blocked_times.push({
    id: uid('block'),
    business_id: business.id,
    member_id: staffMember2.id,
    start_at: setMinutes(setHours(addDays(now, 1), 13), 0).toISOString(),
    end_at: setMinutes(setHours(addDays(now, 1), 15), 0).toISOString(),
    reason: 'Personal break',
    created_at: now.toISOString(),
  });

  // Customers
  const customerNames = [
    ['Nadine Fares', 'customer@novawellness.demo', customerUser.id],
    ['Omar Reda', 'omar.reda@example.demo', null],
    ['Farida Naguib', 'farida.naguib@example.demo', null],
    ['Hassan Tarek', 'hassan.tarek@example.demo', null],
    ['Mona Zaki', 'mona.zaki@example.demo', null],
    ['Sherif Adly', 'sherif.adly@example.demo', null],
  ];
  const customers = customerNames.map(([full_name, email, auth_user_id], i) => ({
    id: uid('cust'),
    business_id: business.id,
    auth_user_id,
    full_name,
    email,
    phone: `+20 10${(10000000 + i * 1111111).toString().slice(0, 8)}`,
    notes: '',
    active: true,
    created_at: subDays(now, 80 - i * 5).toISOString(),
  }));
  d.customers.push(...customers);

  // Appointments: mix of past (completed / no_show / cancelled) and upcoming
  const statusCycle = ['completed', 'completed', 'completed', 'no_show', 'cancelled'];
  let apptCount = 0;
  for (let dayOffset = 20; dayOffset >= 1; dayOffset--) {
    if (dayOffset % 3 === 0) continue;
    const svc = services[apptCount % services.length];
    const staff = apptCount % 2 === 0 ? staffMember1 : staffMember2;
    const cust = customers[apptCount % customers.length];
    const start = setMinutes(setHours(subDays(now, dayOffset), 9 + (apptCount % 6)), 0);
    const end = addHours(start, 0);
    end.setMinutes(end.getMinutes() + svc.duration_minutes);
    const status = statusCycle[apptCount % statusCycle.length];
    const appt = {
      id: uid('appt'),
      business_id: business.id,
      booking_code: generateBookingCode(),
      customer_id: cust.id,
      service_id: svc.id,
      staff_member_id: staff.id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status,
      payment_status: status === 'completed' ? 'paid' : status === 'cancelled' ? 'unpaid' : 'unpaid',
      customer_note: '',
      internal_note: '',
      source: 'public_booking',
      created_by: null,
      created_at: subDays(start, 3).toISOString(),
    };
    d.appointments.push(appt);
    d.appointment_activity.push({ id: uid('act'), business_id: business.id, appointment_id: appt.id, actor_user_id: null, event_type: 'created', message: 'Booking created via public booking page.', created_at: appt.created_at });
    if (status !== 'pending') {
      d.appointment_activity.push({ id: uid('act'), business_id: business.id, appointment_id: appt.id, actor_user_id: ownerUser.id, event_type: 'status_changed', message: `Status changed to ${status}.`, created_at: start.toISOString() });
    }

    if (status === 'completed') {
      const subtotal = Number(svc.custom_price || svc.price);
      const tax = Math.round(subtotal * (business.tax_rate_percent / 100) * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;
      const invoice = {
        id: uid('inv'),
        business_id: business.id,
        appointment_id: appt.id,
        customer_id: cust.id,
        invoice_number: nextInvoiceNumberInline(d, business.id, start),
        status: 'paid',
        subtotal,
        tax_amount: tax,
        total,
        amount_paid: total,
        balance: 0,
        issued_at: start.toISOString(),
        due_date: addDays(start, business.invoice_due_days).toISOString().slice(0, 10),
        paid_at: start.toISOString(),
        created_at: start.toISOString(),
      };
      d.invoices.push(invoice);
      d.invoice_items.push({ id: uid('item'), invoice_id: invoice.id, description: svc.name, quantity: 1, unit_price: subtotal, line_total: subtotal, sort_order: 0 });
      const method = ['cash', 'demo_card', 'bank_transfer'][apptCount % 3];
      d.payments.push({ id: uid('pay'), business_id: business.id, invoice_id: invoice.id, appointment_id: appt.id, customer_id: cust.id, amount: total, method, status: 'successful', reference: `SIM-${uid().slice(0, 6)}`, paid_at: start.toISOString(), created_by: ownerUser.id, created_at: start.toISOString() });
    }
    apptCount++;
  }

  // Upcoming appointments (today + next 10 days), left active/blocking
  for (let dayOffset = 0; dayOffset <= 10; dayOffset++) {
    if (dayOffset % 2 === 0) continue;
    const svc = services[(apptCount + dayOffset) % services.length];
    const staff = dayOffset % 2 === 0 ? staffMember1 : staffMember2;
    const cust = customers[(apptCount + dayOffset) % customers.length];
    const start = setMinutes(setHours(addDays(now, dayOffset), 10 + (dayOffset % 5)), 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + svc.duration_minutes);
    const status = dayOffset === 0 ? 'confirmed' : ['pending', 'confirmed'][dayOffset % 2];
    const appt = {
      id: uid('appt'),
      business_id: business.id,
      booking_code: generateBookingCode(),
      customer_id: cust.id,
      service_id: svc.id,
      staff_member_id: staff.id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status,
      payment_status: 'unpaid',
      customer_note: dayOffset === 3 ? 'First time visiting, a bit nervous about the session.' : '',
      internal_note: '',
      source: dayOffset % 3 === 0 ? 'customer_portal' : 'public_booking',
      created_by: null,
      created_at: subDays(start, 2).toISOString(),
    };
    d.appointments.push(appt);
    d.appointment_activity.push({ id: uid('act'), business_id: business.id, appointment_id: appt.id, actor_user_id: null, event_type: 'created', message: 'Booking created via public booking page.', created_at: appt.created_at });
    d.notifications.push({
      id: uid('notif'), business_id: business.id, user_id: ownerUser.id, customer_id: null,
      type: 'booking_created', title: 'New booking', message: `${cust.full_name} booked ${svc.name} on ${start.toLocaleDateString()}.`,
      entity_type: 'appointment', entity_id: appt.id, read_at: dayOffset > 5 ? null : now.toISOString(), created_at: appt.created_at,
    });
  }

  // A couple of extra notifications
  d.notifications.push({ id: uid('notif'), business_id: business.id, user_id: ownerUser.id, type: 'payment_recorded', title: 'Payment recorded', message: 'A payment of EGP 550.00 was recorded.', entity_type: 'payment', entity_id: null, read_at: null, created_at: subDays(now, 1).toISOString() });
  d.notifications.push({ id: uid('notif'), business_id: business.id, user_id: ownerUser.id, type: 'invoice_issued', title: 'Invoice issued', message: 'Invoice INV was issued to a customer.', entity_type: 'invoice', entity_id: null, read_at: null, created_at: subDays(now, 2).toISOString() });
}

function nextInvoiceNumberInline(d, businessId, date) {
  const year = date.getFullYear();
  const key = `${businessId}_${year}`;
  d._invoiceSeq[key] = (d._invoiceSeq[key] || 0) + 1;
  return generateInvoiceNumber(year, d._invoiceSeq[key]);
}

export function findAuthUserByEmail(email) {
  return load()._authUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function createAuthUser({ email, password, full_name }) {
  const d = load();
  if (findAuthUserByEmail(email)) {
    throw new Error('An account with that email already exists.');
  }
  const user = { id: uid('user'), email, password, full_name };
  d._authUsers.push(user);
  d.profiles.push({ id: user.id, full_name, phone: '', avatar_url: null, created_at: new Date().toISOString() });
  persist();
  return user;
}

export { BLOCKING_APPOINTMENT_STATUSES };
