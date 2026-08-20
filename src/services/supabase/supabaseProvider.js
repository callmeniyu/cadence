import { supabase } from '../../lib/supabaseClient';
import * as slotEngineMod from '../../utils/slotEngine';

// -----------------------------------------------------------------------
// LIVE SUPABASE PROVIDER
//
// Implements the exact same function surface as ../demo/demoProvider.js so
// the rest of the app (React Query hooks, pages, components) never needs
// to know which provider is active — see ../index.js.
//
// STATUS: written to match supabase/migrations/*.sql and
// supabase/functions/create-public-booking exactly, but NOT executed
// against a live Supabase project in this environment (no credentials
// were supplied). Treat as "implemented, not remotely verified" until run
// against a real project — see PROJECT_PROGRESS.md.
//
// Every mutation that matters for correctness (overlap protection, price/
// duration, invoice numbering, role elevation) is delegated to a Postgres
// RPC or protected by RLS rather than trusted from the browser, per the
// security rules in the spec.
// -----------------------------------------------------------------------

function assertConfigured() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, or use VITE_DEMO_MODE=true.');
  }
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------- AUTH ---

export const auth = {
  async getSession() {
    assertConfigured();
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
  onAuthStateChange(callback) {
    assertConfigured();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  },
  async signUp({ email, password, fullName }) {
    assertConfigured();
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    // A DB trigger (handle_new_user, see 004_functions_triggers.sql) creates
    // the matching `profiles` row automatically on auth.users insert.
    return data.session;
  },
  async signIn({ email, password }) {
    assertConfigured();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  },
  async signOut() {
    assertConfigured();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  async resetPasswordForEmail(email) {
    assertConfigured();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return { sent: true };
  },
  async updatePassword({ password }) {
    assertConfigured();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return { updated: true };
  },
};

// ------------------------------------------------------------ PROFILE ---

export const profileApi = {
  async getProfile(userId) {
    assertConfigured();
    return unwrap(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle());
  },
  async updateProfile(userId, patch) {
    assertConfigured();
    return unwrap(await supabase.from('profiles').update(patch).eq('id', userId).select().single());
  },
};

// ----------------------------------------------------------- BUSINESS ---

export const businessApi = {
  async createWorkspace(payload) {
    assertConfigured();
    // Delegates to the create_business_workspace() SECURITY DEFINER RPC so
    // the browser can never insert an arbitrary owner membership directly.
    const { data, error } = await supabase.rpc('create_business_workspace', {
      p_name: payload.name,
      p_slug: payload.slug,
      p_business_type: payload.businessType,
      p_phone: payload.phone,
      p_email: payload.email,
      p_address: payload.address,
      p_timezone: payload.timezone,
      p_currency: payload.currency,
    });
    if (error) throw error;
    return data; // returns the new business row (see migration for RETURNS)
  },
  async getMyBusinesses(userId) {
    assertConfigured();
    const data = unwrap(await supabase
      .from('business_members')
      .select('*, business:businesses(*)')
      .eq('user_id', userId)
      .eq('active', true));
    return data.map((m) => ({ membership: m, business: m.business }));
  },
  async getBusiness(businessId) {
    assertConfigured();
    return unwrap(await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle());
  },
  async getBusinessBySlug(slug) {
    assertConfigured();
    // Public read is limited to safe columns by the RLS policy on `businesses`.
    return unwrap(await supabase.from('businesses').select('*').eq('slug', slug).eq('active', true).maybeSingle());
  },
  async updateBusiness(businessId, patch) {
    assertConfigured();
    return unwrap(await supabase.from('businesses').update(patch).eq('id', businessId).select().single());
  },
  async getMembership(businessId, userId) {
    assertConfigured();
    return unwrap(await supabase.from('business_members').select('*').eq('business_id', businessId).eq('user_id', userId).maybeSingle());
  },
  async getMembers(businessId) {
    assertConfigured();
    return unwrap(await supabase.from('business_members').select('*, profile:profiles(*)').eq('business_id', businessId));
  },
  async updateMemberRole(memberId, role) {
    assertConfigured();
    // Ownership transfer is intentionally excluded — enforced by RLS/RPC,
    // not just hidden in the UI (see 003_rls.sql, policy business_members_update).
    return unwrap(await supabase.from('business_members').update({ role }).eq('id', memberId).select().single());
  },
  async setMemberActive(memberId, active) {
    assertConfigured();
    return unwrap(await supabase.from('business_members').update({ active }).eq('id', memberId).select().single());
  },
  async inviteMember(businessId, { email, role }) {
    assertConfigured();
    return unwrap(await supabase.from('membership_invitations').insert({ business_id: businessId, email, role, status: 'pending' }).select().single());
  },
};

// ------------------------------------------------------------ SERVICES ---

export const servicesApi = {
  async list(businessId, { activeOnly = false, publicOnly = false } = {}) {
    assertConfigured();
    let query = supabase.from('services').select('*').eq('business_id', businessId).order('name');
    if (activeOnly) query = query.eq('active', true);
    if (publicOnly) query = query.eq('active', true).eq('public_visible', true);
    return unwrap(await query);
  },
  async get(id) {
    assertConfigured();
    return unwrap(await supabase.from('services').select('*').eq('id', id).maybeSingle());
  },
  async create(businessId, payload) {
    assertConfigured();
    return unwrap(await supabase.from('services').insert({ business_id: businessId, ...payload }).select().single());
  },
  async update(id, patch) {
    assertConfigured();
    return unwrap(await supabase.from('services').update(patch).eq('id', id).select().single());
  },
  async remove(id) {
    assertConfigured();
    const { count } = await supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('service_id', id);
    if (count && count > 0) {
      return unwrap(await supabase.from('services').update({ active: false, public_visible: false }).eq('id', id).select().single());
    }
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
    return null;
  },
  async assignedStaff(serviceId) {
    assertConfigured();
    return unwrap(await supabase.from('staff_services').select('member:business_members(*)').eq('service_id', serviceId));
  },
};

// --------------------------------------------------------------- STAFF ---

export const staffApi = {
  async list(businessId) {
    assertConfigured();
    return unwrap(await supabase
      .from('business_members')
      .select('*, profile:profiles(*), staff_services(service_id)')
      .eq('business_id', businessId));
  },
  async get(memberId) {
    assertConfigured();
    return unwrap(await supabase
      .from('business_members')
      .select('*, profile:profiles(*), staff_services(service_id), availability_rules(*), blocked_times(*)')
      .eq('id', memberId).maybeSingle());
  },
  async servicesForStaff(businessId, serviceId) {
    assertConfigured();
    return unwrap(await supabase.from('staff_services').select('member:business_members(*, profile:profiles(*))').eq('business_id', businessId).eq('service_id', serviceId));
  },
  async assignServices(memberId, businessId, serviceIds) {
    assertConfigured();
    await supabase.from('staff_services').delete().eq('member_id', memberId);
    if (serviceIds.length === 0) return;
    const { error } = await supabase.from('staff_services').insert(serviceIds.map((serviceId) => ({ business_id: businessId, member_id: memberId, service_id: serviceId })));
    if (error) throw error;
  },
  async setAvailability(memberId, businessId, rules) {
    assertConfigured();
    await supabase.from('availability_rules').delete().eq('member_id', memberId);
    if (rules.length === 0) return;
    const { error } = await supabase.from('availability_rules').insert(rules.map((r) => ({ business_id: businessId, member_id: memberId, ...r })));
    if (error) throw error;
  },
  async addBlockedTime(memberId, businessId, payload) {
    assertConfigured();
    return unwrap(await supabase.from('blocked_times').insert({ business_id: businessId, member_id: memberId, ...payload }).select().single());
  },
  async removeBlockedTime(id) {
    assertConfigured();
    const { error } = await supabase.from('blocked_times').delete().eq('id', id);
    if (error) throw error;
  },
};

// ----------------------------------------------------------- CUSTOMERS ---

export const customersApi = {
  async list(businessId, { search = '', page = 1, pageSize = 10 } = {}) {
    assertConfigured();
    let query = supabase.from('customers').select('*', { count: 'exact' }).eq('business_id', businessId);
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + pageSize - 1);
    if (error) throw error;
    return { rows: data, total: count || 0 };
  },
  async get(id) {
    assertConfigured();
    return unwrap(await supabase.from('customers').select('*').eq('id', id).maybeSingle());
  },
  async getByAuthUser(businessId, authUserId) {
    assertConfigured();
    return unwrap(await supabase.from('customers').select('*').eq('business_id', businessId).eq('auth_user_id', authUserId).maybeSingle());
  },
  async create(businessId, payload) {
    assertConfigured();
    return unwrap(await supabase.from('customers').insert({ business_id: businessId, ...payload }).select().single());
  },
  async update(id, patch) {
    assertConfigured();
    return unwrap(await supabase.from('customers').update(patch).eq('id', id).select().single());
  },
  async archive(id) {
    assertConfigured();
    return unwrap(await supabase.from('customers').update({ active: false }).eq('id', id).select().single());
  },
};

// -------------------------------------------------------- AVAILABILITY ---

export const availabilityApi = {
  // Slot *display* can be computed client-side from data the member/public
  // policies already allow reading (services, availability_rules,
  // blocked_times, and non-sensitive appointment time ranges). Actual
  // booking authority still lives in the RPCs below.
  async getSlots(params) {
    assertConfigured();
    const { generateSlots } = slotEngineMod;
    const { businessId, serviceId, staffMemberId, date } = params;
    const [{ data: business }, { data: service }, { data: staffLinks }] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', businessId).single(),
      supabase.from('services').select('*').eq('id', serviceId).single(),
      supabase.from('staff_services').select('member_id').eq('business_id', businessId).eq('service_id', serviceId),
    ]);
    const candidateStaff = staffMemberId ? [staffMemberId] : [...new Set((staffLinks || []).map((l) => l.member_id))];
    const weekday = date.getDay();
    const allSlots = [];
    for (const memberId of candidateStaff) {
      const [{ data: windows }, { data: blocked }, { data: appts }] = await Promise.all([
        supabase.from('availability_rules').select('*').eq('member_id', memberId).eq('weekday', weekday).eq('active', true),
        supabase.from('blocked_times').select('*').eq('member_id', memberId),
        supabase.from('appointments').select('start_at,end_at,status').eq('staff_member_id', memberId)
          .in('status', ['pending', 'confirmed', 'checked_in', 'in_progress']),
      ]);
      if (!windows || windows.length === 0) continue;
      const slots = generateSlots({
        date,
        workingWindows: windows,
        blockedRanges: (blocked || []).map((b) => ({ start: new Date(b.start_at), end: new Date(b.end_at) })),
        existingAppointments: (appts || []).map((a) => ({ start: new Date(a.start_at), end: new Date(a.end_at) })),
        durationMinutes: service.duration_minutes,
        bufferBeforeMinutes: service.buffer_before_minutes,
        bufferAfterMinutes: service.buffer_after_minutes,
        slotIntervalMinutes: business.slot_interval_minutes,
        leadTimeMinutes: business.booking_lead_time_minutes,
      });
      slots.forEach((s) => allSlots.push({ ...s, staffMemberId: memberId }));
    }
    return allSlots.sort((a, b) => a.start - b.start);
  },
};

