import { describe, it, expect, beforeEach } from 'vitest';
import { resetDemoData } from './demoStore';
import {
  auth, businessApi, servicesApi, staffApi, bookingApi, appointmentsApi,
  invoicesApi, paymentsApi, customersApi,
} from './demoProvider';

beforeEach(() => {
  localStorage.clear();
  resetDemoData();
});

async function loginAsOwner() {
  return auth.signIn({ email: 'owner@novawellness.demo', password: 'demo1234' });
}

describe('auth', () => {
  it('signs in seeded demo accounts', async () => {
    const session = await loginAsOwner();
    expect(session.user.email).toBe('owner@novawellness.demo');
  });

  it('rejects invalid credentials', async () => {
    await expect(auth.signIn({ email: 'owner@novawellness.demo', password: 'wrong' })).rejects.toThrow();
  });

  it('allows a brand-new sign-up and rejects a duplicate email', async () => {
    await auth.signUp({ email: 'new.user@example.test', password: 'password123', fullName: 'New User' });
    await expect(auth.signUp({ email: 'new.user@example.test', password: 'password123', fullName: 'Dup' })).rejects.toThrow(/already exists/i);
  });
});

describe('business workspace', () => {
  it('creates a workspace with the caller as owner and rejects a duplicate slug', async () => {
    const session = await auth.signUp({ email: 'biz.owner@example.test', password: 'password123', fullName: 'Biz Owner' });
    const business = await businessApi.createWorkspace({
      userId: session.user.id, name: 'Test Studio', slug: 'test-studio', businessType: 'wellness',
      phone: '', email: '', address: '', timezone: 'UTC', currency: 'USD',
    });
    expect(business.owner_user_id).toBe(session.user.id);

    const membership = await businessApi.getMembership(business.id, session.user.id);
    expect(membership.role).toBe('owner');

    await expect(businessApi.createWorkspace({
      userId: session.user.id, name: 'Another', slug: 'test-studio', businessType: 'other',
      phone: '', email: '', address: '', timezone: 'UTC', currency: 'USD',
    })).rejects.toThrow(/already taken/i);
  });
});

describe('booking + double-booking protection', () => {
  it('books an available slot successfully', async () => {
    const business = await businessApi.getBusinessBySlug('nova-wellness-studio');
    const services = await servicesApi.list(business.id, { publicOnly: true });
    const service = services[0];
    const staffOptions = await staffApi.servicesForStaff(business.id, service.id);
    const staffMemberId = staffOptions[0].id;

    const future = new Date();
    future.setDate(future.getDate() + 20);
    future.setHours(11, 0, 0, 0);

    const result = await bookingApi.createPublicBooking({
      businessId: business.id, serviceId: service.id, staffMemberId,
      startAt: future.toISOString(),
      customer: { fullName: 'Test Customer', email: 'test.customer@example.test', phone: '+1 555 000 1111' },
      customerNote: '',
    });

    expect(result.appointment.status).toMatch(/pending|confirmed/);
    expect(result.appointment.booking_code).toMatch(/^CAD-/);
  });

  it('rejects a second booking that overlaps an existing one for the same staff member', async () => {
    const business = await businessApi.getBusinessBySlug('nova-wellness-studio');
    const services = await servicesApi.list(business.id, { publicOnly: true });
    const service = services[0];
    const staffOptions = await staffApi.servicesForStaff(business.id, service.id);
    const staffMemberId = staffOptions[0].id;

    const future = new Date();
    future.setDate(future.getDate() + 21);
    future.setHours(11, 0, 0, 0);

    await bookingApi.createPublicBooking({
      businessId: business.id, serviceId: service.id, staffMemberId, startAt: future.toISOString(),
      customer: { fullName: 'First Customer', email: 'first@example.test', phone: '+1 555 000 2222' },
      customerNote: '',
    });

    // Attempt to book the exact same slot, same staff member.
    await expect(bookingApi.createPublicBooking({
      businessId: business.id, serviceId: service.id, staffMemberId, startAt: future.toISOString(),
      customer: { fullName: 'Second Customer', email: 'second@example.test', phone: '+1 555 000 3333' },
      customerNote: '',
    })).rejects.toThrow(/no longer available/i);
  });

  it('finds or reuses an existing customer by email rather than duplicating', async () => {
    const business = await businessApi.getBusinessBySlug('nova-wellness-studio');
    const services = await servicesApi.list(business.id, { publicOnly: true });
    const service = services[1];
    const staffOptions = await staffApi.servicesForStaff(business.id, service.id);
    const staffMemberId = staffOptions[0].id;

    const t1 = new Date(); t1.setDate(t1.getDate() + 22); t1.setHours(11, 0, 0, 0);
    const t2 = new Date(); t2.setDate(t2.getDate() + 23); t2.setHours(11, 0, 0, 0);

    const first = await bookingApi.createPublicBooking({
      businessId: business.id, serviceId: service.id, staffMemberId, startAt: t1.toISOString(),
      customer: { fullName: 'Repeat Customer', email: 'repeat@example.test', phone: '+1 555 000 4444' },
      customerNote: '',
    });
    const second = await bookingApi.createPublicBooking({
      businessId: business.id, serviceId: service.id, staffMemberId, startAt: t2.toISOString(),
      customer: { fullName: 'Repeat Customer', email: 'repeat@example.test', phone: '+1 555 000 4444' },
      customerNote: '',
    });

    expect(first.customer.id).toBe(second.customer.id);
    const { rows } = await customersApi.list(business.id, { search: 'repeat@example.test' });
    expect(rows.length).toBe(1);
  });
});

