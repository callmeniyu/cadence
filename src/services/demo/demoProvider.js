import * as store from './demoStore';
import { uid, generateBookingCode } from '../../utils/id';
import { generateSlots, rangesOverlap } from '../../utils/slotEngine';
import { BLOCKING_APPOINTMENT_STATUSES } from '../../constants/status';

// Simulated network latency keeps loading states/skeletons visible & honest
// during QA, and mirrors the async shape the real Supabase provider has.
const LATENCY = 220;
const wait = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms));

function requireSession() {
  const session = store.getDemoSession();
  if (!session) throw new Error('Not authenticated');
  return session;
}

// ---------------------------------------------------------------- AUTH ---

export const auth = {
  async getSession() {
    await wait(60);
    return store.getDemoSession();
  },

  onAuthStateChange(callback) {
    const handler = (e) => callback(e.detail);
    window.addEventListener('sf-demo-auth-change', handler);
    return () => window.removeEventListener('sf-demo-auth-change', handler);
  },

  async signUp({ email, password, fullName }) {
    await wait();
    const user = store.createAuthUser({ email, password, full_name: fullName });
    const session = { user: { id: user.id, email: user.email } };
    store.setDemoSession(session);
    return session;
  },

  async signIn({ email, password }) {
    await wait();
    const user = store.findAuthUserByEmail(email);
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password.');
    }
    const session = { user: { id: user.id, email: user.email } };
    store.setDemoSession(session);
    return session;
  },

  async signOut() {
    await wait(80);
    store.setDemoSession(null);
  },

  async resetPasswordForEmail() {
    await wait();
    // Demo mode cannot send real email; UI shows a generic confirmation.
    return { sent: true };
  },

  async updatePassword({ password }) {
    await wait();
    const session = requireSession();
    const user = store.table('_authUsers').find((u) => u.id === session.user.id);
    if (user) user.password = password;
    return { updated: true };
  },
};

// ------------------------------------------------------------ PROFILE ---

export const profileApi = {
  async getProfile(userId) {
    await wait(80);
    return store.table('profiles').find((p) => p.id === userId) || null;
  },
  async updateProfile(userId, patch) {
    await wait();
    return store.update('profiles', userId, patch);
  },
};

// ----------------------------------------------------------- BUSINESS ---

function memberOf(businessId, userId) {
  return store.table('business_members').find((m) => m.business_id === businessId && m.user_id === userId && m.active);
}

export const businessApi = {
  // Mirrors the `create_business_workspace` RPC: server (or here, the demo
  // store) is the only thing allowed to create the owner membership.
  async createWorkspace({ userId, name, slug, businessType, phone, email, address, timezone, currency }) {
    await wait();
    const existingSlug = store.table('businesses').find((b) => b.slug === slug);
    if (existingSlug) throw new Error('That business URL is already taken. Please choose another.');
    const business = store.insert('businesses', {
      owner_user_id: userId, name, slug, business_type: businessType, phone, email, address,
      timezone, currency, brand_color: '#3a63f0', logo_url: null, active: true,
      booking_lead_time_minutes: 60, cancellation_window_hours: 12, slot_interval_minutes: 30,
      requires_approval: false, customer_can_choose_staff: true, tax_rate_percent: 0, invoice_due_days: 7,
    });
    store.insert('business_members', { business_id: business.id, user_id: userId, role: 'owner', active: true });
    return business;
  },

  async getMyBusinesses(userId) {
    await wait(100);
    const memberships = store.table('business_members').filter((m) => m.user_id === userId && m.active);
    return memberships.map((m) => ({
      membership: m,
      business: store.table('businesses').find((b) => b.id === m.business_id),
    })).filter((r) => r.business);
  },

  async getBusiness(businessId) {
    await wait(80);
    return store.table('businesses').find((b) => b.id === businessId) || null;
  },

  async getBusinessBySlug(slug) {
    await wait(100);
    return store.table('businesses').find((b) => b.slug === slug && b.active) || null;
  },

  async updateBusiness(businessId, patch) {
    await wait();
    return store.update('businesses', businessId, patch);
  },

  async getMembership(businessId, userId) {
    await wait(60);
    return memberOf(businessId, userId) || null;
  },

  async getMembers(businessId) {
    await wait(120);
    const members = store.table('business_members').filter((m) => m.business_id === businessId);
    return members.map((m) => ({ ...m, profile: store.table('profiles').find((p) => p.id === m.user_id) }));
  },

  async updateMemberRole(memberId, role) {
    await wait();
    return store.update('business_members', memberId, { role });
  },

  async setMemberActive(memberId, active) {
    await wait();
    return store.update('business_members', memberId, { active });
  },

  async inviteMember(businessId, { email, role }) {
    await wait();
    return store.insert('membership_invitations', { business_id: businessId, email, role, status: 'pending' });
  },
};