// ------------------------------------------------------------ BOOKING ---

export const bookingApi = {
  // Public, unauthenticated booking goes through the Edge Function so the
  // service-role key (needed to safely upsert a guest customer row and
  // bypass RLS in a controlled way) never touches the browser.
  async createPublicBooking(payload) {
    assertConfigured();
    const { data, error } = await supabase.functions.invoke('create-public-booking', {
      body: {
        business_id: payload.businessId,
        service_id: payload.serviceId,
        staff_member_id: payload.staffMemberId || null,
        start_at: payload.startAt,
        customer: payload.customer,
        customer_note: payload.customerNote || '',
      },
    });
    if (error) throw error;
    return data;
  },
  // Authenticated bookings (portal / admin) use a Postgres RPC that runs
  // under the caller's own JWT/RLS context, so it can only act within
  // businesses/customers the caller is actually allowed to touch.
  async createPortalBooking(payload) {
    assertConfigured();
    const { data, error } = await supabase.rpc('create_authenticated_booking', {
      p_business_id: payload.businessId, p_service_id: payload.serviceId,
      p_staff_member_id: payload.staffMemberId || null, p_start_at: payload.startAt,
      p_customer_note: payload.customerNote || '', p_source: 'customer_portal',
    });
    if (error) throw error;
    return data;
  },
  async createAdminBooking(payload) {
    assertConfigured();
    const { data, error } = await supabase.rpc('create_admin_booking', {
      p_business_id: payload.businessId, p_service_id: payload.serviceId,
      p_staff_member_id: payload.staffMemberId, p_start_at: payload.startAt,
      p_customer_full_name: payload.customer.fullName, p_customer_email: payload.customer.email,
      p_customer_phone: payload.customer.phone, p_customer_note: payload.customerNote || '',
    });
    if (error) throw error;
    return data;
  },
  async getByBookingCode(code) {
    assertConfigured();
    // Public confirmation lookup is limited to public-safe fields by RLS.
    return unwrap(await supabase.from('appointments')
      .select('*, service:services(*), business:businesses(*)')
      .eq('booking_code', code).maybeSingle());
  },
};