describe('invoicing math', () => {
  it('computes subtotal/tax/total from the service price and business tax rate, never from client input', async () => {
    const business = await businessApi.getBusinessBySlug('nova-wellness-studio');
    const services = await servicesApi.list(business.id, { publicOnly: true });
    const service = services[0];
    const staffOptions = await staffApi.servicesForStaff(business.id, service.id);
    const staffMemberId = staffOptions[0].id;

    const future = new Date(); future.setDate(future.getDate() + 24); future.setHours(11, 0, 0, 0);
    const { appointment } = await bookingApi.createPublicBooking({
      businessId: business.id, serviceId: service.id, staffMemberId, startAt: future.toISOString(),
      customer: { fullName: 'Invoice Test', email: 'invoice.test@example.test', phone: '+1 555 000 5555' },
      customerNote: '',
    });
    await appointmentsApi.updateStatus(appointment.id, 'confirmed');
    await appointmentsApi.updateStatus(appointment.id, 'checked_in');
    await appointmentsApi.updateStatus(appointment.id, 'in_progress');
    await appointmentsApi.updateStatus(appointment.id, 'completed');

    const invoice = await invoicesApi.createFromAppointment(appointment.id);
    const expectedTax = Math.round(service.price * (business.tax_rate_percent / 100) * 100) / 100;
    expect(invoice.subtotal).toBe(service.price);
    expect(invoice.tax_amount).toBe(expectedTax);
    expect(invoice.total).toBe(Math.round((service.price + expectedTax) * 100) / 100);
  });

  it('rejects invalid appointment status transitions', async () => {
    const business = await businessApi.getBusinessBySlug('nova-wellness-studio');
    const services = await servicesApi.list(business.id, { publicOnly: true });
    const service = services[0];
    const staffOptions = await staffApi.servicesForStaff(business.id, service.id);
    const staffMemberId = staffOptions[0].id;
    const future = new Date(); future.setDate(future.getDate() + 25); future.setHours(11, 0, 0, 0);
    const { appointment } = await bookingApi.createPublicBooking({
      businessId: business.id, serviceId: service.id, staffMemberId, startAt: future.toISOString(),
      customer: { fullName: 'Transition Test', email: 'transition.test@example.test', phone: '+1 555 000 6666' },
      customerNote: '',
    });

    // Directly trying to transition from confirmed/pending to completed should fail
    await expect(appointmentsApi.updateStatus(appointment.id, 'completed')).rejects.toThrow(/invalid status transition/i);
    // Proper transition succeeds
    const updated = await appointmentsApi.updateStatus(appointment.id, 'confirmed');
    expect(updated.status).toBe('confirmed');
  });
});

