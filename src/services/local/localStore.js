import { uid, generateBookingCode, generateInvoiceNumber } from '../../utils/id';
import { addDays, subDays, setHours, setMinutes } from 'date-fns';
import { BLOCKING_APPOINTMENT_STATUSES } from '../../constants/status';

// -----------------------------------------------------------------------
// CADENCE LOCAL STORAGE LAYER
//
// Complete client-side database management for Cadence.
// Handles safe serialization, versioning, corrupted storage recovery,
// import/export, and deterministic seed data generation with relative dates.
// -----------------------------------------------------------------------

export const SCHEMA_VERSION = 1;
export const DB_STORAGE_KEY = 'cadence:database:v1';
export const SESSION_STORAGE_KEY = 'cadence:session:v1';
export const PREFERENCES_STORAGE_KEY = 'cadence:preferences:v1';

export const REQUIRED_TABLES = [
  'profiles',
  'businesses',
  'business_members',
  'services',
  'staff_services',
  'availability_rules',
  'blocked_times',
  'customers',
  'appointments',
  'appointment_activity',
  'invoices',
  'invoice_items',
  'payments',
  'notifications',
  'membership_invitations',
  '_authUsers',
  '_invoiceSeq',
];

export function emptyDb() {
  return {
    _schemaVersion: SCHEMA_VERSION,
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
    _authUsers: [],
    _invoiceSeq: {},
  };
}

let db = null;
let lastRecoveryNotice = null;

export function getLastRecoveryNotice() {
  const notice = lastRecoveryNotice;
  lastRecoveryNotice = null;
  return notice;
}

export function isValidDatabaseShape(data) {
  if (!data || typeof data !== 'object') return false;
  for (const tableName of REQUIRED_TABLES) {
    if (tableName === '_invoiceSeq') {
      if (typeof data[tableName] !== 'object' || data[tableName] === null) return false;
    } else {
      if (!Array.isArray(data[tableName])) return false;
    }
  }
  return true;
}

export function loadDatabase() {
  if (db) return db;

  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidDatabaseShape(parsed)) {
        db = parsed;
        return db;
      }
      lastRecoveryNotice = 'Stored data was in an incompatible format. Default demo database was restored.';
    }
  } catch (err) {
    console.warn('Failed to parse Cadence localStorage data, initializing fresh seed.', err);
    lastRecoveryNotice = 'Stored data was corrupted. Default demo database was restored.';
  }

  db = emptyDb();
  seedDatabase(db);
  persistDatabase();
  return db;
}

export function persistDatabase() {
  if (!db) return;
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Failed to persist Cadence database to localStorage:', err);
  }
}

export function resetDemoData() {
  db = emptyDb();
  seedDatabase(db);
  persistDatabase();
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(PREFERENCES_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('cadence-demo-auth-change', { detail: null }));
}

export function exportDatabaseAsJson() {
  const currentDb = loadDatabase();
  return JSON.stringify(currentDb, null, 2);
}

export function importDatabaseFromJson(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!isValidDatabaseShape(parsed)) {
      throw new Error('Invalid Cadence database backup file: missing required data tables.');
    }
    db = parsed;
    persistDatabase();
    return { success: true };
  } catch (err) {
    throw new Error(`Failed to import backup: ${err.message}`);
  }
}

// --- Session helpers (Fake Auth) ----------------------------------------

export function getDemoSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setDemoSession(session) {
  if (session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent('cadence-demo-auth-change', { detail: session }));
}

// --- Preferences helpers ------------------------------------------------

export function getPreference(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed[key] !== undefined ? parsed[key] : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setPreference(key, value) {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[key] = value;
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(parsed));
  } catch (err) {
    console.error('Failed to save preference:', err);
  }
}

// --- Generic CRUD helpers -----------------------------------------------

export function table(name) {
  return loadDatabase()[name];
}