// ------------------------------------------------------------ SERVICES ---

export const servicesApi = {
  async list(businessId, { activeOnly = false, publicOnly = false } = {}) {
    await wait(150);
    let rows = store.table('services').filter((s) => s.business_id === businessId);
    if (activeOnly) rows = rows.filter((s) => s.active);
    if (publicOnly) rows = rows.filter((s) => s.active && s.public_visible);
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
  async get(id) {
    await wait(80);
    return store.table('services').find((s) => s.id === id) || null;
  },
  async create(businessId, payload) {
    await wait();
    return store.insert('services', { business_id: businessId, active: true, public_visible: true, ...payload });
  },
  async update(id, patch) {
    await wait();
    return store.update('services', id, patch);
  },
  async remove(id) {
    await wait();
    // Safe "archive": never hard-delete a service with historical appointments
    const hasHistory = store.table('appointments').some((a) => a.service_id === id);
    if (hasHistory) return store.update('services', id, { active: false, public_visible: false });
    store.remove('services', id);
    return null;
  },
  async assignedStaff(serviceId) {
    await wait(100);
    const links = store.table('staff_services').filter((l) => l.service_id === serviceId);
    return links.map((l) => store.table('business_members').find((m) => m.id === l.member_id)).filter(Boolean);
  },
};

// --------------------------------------------------------------- STAFF ---

export const staffApi = {
  async list(businessId) {
    await wait(150);
    const members = store.table('business_members').filter((m) => m.business_id === businessId && m.role !== 'owner_hidden');
    return members.map((m) => ({
      ...m,
      profile: store.table('profiles').find((p) => p.id === m.user_id),
      services: store.table('staff_services').filter((s) => s.member_id === m.id).map((s) => s.service_id),
    }));
  },
  async get(memberId) {
    await wait(100);
    const m = store.table('business_members').find((r) => r.id === memberId);
    if (!m) return null;
    return {
      ...m,
      profile: store.table('profiles').find((p) => p.id === m.user_id),
      services: store.table('staff_services').filter((s) => s.member_id === memberId).map((s) => s.service_id),
      availability: store.table('availability_rules').filter((a) => a.member_id === memberId),
      blockedTimes: store.table('blocked_times').filter((b) => b.member_id === memberId),
    };
  },
  async servicesForStaff(businessId, serviceId) {
    await wait(100);
    // Staff members who can perform this service (used by booking wizard step 2)
    const links = store.table('staff_services').filter((l) => l.business_id === businessId && l.service_id === serviceId);
    return links.map((l) => {
      const member = store.table('business_members').find((m) => m.id === l.member_id);
      return { ...member, profile: store.table('profiles').find((p) => p.id === member.user_id) };
    });
  },
  async assignServices(memberId, businessId, serviceIds) {
    await wait();
    const existing = store.table('staff_services').filter((l) => l.member_id === memberId);
    existing.forEach((l) => store.remove('staff_services', l.id));
    serviceIds.forEach((serviceId) => store.insert('staff_services', { business_id: businessId, member_id: memberId, service_id: serviceId }));
  },
  async setAvailability(memberId, businessId, rules) {
    await wait();
    store.table('availability_rules').filter((a) => a.member_id === memberId).forEach((a) => store.remove('availability_rules', a.id));
    rules.forEach((r) => store.insert('availability_rules', { business_id: businessId, member_id: memberId, ...r }));
  },
  async addBlockedTime(memberId, businessId, payload) {
    await wait();
    return store.insert('blocked_times', { business_id: businessId, member_id: memberId, ...payload });
  },
  async removeBlockedTime(id) {
    await wait();
    store.remove('blocked_times', id);
  },
};

// ----------------------------------------------------------- CUSTOMERS ---

export const customersApi = {
  async list(businessId, { search = '', page = 1, pageSize = 10 } = {}) {
    await wait(150);
    let rows = store.table('customers').filter((c) => c.business_id === businessId);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((c) => c.full_name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q));
    }
    rows = rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = rows.length;
    const paged = rows.slice((page - 1) * pageSize, page * pageSize).map((c) => enrichCustomer(c));
    return { rows: paged, total };
  },
  async get(id) {
    await wait(100);
    const c = store.table('customers').find((r) => r.id === id);
    return c ? enrichCustomer(c) : null;
  },
  async getByAuthUser(businessId, authUserId) {
    await wait(100);
    return store.table('customers').find((c) => c.business_id === businessId && c.auth_user_id === authUserId) || null;
  },
  async create(businessId, payload) {
    await wait();
    return store.insert('customers', { business_id: businessId, active: true, notes: '', ...payload });
  },
  async update(id, patch) {
    await wait();
    return store.update('customers', id, patch);
  },
  async archive(id) {
    await wait();
    return store.update('customers', id, { active: false });
  },
};