describe('payments', () => {
  it('applies a successful simulated payment to the invoice balance and flips status to paid', async () => {
    const business = await businessApi.getBusinessBySlug('nova-wellness-studio');
    const services = await servicesApi.list(business.id, { publicOnly: true });
    const service = services[0];
    const staffOptions = await staffApi.servicesForStaff(business.id, service.id);
    const staffMemberId = staffOptions[0].id;
    const future = new Date(); future.setDate(future.getDate() + 26); future.setHours(11, 0, 0, 0);
    const { appointment, customer } = await bookingApi.createPublicBooking({
      businessId: business.id, serviceId: service.id, staffMemberId, startAt: future.toISOString(),
      customer: { fullName: 'Payment Test', email: 'payment.test@example.test', phone: '+1 555 000 7777' },
      customerNote: '',
    });
    await appointmentsApi.updateStatus(appointment.id, 'confirmed');
    await appointmentsApi.updateStatus(appointment.id, 'checked_in');
    await appointmentsApi.updateStatus(appointment.id, 'in_progress');
    await appointmentsApi.updateStatus(appointment.id, 'completed');
    const invoice = await invoicesApi.createFromAppointment(appointment.id);
    await invoicesApi.issue(invoice.id);

    const payment = await paymentsApi.simulate({
      businessId: business.id, invoiceId: invoice.id, appointmentId: appointment.id,
      customerId: customer.id, amount: invoice.total, method: 'cash', outcome: 'success',
    });
    expect(payment.status).toBe('successful');

    const updatedInvoice = await invoicesApi.get(invoice.id);
    expect(updatedInvoice.status).toBe('paid');
    expect(updatedInvoice.balance).toBe(0);
  });

  it('does not touch the invoice balance on a simulated failed payment', async () => {
    const business = await businessApi.getBusinessBySlug('nova-wellness-studio');
    const services = await servicesApi.list(business.id, { publicOnly: true });
    const service = services[0];
    const staffOptions = await staffApi.servicesForStaff(business.id, service.id);
    const staffMemberId = staffOptions[0].id;
    const future = new Date(); future.setDate(future.getDate() + 27); future.setHours(11, 0, 0, 0);
    const { appointment, customer } = await bookingApi.createPublicBooking({
      businessId: business.id, serviceId: service.id, staffMemberId, startAt: future.toISOString(),
      customer: { fullName: 'Fail Payment Test', email: 'fail.payment.test@example.test', phone: '+1 555 000 8888' },
      customerNote: '',
    });
    await appointmentsApi.updateStatus(appointment.id, 'confirmed');
    await appointmentsApi.updateStatus(appointment.id, 'checked_in');
    await appointmentsApi.updateStatus(appointment.id, 'in_progress');
    await appointmentsApi.updateStatus(appointment.id, 'completed');
    const invoice = await invoicesApi.createFromAppointment(appointment.id);
    await invoicesApi.issue(invoice.id);

    await paymentsApi.simulate({
      businessId: business.id, invoiceId: invoice.id, appointmentId: appointment.id,
      customerId: customer.id, amount: invoice.total, method: 'cash', outcome: 'fail',
    });

    const stillUnpaid = await invoicesApi.get(invoice.id);
    expect(stillUnpaid.balance).toBe(invoice.total);
    expect(stillUnpaid.status).toBe('issued');
  });
});