export function insert(name, row) {
  const record = { id: uid(), created_at: new Date().toISOString(), ...row };
  loadDatabase()[name].push(record);
  persistDatabase();
  return record;
}

export function update(name, id, patch) {
  const t = loadDatabase()[name];
  const idx = t.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`${name} record not found`);
  t[idx] = { ...t[idx], ...patch, updated_at: new Date().toISOString() };
  persistDatabase();
  return t[idx];
}

export function remove(name, id) {
  const t = loadDatabase()[name];
  const idx = t.findIndex((r) => r.id === id);
  if (idx !== -1) t.splice(idx, 1);
  persistDatabase();
}

export function nextInvoiceNumber(businessId, date = new Date()) {
  const d = loadDatabase();
  const year = date.getFullYear();
  const key = `${businessId}_${year}`;
  d._invoiceSeq[key] = (d._invoiceSeq[key] || 0) + 1;
  persistDatabase();
  return generateInvoiceNumber(year, d._invoiceSeq[key]);
}

export function findAuthUserByEmail(email) {
  return loadDatabase()._authUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function createAuthUser({ email, password, full_name }) {
  const d = loadDatabase();
  if (findAuthUserByEmail(email)) {
    throw new Error('An account with that email already exists.');
  }
  const user = { id: uid('user'), email, password, full_name };
  d._authUsers.push(user);
  d.profiles.push({ id: user.id, full_name, phone: '', avatar_url: null, created_at: new Date().toISOString() });
  persistDatabase();
  return user;
}

// -----------------------------------------------------------------------
// SEED DATA — "Nova Wellness Studio" Demo Workspace
// Deterministically populated with relative dates so live metrics,
// schedules, upcoming bookings, and invoices always look active.
// -----------------------------------------------------------------------

export function seedDatabase(d) {
  const now = new Date();

  // Demo accounts
  const ownerUser = { id: uid('user'), email: 'owner@novawellness.demo', password: 'demo1234', full_name: 'Amira Hassan' };
  const adminUser = { id: uid('user'), email: 'admin@novawellness.demo', password: 'demo1234', full_name: 'Youssef Adel' };
  const staffUser1 = { id: uid('user'), email: 'staff1@novawellness.demo', password: 'demo1234', full_name: 'Laila Mostafa' };
  const staffUser2 = { id: uid('user'), email: 'staff2@novawellness.demo', password: 'demo1234', full_name: 'Karim Fathy' };
  const customerUser = { id: uid('user'), email: 'customer@novawellness.demo', password: 'demo1234', full_name: 'Nadine Fares' };
  d._authUsers.push(ownerUser, adminUser, staffUser1, staffUser2, customerUser);

  [ownerUser, adminUser, staffUser1, staffUser2, customerUser].forEach((u) => {
    d.profiles.push({
      id: u.id,
      full_name: u.full_name,
      phone: '+20 100 000 0000',
      avatar_url: null,
      created_at: now.toISOString(),
    });
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
    brand_color: '#171B24',
    logo_url: null,
    active: true,
    booking_lead_time_minutes: 0,
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
    { name: 'Initial Consultation', category: 'Consultations', description: 'A first meeting to understand your goals and build a personalized plan.', duration_minutes: 45, price: 350, color: '#7775E8' },
    { name: 'Private Session', category: 'Sessions', description: 'One-on-one focused session tailored to your program.', duration_minutes: 60, price: 550, color: '#C7F36B' },
    { name: 'Recovery Session', category: 'Sessions', description: 'Guided recovery and mobility session.', duration_minutes: 40, price: 400, color: '#D99A32' },
    { name: 'Small Group Session', category: 'Group', description: 'Small group session capped at 6 participants.', duration_minutes: 50, price: 250, color: '#23865B' },
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

  // Availability: All 7 days (weekdays 0, 1, 2, 3, 4, 5, 6) 09:00-18:00 for staff1 and 10:00-19:00 for staff2
  for (const weekday of [0, 1, 2, 3, 4, 5, 6]) {
    d.availability_rules.push({ id: uid('avail'), business_id: business.id, member_id: staffMember1.id, weekday, start_time: '09:00', end_time: '18:00', active: true });
    d.availability_rules.push({ id: uid('avail'), business_id: business.id, member_id: staffMember2.id, weekday, start_time: '10:00', end_time: '19:00', active: true });
  }

  // Blocked time: staff2 on personal break tomorrow afternoon
  d.blocked_times.push({
    id: uid('block'),
    business_id: business.id,
    member_id: staffMember2.id,
    start_at: setMinutes(setHours(addDays(now, 1), 13), 0).toISOString(),
    end_at: setMinutes(setHours(addDays(now, 1), 15), 0).toISOString(),
    reason: 'Personal break',
    created_at: now.toISOString(),
  });

  // Seed customers
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
    notes: i === 0 ? 'Regular client. Prefers morning appointments.' : '',
    active: true,
    created_at: subDays(now, 80 - i * 5).toISOString(),
  }));
  d.customers.push(...customers);

  // Past appointments & historical invoices/payments
  const statusCycle = ['completed', 'completed', 'completed', 'no_show', 'cancelled'];
  let apptCount = 0;
  for (let dayOffset = 25; dayOffset >= 1; dayOffset--) {
    if (dayOffset % 3 === 0) continue;
    const svc = services[apptCount % services.length];
    const staff = apptCount % 2 === 0 ? staffMember1 : staffMember2;
    const cust = customers[apptCount % customers.length];
    const start = setMinutes(setHours(subDays(now, dayOffset), 9 + (apptCount % 6)), 0);
    const end = new Date(start);
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
      payment_status: status === 'completed' ? 'paid' : 'unpaid',
      customer_note: '',
      internal_note: '',
      source: 'public_booking',
      created_by: null,
      created_at: subDays(start, 3).toISOString(),
    };
    d.appointments.push(appt);
    d.appointment_activity.push({
      id: uid('act'),
      business_id: business.id,
      appointment_id: appt.id,
      actor_user_id: null,
      event_type: 'created',
      message: 'Booking created via Cadence booking page.',
      created_at: appt.created_at,
    });
    if (status !== 'pending') {
      d.appointment_activity.push({
        id: uid('act'),
        business_id: business.id,
        appointment_id: appt.id,
        actor_user_id: ownerUser.id,
        event_type: 'status_changed',
        message: `Status changed to ${status}.`,
        created_at: start.toISOString(),
      });
    }

    if (status === 'completed') {
      const subtotal = Number(svc.custom_price || svc.price);
      const tax = Math.round(subtotal * (business.tax_rate_percent / 100) * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;
      const year = start.getFullYear();
      const seqKey = `${business.id}_${year}`;
      d._invoiceSeq[seqKey] = (d._invoiceSeq[seqKey] || 0) + 1;
      const invNum = generateInvoiceNumber(year, d._invoiceSeq[seqKey]);

      const invoice = {
        id: uid('inv'),
        business_id: business.id,
        appointment_id: appt.id,
        customer_id: cust.id,
        invoice_number: invNum,
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
      d.invoice_items.push({
        id: uid('item'),
        invoice_id: invoice.id,
        description: svc.name,
        quantity: 1,
        unit_price: subtotal,
        line_total: subtotal,
        sort_order: 0,
      });

      const method = ['cash', 'demo_card', 'bank_transfer'][apptCount % 3];
      d.payments.push({
        id: uid('pay'),
        business_id: business.id,
        invoice_id: invoice.id,
        appointment_id: appt.id,
        customer_id: cust.id,
        amount: total,
        method,
        status: 'successful',
        reference: `SIM-${uid().slice(0, 6).toUpperCase()}`,
        paid_at: start.toISOString(),
        created_by: ownerUser.id,
        created_at: start.toISOString(),
      });
    }
    apptCount++;
  }

  // Today's appointments (guaranteed active for Dashboard & Schedule)
  const todaySvc1 = services[0];
  const todayStart1 = setMinutes(setHours(now, 10), 0);
  const todayEnd1 = new Date(todayStart1);
  todayEnd1.setMinutes(todayEnd1.getMinutes() + todaySvc1.duration_minutes);

  const todayAppt1 = {
    id: uid('appt'),
    business_id: business.id,
    booking_code: generateBookingCode(),
    customer_id: customers[0].id,
    service_id: todaySvc1.id,
    staff_member_id: staffMember1.id,
    start_at: todayStart1.toISOString(),
    end_at: todayEnd1.toISOString(),
    status: 'confirmed',
    payment_status: 'unpaid',
    customer_note: 'Looking forward to our session.',
    internal_note: 'VIP customer',
    source: 'customer_portal',
    created_by: null,
    created_at: subDays(now, 1).toISOString(),
  };
  d.appointments.push(todayAppt1);

  const todaySvc2 = services[1];
  const todayStart2 = setMinutes(setHours(now, 14), 0);
  const todayEnd2 = new Date(todayStart2);
  todayEnd2.setMinutes(todayEnd2.getMinutes() + todaySvc2.duration_minutes);

  const todayAppt2 = {
    id: uid('appt'),
    business_id: business.id,
    booking_code: generateBookingCode(),
    customer_id: customers[1].id,
    service_id: todaySvc2.id,
    staff_member_id: staffMember2.id,
    start_at: todayStart2.toISOString(),
    end_at: todayEnd2.toISOString(),
    status: 'checked_in',
    payment_status: 'unpaid',
    customer_note: '',
    internal_note: '',
    source: 'public_booking',
    created_by: null,
    created_at: subDays(now, 2).toISOString(),
  };
  d.appointments.push(todayAppt2);

  // Upcoming appointments (next 1 to 10 days)
  for (let dayOffset = 1; dayOffset <= 10; dayOffset++) {
    if (dayOffset % 2 === 0) continue;
    const svc = services[(apptCount + dayOffset) % services.length];
    const staff = dayOffset % 2 === 0 ? staffMember1 : staffMember2;
    const cust = customers[(apptCount + dayOffset) % customers.length];
    const start = setMinutes(setHours(addDays(now, dayOffset), 11 + (dayOffset % 4)), 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + svc.duration_minutes);
    const status = dayOffset <= 3 ? 'confirmed' : 'pending';

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
      customer_note: dayOffset === 3 ? 'First time visiting Nova Wellness Studio.' : '',
      internal_note: '',
      source: dayOffset % 3 === 0 ? 'customer_portal' : 'public_booking',
      created_by: null,
      created_at: subDays(start, 2).toISOString(),
    };
    d.appointments.push(appt);
    d.appointment_activity.push({
      id: uid('act'),
      business_id: business.id,
      appointment_id: appt.id,
      actor_user_id: null,
      event_type: 'created',
      message: 'Booking created via public booking page.',
      created_at: appt.created_at,
    });

    d.notifications.push({
      id: uid('notif'),
      business_id: business.id,
      user_id: ownerUser.id,
      customer_id: null,
      type: 'booking_created',
      title: 'New booking',
      message: `${cust.full_name} booked ${svc.name} on ${start.toLocaleDateString()}.`,
      entity_type: 'appointment',
      entity_id: appt.id,
      read_at: dayOffset > 4 ? null : now.toISOString(),
      created_at: appt.created_at,
    });
  }

  // An issued unpaid invoice for demonstration
  const issuedSubtotal = 400;
  const issuedTax = Math.round(issuedSubtotal * (business.tax_rate_percent / 100) * 100) / 100;
  const issuedTotal = issuedSubtotal + issuedTax;
  const yearNow = now.getFullYear();
  const seqKey = `${business.id}_${yearNow}`;
  d._invoiceSeq[seqKey] = (d._invoiceSeq[seqKey] || 0) + 1;
  const pendingInvNum = generateInvoiceNumber(yearNow, d._invoiceSeq[seqKey]);

  const unpaidInvoice = {
    id: uid('inv'),
    business_id: business.id,
    appointment_id: todayAppt1.id,
    customer_id: customers[0].id,
    invoice_number: pendingInvNum,
    status: 'issued',
    subtotal: issuedSubtotal,
    tax_amount: issuedTax,
    total: issuedTotal,
    amount_paid: 0,
    balance: issuedTotal,
    issued_at: subDays(now, 1).toISOString(),
    due_date: addDays(now, business.invoice_due_days).toISOString().slice(0, 10),
    paid_at: null,
    created_at: subDays(now, 1).toISOString(),
  };
  d.invoices.push(unpaidInvoice);
  d.invoice_items.push({
    id: uid('item'),
    invoice_id: unpaidInvoice.id,
    description: 'Recovery Session & Personal Consultation',
    quantity: 1,
    unit_price: issuedSubtotal,
    line_total: issuedSubtotal,
    sort_order: 0,
  });

  // Notifications
  d.notifications.push({
    id: uid('notif'),
    business_id: business.id,
    user_id: ownerUser.id,
    type: 'invoice_issued',
    title: 'Invoice issued',
    message: `Invoice ${pendingInvNum} was issued to ${customers[0].full_name}.`,
    entity_type: 'invoice',
    entity_id: unpaidInvoice.id,
    read_at: null,
    created_at: subDays(now, 1).toISOString(),
  });

  d.notifications.push({
    id: uid('notif'),
    business_id: business.id,
    user_id: ownerUser.id,
    type: 'payment_recorded',
    title: 'Payment recorded',
    message: 'A payment of EGP 550.00 was recorded.',
    entity_type: 'payment',
    entity_id: null,
    read_at: null,
    created_at: subDays(now, 2).toISOString(),
  });

  // -----------------------------------------------------------------------
  // Workspace 2: "My Business (Your Own Data)" — Clean Slate
  // Zero mock appointments, zero mock invoices, zero mock customers.
  // The user can switch here from the Command Center and add their own data!
  // -----------------------------------------------------------------------
  const cleanBusiness = {
    id: uid('biz'),
    owner_user_id: ownerUser.id,
    name: 'My Business (Your Own Data)',
    slug: 'my-business',
    business_type: 'consulting',
    phone: '+1 555 019 2834',
    email: ownerUser.email,
    address: '100 Innovation Way, Suite 400',
    timezone: 'UTC',
    currency: 'USD',
    brand_color: '#171B24',
    logo_url: null,
    active: true,
    booking_lead_time_minutes: 0,
    cancellation_window_hours: 12,
    slot_interval_minutes: 30,
    requires_approval: false,
    customer_can_choose_staff: true,
    tax_rate_percent: 0,
    invoice_due_days: 7,
    created_at: now.toISOString(),
  };
  d.businesses.push(cleanBusiness);

  // Add owner and admin memberships for the clean business
  const cleanOwnerMember = {
    id: uid('mem'),
    business_id: cleanBusiness.id,
    user_id: ownerUser.id,
    role: 'owner',
    active: true,
    created_at: now.toISOString(),
  };
  const cleanAdminMember = {
    id: uid('mem'),
    business_id: cleanBusiness.id,
    user_id: adminUser.id,
    role: 'admin',
    active: true,
    created_at: now.toISOString(),
  };
  d.business_members.push(cleanOwnerMember, cleanAdminMember);

  // Set up owner availability for clean workspace across all 7 days
  for (const weekday of [0, 1, 2, 3, 4, 5, 6]) {
    d.availability_rules.push({
      id: uid('avail'),
      business_id: cleanBusiness.id,
      member_id: cleanOwnerMember.id,
      weekday,
      start_time: '09:00',
      end_time: '18:00',
      active: true,
    });
  }
}

export { BLOCKING_APPOINTMENT_STATUSES };