function enrichCustomer(c) {
  const appts = store.table('appointments').filter((a) => a.customer_id === c.id);
  const invoices = store.table('invoices').filter((i) => i.customer_id === c.id);
  const now = new Date();
  const past = appts.filter((a) => new Date(a.start_at) < now).sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
  const upcoming = appts.filter((a) => new Date(a.start_at) >= now && BLOCKING_APPOINTMENT_STATUSES.includes(a.status)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  const totalPaid = invoices.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
  const outstanding = invoices.reduce((sum, i) => sum + (i.status !== 'void' ? Number(i.balance || 0) : 0), 0);
  return {
    ...c,
    appointmentCount: appts.length,
    lastAppointment: past[0] || null,
    upcomingAppointment: upcoming[0] || null,
    totalPaid,
    outstanding,
  };
}

// -------------------------------------------------------- AVAILABILITY ---

export const availabilityApi = {
  async getSlots({ businessId, serviceId, staffMemberId, date }) {
    await wait(180);
    const business = store.table('businesses').find((b) => b.id === businessId);
    const service = store.table('services').find((s) => s.id === serviceId);
    if (!business || !service) return [];

    const weekday = date.getDay();
    let candidateStaff = staffMemberId
      ? [staffMemberId]
      : store.table('staff_services').filter((l) => l.business_id === businessId && l.service_id === serviceId).map((l) => l.member_id);
    candidateStaff = [...new Set(candidateStaff)];

    const allSlots = [];
    for (const memberId of candidateStaff) {
      const windows = store.table('availability_rules').filter((a) => a.member_id === memberId && a.weekday === weekday && a.active);
      if (windows.length === 0) continue;
      const blocked = store.table('blocked_times').filter((b) => b.member_id === memberId).map((b) => ({ start: new Date(b.start_at), end: new Date(b.end_at) }));
      const existing = store.table('appointments')
        .filter((a) => a.staff_member_id === memberId && BLOCKING_APPOINTMENT_STATUSES.includes(a.status))
        .map((a) => ({ start: new Date(a.start_at), end: new Date(a.end_at) }));

      const slots = generateSlots({
        date,
        workingWindows: windows,
        blockedRanges: blocked,
        existingAppointments: existing,
        durationMinutes: service.duration_minutes,
        bufferBeforeMinutes: service.buffer_before_minutes,
        bufferAfterMinutes: service.buffer_after_minutes,
        slotIntervalMinutes: business.slot_interval_minutes,
        leadTimeMinutes: business.booking_lead_time_minutes,
      });
      slots.forEach((s) => allSlots.push({ ...s, staffMemberId: memberId }));
    }

    const seen = new Set();
    return allSlots
      .filter((s) => {
        const key = s.start.toISOString();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.start - b.start);
  },
};

// ------------------------------------------------------------ BOOKING ---

// Simulates the authoritative, server-side booking path (spec sections 14,
// 55, 56): price/duration are recomputed here from the service record, and
// overlap is re-checked at "insert time" rather than trusted from the
// slot list the client already has, mirroring what the Postgres exclusion
// constraint + RPC would enforce for real.
async function createBookingInternal({ businessId, serviceId, staffMemberId, startAt, customer, customerNote, source, createdBy }) {
  const business = store.table('businesses').find((b) => b.id === businessId);
  const service = store.table('services').find((s) => s.id === serviceId && s.business_id === businessId);
  if (!business || !service) throw new Error('This service is no longer available.');

  let resolvedStaffId = staffMemberId;
  if (!resolvedStaffId) {
    const candidates = store.table('staff_services').filter((l) => l.business_id === businessId && l.service_id === serviceId);
    if (candidates.length === 0) throw new Error('No staff can currently perform this service.');
    resolvedStaffId = candidates[0].member_id;
  }

  const durationMinutes = service.duration_minutes;
  const start = new Date(startAt);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  // Authoritative overlap re-check (what the DB exclusion constraint does)
  const conflict = store.table('appointments').some((a) =>
    a.staff_member_id === resolvedStaffId &&
    BLOCKING_APPOINTMENT_STATUSES.includes(a.status) &&
    rangesOverlap(start, end, new Date(a.start_at), new Date(a.end_at))
  );
  if (conflict) throw new Error('That time slot is no longer available. Please choose another time.');

  // Find-or-create customer (never trust arbitrary auth_user_id from the browser)
  let customerRecord = store.table('customers').find((c) => c.business_id === businessId && c.email?.toLowerCase() === customer.email.toLowerCase());
  if (!customerRecord) {
    customerRecord = store.insert('customers', {
      business_id: businessId, auth_user_id: customer.authUserId || null,
      full_name: customer.fullName, email: customer.email, phone: customer.phone, notes: '', active: true,
    });
  } else if (customer.authUserId && !customerRecord.auth_user_id) {
    customerRecord = store.update('customers', customerRecord.id, { auth_user_id: customer.authUserId });
  }

  const status = business.requires_approval ? 'pending' : 'confirmed';
  const appt = store.insert('appointments', {
    business_id: businessId,
    booking_code: generateBookingCode(),
    customer_id: customerRecord.id,
    service_id: serviceId,
    staff_member_id: resolvedStaffId,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    status,
    payment_status: 'unpaid',
    customer_note: customerNote || '',
    internal_note: '',
    source,
    created_by: createdBy || null,
  });

  store.insert('appointment_activity', {
    business_id: businessId, appointment_id: appt.id, actor_user_id: createdBy || null,
    event_type: 'created', message: `Booking created (${source.replace('_', ' ')}).`,
  });

  const owner = store.table('business_members').find((m) => m.business_id === businessId && m.role === 'owner');
  if (owner) {
    store.insert('notifications', {
      business_id: businessId, user_id: owner.user_id, customer_id: null,
      type: 'booking_created', title: 'New booking',
      message: `${customerRecord.full_name} booked ${service.name} on ${start.toLocaleDateString()}.`,
      entity_type: 'appointment', entity_id: appt.id, read_at: null,
    });
  }

  return { appointment: appt, service, business, customer: customerRecord };
}

export const bookingApi = {
  async createPublicBooking(payload) {
    await wait(300);
    return createBookingInternal({ ...payload, source: 'public_booking' });
  },
  async createPortalBooking(payload) {
    await wait(300);
    return createBookingInternal({ ...payload, source: 'customer_portal' });
  },
  async createAdminBooking(payload) {
    await wait(250);
    return createBookingInternal({ ...payload, source: 'admin' });
  },
  async getByBookingCode(code) {
    await wait(120);
    const appt = store.table('appointments').find((a) => a.booking_code === code);
    if (!appt) return null;
    return enrichAppointment(appt);
  },
};

function enrichAppointment(a) {
  return {
    ...a,
    service: store.table('services').find((s) => s.id === a.service_id),
    staff: (() => {
      const m = store.table('business_members').find((mm) => mm.id === a.staff_member_id);
      return m ? { ...m, profile: store.table('profiles').find((p) => p.id === m.user_id) } : null;
    })(),
    customer: store.table('customers').find((c) => c.id === a.customer_id),
    business: store.table('businesses').find((b) => b.id === a.business_id),
  };
}

// -------------------------------------------------------- APPOINTMENTS ---

export const appointmentsApi = {
  async list(businessId, { search = '', status, serviceId, staffMemberId, dateFrom, dateTo, paymentStatus, page = 1, pageSize = 10 } = {}) {
    await wait(180);
    let rows = store.table('appointments').filter((a) => a.business_id === businessId);
    if (status) rows = rows.filter((a) => a.status === status);
    if (serviceId) rows = rows.filter((a) => a.service_id === serviceId);
    if (staffMemberId) rows = rows.filter((a) => a.staff_member_id === staffMemberId);
    if (paymentStatus) rows = rows.filter((a) => a.payment_status === paymentStatus);
    if (dateFrom) rows = rows.filter((a) => new Date(a.start_at) >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((a) => new Date(a.start_at) <= new Date(dateTo));
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((a) => {
        const cust = store.table('customers').find((c) => c.id === a.customer_id);
        return a.booking_code.toLowerCase().includes(q) || cust?.full_name.toLowerCase().includes(q);
      });
    }
    rows = rows.sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
    const total = rows.length;
    const paged = rows.slice((page - 1) * pageSize, page * pageSize).map(enrichAppointment);
    return { rows: paged, total };
  },

  async listForStaffMember(businessId, memberId, opts = {}) {
    const result = await appointmentsApi.list(businessId, { ...opts, pageSize: opts.pageSize || 500 });
    return { ...result, rows: result.rows.filter((a) => a.staff_member_id === memberId) };
  },

  async listInRange(businessId, start, end, filters = {}) {
    await wait(150);
    let rows = store.table('appointments').filter((a) => a.business_id === businessId && new Date(a.start_at) < end && new Date(a.end_at) > start);
    if (filters.staffMemberId) rows = rows.filter((a) => a.staff_member_id === filters.staffMemberId);
    if (filters.status) rows = rows.filter((a) => a.status === filters.status);
    return rows.map(enrichAppointment).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  },

  async get(id) {
    await wait(100);
    const a = store.table('appointments').find((r) => r.id === id);
    return a ? enrichAppointment(a) : null;
  },

  async getActivity(appointmentId) {
    await wait(100);
    return store.table('appointment_activity')
      .filter((a) => a.appointment_id === appointmentId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async updateStatus(id, status, actorUserId, note) {
    await wait();
    const appt = store.update('appointments', id, { status });
    store.insert('appointment_activity', {
      business_id: appt.business_id, appointment_id: id, actor_user_id: actorUserId || null,
      event_type: 'status_changed', message: note || `Status changed to ${status.replace('_', ' ')}.`,
    });
    if (status === 'cancelled') {
      const owner = store.table('business_members').find((m) => m.business_id === appt.business_id && m.role === 'owner');
      if (owner) {
        store.insert('notifications', {
          business_id: appt.business_id, user_id: owner.user_id, type: 'booking_cancelled',
          title: 'Booking cancelled', message: `Appointment ${appt.booking_code} was cancelled.`,
          entity_type: 'appointment', entity_id: id, read_at: null,
        });
      }
    }
    return appt;
  },

  async updateNotes(id, patch) {
    await wait();
    return store.update('appointments', id, patch);
  },

  async reassignStaff(id, staffMemberId, actorUserId) {
    await wait();
    const appt = store.table('appointments').find((a) => a.id === id);
    const conflict = store.table('appointments').some((a) =>
      a.id !== id && a.staff_member_id === staffMemberId && BLOCKING_APPOINTMENT_STATUSES.includes(a.status) &&
      rangesOverlap(new Date(appt.start_at), new Date(appt.end_at), new Date(a.start_at), new Date(a.end_at))
    );
    if (conflict) throw new Error('That time slot is no longer available. Please choose another time.');
    const updated = store.update('appointments', id, { staff_member_id: staffMemberId });
    store.insert('appointment_activity', { business_id: appt.business_id, appointment_id: id, actor_user_id: actorUserId || null, event_type: 'reassigned', message: 'Staff assignment changed.' });
    return updated;
  },
};

// ------------------------------------------------------------ INVOICES ---

function enrichInvoice(inv) {
  return {
    ...inv,
    items: store.table('invoice_items').filter((it) => it.invoice_id === inv.id).sort((a, b) => a.sort_order - b.sort_order),
    customer: store.table('customers').find((c) => c.id === inv.customer_id),
    appointment: inv.appointment_id ? store.table('appointments').find((a) => a.id === inv.appointment_id) : null,
    payments: store.table('payments').filter((p) => p.invoice_id === inv.id),
  };
}

export const invoicesApi = {
  async list(businessId, { search = '', status, page = 1, pageSize = 10 } = {}) {
    await wait(180);
    let rows = store.table('invoices').filter((i) => i.business_id === businessId);
    if (status) rows = rows.filter((i) => i.status === status);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((i) => {
        const cust = store.table('customers').find((c) => c.id === i.customer_id);
        return i.invoice_number.toLowerCase().includes(q) || cust?.full_name.toLowerCase().includes(q);
      });
    }
    rows = rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = rows.length;
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize).map(enrichInvoice), total };
  },
  async get(id) {
    await wait(100);
    const inv = store.table('invoices').find((i) => i.id === id);
    return inv ? enrichInvoice(inv) : null;
  },
  async createFromAppointment(appointmentId) {
    await wait();
    const appt = store.table('appointments').find((a) => a.id === appointmentId);
    const service = store.table('services').find((s) => s.id === appt.service_id);
    const business = store.table('businesses').find((b) => b.id === appt.business_id);
    const subtotal = Number(service.custom_price || service.price);
    const tax = Math.round(subtotal * (business.tax_rate_percent / 100) * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const invoice = store.insert('invoices', {
      business_id: appt.business_id, appointment_id: appt.id, customer_id: appt.customer_id,
      invoice_number: store.nextInvoiceNumber(appt.business_id), status: 'draft',
      subtotal, tax_amount: tax, total, amount_paid: 0, balance: total,
      issued_at: null, due_date: null, paid_at: null,
    });
    store.insert('invoice_items', { invoice_id: invoice.id, description: service.name, quantity: 1, unit_price: subtotal, line_total: subtotal, sort_order: 0 });
    return enrichInvoice(invoice);
  },
  async updateDraft(id, { items, taxRatePercent }) {
    await wait();
    const inv = store.table('invoices').find((i) => i.id === id);
    if (inv.status !== 'draft') throw new Error('Only draft invoices can be edited.');
    store.table('invoice_items').filter((it) => it.invoice_id === id).forEach((it) => store.remove('invoice_items', it.id));
    let subtotal = 0;
    items.forEach((item, idx) => {
      const lineTotal = Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100;
      subtotal += lineTotal;
      store.insert('invoice_items', { invoice_id: id, description: item.description, quantity: item.quantity, unit_price: item.unitPrice, line_total: lineTotal, sort_order: idx });
    });
    const tax = Math.round(subtotal * (taxRatePercent / 100) * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const balance = Math.round((total - Number(inv.amount_paid || 0)) * 100) / 100;
    const updated = store.update('invoices', id, { subtotal, tax_amount: tax, total, balance });
    return enrichInvoice(updated);
  },
  async issue(id, dueDays = 7) {
    await wait();
    const now = new Date();
    const due = new Date(now);
    due.setDate(due.getDate() + dueDays);
    const inv = store.update('invoices', id, { status: 'issued', issued_at: now.toISOString(), due_date: due.toISOString().slice(0, 10) });
    const business = store.table('businesses').find((b) => b.id === inv.business_id);
    const owner = store.table('business_members').find((m) => m.business_id === inv.business_id && m.role === 'owner');
    if (owner) {
      store.insert('notifications', { business_id: inv.business_id, user_id: owner.user_id, type: 'invoice_issued', title: 'Invoice issued', message: `Invoice ${inv.invoice_number} was issued.`, entity_type: 'invoice', entity_id: id, read_at: null });
    }
    void business;
    return enrichInvoice(inv);
  },
  async void(id) {
    await wait();
    return enrichInvoice(store.update('invoices', id, { status: 'void' }));
  },
};

// ------------------------------------------------------------ PAYMENTS ---

export const paymentsApi = {
  async list(businessId, { page = 1, pageSize = 10 } = {}) {
    await wait(150);
    const rows = store.table('payments').filter((p) => p.business_id === businessId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = rows.length;
    const paged = rows.slice((page - 1) * pageSize, page * pageSize).map((p) => ({
      ...p,
      customer: store.table('customers').find((c) => c.id === p.customer_id),
      invoice: p.invoice_id ? store.table('invoices').find((i) => i.id === p.invoice_id) : null,
    }));
    return { rows: paged, total };
  },

  // Simulated payment (spec section 27) — never real card data.
  async simulate({ businessId, invoiceId, appointmentId, customerId, amount, method, outcome, actorUserId }) {
    await wait(500); // feels like "processing"
    const status = outcome === 'fail' ? 'failed' : 'successful';
    const payment = store.insert('payments', {
      business_id: businessId, invoice_id: invoiceId || null, appointment_id: appointmentId || null,
      customer_id: customerId, amount, method, status, reference: `SIM-${uid().slice(0, 8).toUpperCase()}`,
      paid_at: status === 'successful' ? new Date().toISOString() : null, created_by: actorUserId || null,
    });

    if (status === 'successful' && invoiceId) {
      const inv = store.table('invoices').find((i) => i.id === invoiceId);
      const amountPaid = Math.round((Number(inv.amount_paid || 0) + Number(amount)) * 100) / 100;
      const balance = Math.round((Number(inv.total) - amountPaid) * 100) / 100;
      const newStatus = balance <= 0 ? 'paid' : 'partially_paid';
      store.update('invoices', invoiceId, { amount_paid: amountPaid, balance: Math.max(balance, 0), status: newStatus, paid_at: balance <= 0 ? new Date().toISOString() : inv.paid_at });
      if (appointmentId) store.update('appointments', appointmentId, { payment_status: balance <= 0 ? 'paid' : 'partially_paid' });
      const owner = store.table('business_members').find((m) => m.business_id === businessId && m.role === 'owner');
      if (owner) {
        store.insert('notifications', { business_id: businessId, user_id: owner.user_id, type: 'payment_recorded', title: 'Payment recorded', message: `A payment was recorded for invoice ${inv.invoice_number}.`, entity_type: 'payment', entity_id: payment.id, read_at: null });
      }
    } else if (status === 'successful' && appointmentId && !invoiceId) {
      store.update('appointments', appointmentId, { payment_status: 'paid' });
    }

    return payment;
  },
};

// -------------------------------------------------------- NOTIFICATIONS ---

export const notificationsApi = {
  async list(businessId, userId, { unreadOnly = false } = {}) {
    await wait(120);
    let rows = store.table('notifications').filter((n) => n.business_id === businessId && (!n.user_id || n.user_id === userId));
    if (unreadOnly) rows = rows.filter((n) => !n.read_at);
    return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  async unreadCount(businessId, userId) {
    const rows = await notificationsApi.list(businessId, userId, { unreadOnly: true });
    return rows.length;
  },
  async markRead(id) {
    await wait(60);
    return store.update('notifications', id, { read_at: new Date().toISOString() });
  },
  async markAllRead(businessId, userId) {
    await wait();
    store.table('notifications').filter((n) => n.business_id === businessId && (!n.user_id || n.user_id === userId) && !n.read_at)
      .forEach((n) => store.update('notifications', n.id, { read_at: new Date().toISOString() }));
  },
};

// ------------------------------------------------------------- REPORTS ---

export const reportsApi = {
  async getDashboardKpis(businessId) {
    await wait(200);
    const appts = store.table('appointments').filter((a) => a.business_id === businessId);
    const invoices = store.table('invoices').filter((i) => i.business_id === businessId);
    const customers = store.table('customers').filter((c) => c.business_id === businessId);
    const now = new Date();
    const todayStr = now.toDateString();
    const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayAppts = appts.filter((a) => new Date(a.start_at).toDateString() === todayStr);
    const upcoming = appts.filter((a) => new Date(a.start_at) > now && BLOCKING_APPOINTMENT_STATUSES.includes(a.status));
    const newCustomersThisMonth = customers.filter((c) => new Date(c.created_at) >= startOfMonth).length;
    const monthlyRevenue = invoices.filter((i) => i.paid_at && new Date(i.paid_at) >= startOfMonth).reduce((s, i) => s + Number(i.amount_paid), 0);
    const outstanding = invoices.filter((i) => i.status !== 'void').reduce((s, i) => s + Number(i.balance || 0), 0);

    const finished = appts.filter((a) => ['completed', 'no_show', 'cancelled'].includes(a.status));
    const nonCancelled = appts.filter((a) => a.status !== 'cancelled');
    const completedCount = appts.filter((a) => a.status === 'completed').length;
    const completionRate = nonCancelled.length ? (completedCount / nonCancelled.length) * 100 : 0;
    const finishedOrNoShow = appts.filter((a) => ['completed', 'no_show'].includes(a.status));
    const noShowCount = appts.filter((a) => a.status === 'no_show').length;
    const noShowRate = finishedOrNoShow.length ? (noShowCount / finishedOrNoShow.length) * 100 : 0;
    const cancelledCount = appts.filter((a) => a.status === 'cancelled').length;
    const cancellationRate = appts.length ? (cancelledCount / appts.length) * 100 : 0;

    const staff = store.table('business_members').filter((m) => m.business_id === businessId && m.role === 'staff');
    const staffUtilization = staff.map((s) => {
      const mine = appts.filter((a) => a.staff_member_id === s.id && a.status !== 'cancelled').length;
      return { staffId: s.id, name: store.table('profiles').find((p) => p.id === s.user_id)?.full_name, count: mine };
    });

    void monthAgo; void finished;

    return {
      appointmentsToday: todayAppts.length,
      upcomingAppointments: upcoming.length,
      newCustomersThisMonth,
      monthlyRevenue,
      outstandingAmount: outstanding,
      completionRate,
      noShowRate,
      cancellationRate,
      staffUtilization,
    };
  },

  async getTodaySchedule(businessId) {
    await wait(150);
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return appointmentsApi.listInRange(businessId, start, end);
  },

  async getRevenueSeries(businessId, days = 30) {
    await wait(200);
    const invoices = store.table('invoices').filter((i) => i.business_id === businessId && i.paid_at);
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const total = invoices.filter((inv) => new Date(inv.paid_at) >= d && new Date(inv.paid_at) < next).reduce((s, inv) => s + Number(inv.amount_paid), 0);
      series.push({ date: d.toISOString().slice(0, 10), revenue: Math.round(total * 100) / 100 });
    }
    return series;
  },

  async getBookingsSeries(businessId, days = 30) {
    await wait(200);
    const appts = store.table('appointments').filter((a) => a.business_id === businessId);
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const count = appts.filter((a) => new Date(a.created_at) >= d && new Date(a.created_at) < next).length;
      series.push({ date: d.toISOString().slice(0, 10), bookings: count });
    }
    return series;
  },

  async getStatusBreakdown(businessId) {
    await wait(150);
    const appts = store.table('appointments').filter((a) => a.business_id === businessId);
    const counts = {};
    appts.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  },

  async getServicePopularity(businessId) {
    await wait(150);
    const appts = store.table('appointments').filter((a) => a.business_id === businessId && a.status !== 'cancelled');
    const counts = {};
    appts.forEach((a) => { counts[a.service_id] = (counts[a.service_id] || 0) + 1; });
    return Object.entries(counts).map(([serviceId, count]) => ({
      name: store.table('services').find((s) => s.id === serviceId)?.name || 'Unknown',
      count,
    })).sort((a, b) => b.count - a.count);
  },

  async getStaffWorkload(businessId) {
    await wait(150);
    const staff = store.table('business_members').filter((m) => m.business_id === businessId && (m.role === 'staff' || m.role === 'admin' || m.role === 'owner'));
    const appts = store.table('appointments').filter((a) => a.business_id === businessId && a.status !== 'cancelled');
    return staff.map((s) => ({
      name: store.table('profiles').find((p) => p.id === s.user_id)?.full_name || 'Unknown',
      count: appts.filter((a) => a.staff_member_id === s.id).length,
    }));
  },

  async getPaymentMethodDistribution(businessId) {
    await wait(150);
    const payments = store.table('payments').filter((p) => p.business_id === businessId && p.status === 'successful');
    const counts = {};
    payments.forEach((p) => { counts[p.method] = (counts[p.method] || 0) + Number(p.amount); });
    return Object.entries(counts).map(([method, amount]) => ({ method, amount: Math.round(amount * 100) / 100 }));
  },

  async getNewCustomersSeries(businessId, days = 30) {
    await wait(150);
    const customers = store.table('customers').filter((c) => c.business_id === businessId);
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const count = customers.filter((c) => new Date(c.created_at) >= d && new Date(c.created_at) < next).length;
      series.push({ date: d.toISOString().slice(0, 10), customers: count });
    }
    return series;
  },
};

export { store as _demoStoreInternal };

// -------------------------------------------------------------- PORTAL ---
// Authenticated-customer-facing queries, scoped by auth user id rather than
// a single business (a customer could in principle have bookings with more
// than one ServiceFlow business).

export const portalApi = {
  async getMyAppointments(userId) {
    await wait(150);
    const customerIds = store.table('customers').filter((c) => c.auth_user_id === userId).map((c) => c.id);
    return store.table('appointments')
      .filter((a) => customerIds.includes(a.customer_id))
      .map(enrichAppointment)
      .sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
  },
  async getMyInvoices(userId) {
    await wait(150);
    const customerIds = store.table('customers').filter((c) => c.auth_user_id === userId).map((c) => c.id);
    return store.table('invoices')
      .filter((i) => customerIds.includes(i.customer_id))
      .map(enrichInvoice)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  async cancelMyAppointment(appointmentId, userId) {
    await wait();
    const appt = store.table('appointments').find((a) => a.id === appointmentId);
    if (!appt) throw new Error('Appointment not found.');
    const customer = store.table('customers').find((c) => c.id === appt.customer_id);
    if (!customer || customer.auth_user_id !== userId) throw new Error('You do not have permission to perform this action.');
    const business = store.table('businesses').find((b) => b.id === appt.business_id);
    const cancellationDeadline = new Date(new Date(appt.start_at).getTime() - business.cancellation_window_hours * 3600000);
    if (new Date() > cancellationDeadline) {
      throw new Error('This appointment is inside the cancellation window and can no longer be cancelled online.');
    }
    const updated = store.update('appointments', appointmentId, { status: 'cancelled' });
    store.insert('appointment_activity', { business_id: appt.business_id, appointment_id: appointmentId, actor_user_id: userId, event_type: 'status_changed', message: 'Cancelled by customer.' });
    return updated;
  },
};