// -------------------------------------------------------- APPOINTMENTS ---

export const appointmentsApi = {
  async list(businessId, { search = '', status, serviceId, staffMemberId, dateFrom, dateTo, paymentStatus, page = 1, pageSize = 10 } = {}) {
    assertConfigured();
    let query = supabase.from('appointments')
      .select('*, service:services(*), customer:customers(*), staff:business_members!appointments_staff_member_id_fkey(*, profile:profiles(*))', { count: 'exact' })
      .eq('business_id', businessId);
    if (status) query = query.eq('status', status);
    if (serviceId) query = query.eq('service_id', serviceId);
    if (staffMemberId) query = query.eq('staff_member_id', staffMemberId);
    if (paymentStatus) query = query.eq('payment_status', paymentStatus);
    if (dateFrom) query = query.gte('start_at', dateFrom);
    if (dateTo) query = query.lte('start_at', dateTo);
    if (search) query = query.or(`booking_code.ilike.%${search}%`);
    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.order('start_at', { ascending: false }).range(from, from + pageSize - 1);
    if (error) throw error;
    return { rows: data, total: count || 0 };
  },
  async listInRange(businessId, start, end, filters = {}) {
    assertConfigured();
    let query = supabase.from('appointments')
      .select('*, service:services(*), customer:customers(*), staff:business_members!appointments_staff_member_id_fkey(*, profile:profiles(*))')
      .eq('business_id', businessId).lt('start_at', end.toISOString()).gt('end_at', start.toISOString());
    if (filters.staffMemberId) query = query.eq('staff_member_id', filters.staffMemberId);
    if (filters.status) query = query.eq('status', filters.status);
    return unwrap(await query.order('start_at'));
  },
  async get(id) {
    assertConfigured();
    return unwrap(await supabase.from('appointments')
      .select('*, service:services(*), customer:customers(*), staff:business_members!appointments_staff_member_id_fkey(*, profile:profiles(*)), business:businesses(*)')
      .eq('id', id).maybeSingle());
  },
  async getActivity(appointmentId) {
    assertConfigured();
    return unwrap(await supabase.from('appointment_activity').select('*').eq('appointment_id', appointmentId).order('created_at', { ascending: false }));
  },
  async updateStatus(id, status) {
    assertConfigured();
    // A DB trigger validates the transition and writes the activity/notification row.
    const { data, error } = await supabase.rpc('update_appointment_status', { p_appointment_id: id, p_status: status });
    if (error) throw error;
    return data;
  },
  async updateNotes(id, patch) {
    assertConfigured();
    return unwrap(await supabase.from('appointments').update(patch).eq('id', id).select().single());
  },
  async reassignStaff(id, staffMemberId) {
    assertConfigured();
    // The unique exclusion constraint on (staff_member_id, during) will
    // reject this update at the database level if it overlaps.
    const { data, error } = await supabase.from('appointments').update({ staff_member_id: staffMemberId }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ------------------------------------------------------------ INVOICES ---

export const invoicesApi = {
  async list(businessId, { search = '', status, page = 1, pageSize = 10 } = {}) {
    assertConfigured();
    let query = supabase.from('invoices').select('*, customer:customers(*)', { count: 'exact' }).eq('business_id', businessId);
    if (status) query = query.eq('status', status);
    if (search) query = query.or(`invoice_number.ilike.%${search}%`);
    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + pageSize - 1);
    if (error) throw error;
    return { rows: data, total: count || 0 };
  },
  async get(id) {
    assertConfigured();
    return unwrap(await supabase.from('invoices').select('*, items:invoice_items(*), customer:customers(*), payments(*)').eq('id', id).maybeSingle());
  },
  async createFromAppointment(appointmentId) {
    assertConfigured();
    // Server-side RPC computes subtotal/tax from the authoritative service
    // price and business tax rate — never from a browser-supplied total.
    const { data, error } = await supabase.rpc('create_invoice_from_appointment', { p_appointment_id: appointmentId });
    if (error) throw error;
    return data;
  },
  async updateDraft(id, { items, taxRatePercent }) {
    assertConfigured();
    const { data, error } = await supabase.rpc('update_draft_invoice', {
      p_invoice_id: id, p_items: items, p_tax_rate_percent: taxRatePercent,
    });
    if (error) throw error;
    return data;
  },
  async issue(id) {
    assertConfigured();
    const { data, error } = await supabase.rpc('issue_invoice', { p_invoice_id: id });
    if (error) throw error;
    return data;
  },
  async void(id) {
    assertConfigured();
    return unwrap(await supabase.from('invoices').update({ status: 'void' }).eq('id', id).select().single());
  },
};

// ------------------------------------------------------------ PAYMENTS ---

export const paymentsApi = {
  async list(businessId, { page = 1, pageSize = 10 } = {}) {
    assertConfigured();
    const from = (page - 1) * pageSize;
    const { data, error, count } = await supabase.from('payments').select('*, customer:customers(*), invoice:invoices(*)', { count: 'exact' })
      .eq('business_id', businessId).order('created_at', { ascending: false }).range(from, from + pageSize - 1);
    if (error) throw error;
    return { rows: data, total: count || 0 };
  },
  async simulate(payload) {
    assertConfigured();
    // record_simulated_payment() applies the amount to the invoice balance
    // and flips invoice/appointment status inside a single transaction.
    const { data, error } = await supabase.rpc('record_simulated_payment', {
      p_business_id: payload.businessId, p_invoice_id: payload.invoiceId || null,
      p_appointment_id: payload.appointmentId || null, p_customer_id: payload.customerId,
      p_amount: payload.amount, p_method: payload.method, p_outcome: payload.outcome,
    });
    if (error) throw error;
    return data;
  },
};

// -------------------------------------------------------- NOTIFICATIONS ---

export const notificationsApi = {
  async list(businessId, userId, { unreadOnly = false } = {}) {
    assertConfigured();
    let query = supabase.from('notifications').select('*').eq('business_id', businessId).or(`user_id.eq.${userId},user_id.is.null`);
    if (unreadOnly) query = query.is('read_at', null);
    return unwrap(await query.order('created_at', { ascending: false }));
  },
  async unreadCount(businessId, userId) {
    assertConfigured();
    const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('business_id', businessId).or(`user_id.eq.${userId},user_id.is.null`).is('read_at', null);
    if (error) throw error;
    return count || 0;
  },
  async markRead(id) {
    assertConfigured();
    return unwrap(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).select().single());
  },
  async markAllRead(businessId, userId) {
    assertConfigured();
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('business_id', businessId).or(`user_id.eq.${userId},user_id.is.null`).is('read_at', null);
    if (error) throw error;
  },
};

// ------------------------------------------------------------- REPORTS ---
// These read from the same RLS-protected tables the rest of the app uses;
// for a production deployment with large datasets these would move to SQL
// views or materialized aggregates, noted as a future improvement.

export const reportsApi = {
  async getDashboardKpis(businessId) {
    assertConfigured();
    const { data, error } = await supabase.rpc('get_dashboard_kpis', { p_business_id: businessId });
    if (error) throw error;
    return data;
  },
  async getTodaySchedule(businessId) {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return appointmentsApi.listInRange(businessId, start, end);
  },
  async getRevenueSeries(businessId, days = 30) {
    assertConfigured();
    const { data, error } = await supabase.rpc('get_revenue_series', { p_business_id: businessId, p_days: days });
    if (error) throw error;
    return data;
  },
  async getBookingsSeries(businessId, days = 30) {
    assertConfigured();
    const { data, error } = await supabase.rpc('get_bookings_series', { p_business_id: businessId, p_days: days });
    if (error) throw error;
    return data;
  },
  async getStatusBreakdown(businessId) {
    assertConfigured();
    const { data, error } = await supabase.from('appointments').select('status').eq('business_id', businessId);
    if (error) throw error;
    const counts = {};
    data.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  },
  async getServicePopularity(businessId) {
    assertConfigured();
    const { data, error } = await supabase.rpc('get_service_popularity', { p_business_id: businessId });
    if (error) throw error;
    return data;
  },
  async getStaffWorkload(businessId) {
    assertConfigured();
    const { data, error } = await supabase.rpc('get_staff_workload', { p_business_id: businessId });
    if (error) throw error;
    return data;
  },
  async getPaymentMethodDistribution(businessId) {
    assertConfigured();
    const { data, error } = await supabase.from('payments').select('method, amount').eq('business_id', businessId).eq('status', 'successful');
    if (error) throw error;
    const counts = {};
    data.forEach((p) => { counts[p.method] = (counts[p.method] || 0) + Number(p.amount); });
    return Object.entries(counts).map(([method, amount]) => ({ method, amount }));
  },
  async getNewCustomersSeries(businessId, days = 30) {
    assertConfigured();
    const { data, error } = await supabase.rpc('get_new_customers_series', { p_business_id: businessId, p_days: days });
    if (error) throw error;
    return data;
  },
};

// -------------------------------------------------------------- PORTAL ---
export const portalApi = {
  async getMyAppointments(userId) {
    assertConfigured();
    return unwrap(await supabase.from('appointments')
      .select('*, service:services(*), customer:customers!inner(*), staff:business_members!appointments_staff_member_id_fkey(*, profile:profiles(*)), business:businesses(*)')
      .eq('customer.auth_user_id', userId)
      .order('start_at', { ascending: false }));
  },
  async getMyInvoices(userId) {
    assertConfigured();
    return unwrap(await supabase.from('invoices')
      .select('*, items:invoice_items(*), customer:customers!inner(*), payments(*)')
      .eq('customer.auth_user_id', userId)
      .order('created_at', { ascending: false }));
  },
  async cancelMyAppointment(appointmentId) {
    assertConfigured();
    // cancel_own_appointment() validates ownership + the cancellation window
    // server-side (see 004_functions_triggers.sql) rather than trusting the client.
    const { data, error } = await supabase.rpc('cancel_own_appointment', { p_appointment_id: appointmentId });
    if (error) throw error;
    return data;
  },
};
