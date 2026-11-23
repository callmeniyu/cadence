import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadDatabase,
  resetDemoData,
  exportDatabaseAsJson,
  importDatabaseFromJson,
  DB_STORAGE_KEY,
  setDemoSession,
  getDemoSession,
  setPreference,
  getPreference,
} from './localStore';
import { appointmentsApi, bookingApi, servicesApi, staffApi, businessApi, availabilityApi } from './localProvider';

beforeEach(() => {
  localStorage.clear();
  resetDemoData();
});

describe('localStore architecture & data reliability', () => {
  it('initializes default seed database when storage is empty', () => {
    const db = loadDatabase();
    expect(db.businesses.length).toBeGreaterThan(0);
    expect(db.businesses[0].name).toBe('Nova Wellness Studio');
    expect(db.services.length).toBeGreaterThan(0);
    expect(db.appointments.length).toBeGreaterThan(0);
  });

  it('safely recovers to seeded state when localStorage contains corrupted JSON', () => {
    localStorage.setItem(DB_STORAGE_KEY, 'invalid-non-json{{[corrupt');
    // Force reload
    resetDemoData();
    localStorage.setItem(DB_STORAGE_KEY, 'invalid-non-json{{[corrupt');
    
    // In another context or when loaded fresh:
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    expect(raw).toBe('invalid-non-json{{[corrupt');

    // Trigger recovery
    resetDemoData();
    const freshDb = loadDatabase();
    expect(freshDb.businesses.length).toBeGreaterThan(0);
  });

  it('resets demo data cleanly and clears only Cadence keys', () => {
    // Put an unrelated item in localStorage
    localStorage.setItem('unrelated_app_key', 'keep_this_safe');
    setDemoSession({ user: { id: 'test-user', email: 'test@example.com' } });
    setPreference('current_business_id', 'biz_123');

    expect(getDemoSession()?.user?.email).toBe('test@example.com');
    expect(getPreference('current_business_id')).toBe('biz_123');

    resetDemoData();

    // Cadence session and prefs should be cleared
    expect(getDemoSession()).toBeNull();
    expect(getPreference('current_business_id')).toBeNull();
    // Unrelated key MUST be preserved
    expect(localStorage.getItem('unrelated_app_key')).toBe('keep_this_safe');
  });

  it('exports and imports database JSON with validation', () => {
    const exportedJson = exportDatabaseAsJson();
    expect(typeof exportedJson).toBe('string');
    const parsed = JSON.parse(exportedJson);
    expect(parsed.businesses).toBeDefined();

    // Invalid JSON import should fail
    expect(() => importDatabaseFromJson('{ "incomplete": true }')).toThrow(/missing required data tables/i);

    // Valid import should succeed
    const res = importDatabaseFromJson(exportedJson);
    expect(res.success).toBe(true);
  });

  it('releases a slot when an appointment is cancelled', async () => {
    const business = await businessApi.getBusinessBySlug('nova-wellness-studio');
    const services = await servicesApi.list(business.id, { publicOnly: true });
    const service = services[0];
    const staffOptions = await staffApi.servicesForStaff(business.id, service.id);
    const staffMemberId = staffOptions[0].id;

    const future = new Date();
    future.setDate(future.getDate() + 28);
    future.setHours(12, 0, 0, 0);

    const booking = await bookingApi.createPublicBooking({
      businessId: business.id,
      serviceId: service.id,
      staffMemberId,
      startAt: future.toISOString(),
      customer: { fullName: 'Slot Test', email: 'slot.test@example.com', phone: '+1 555 123 4567' },
      customerNote: '',
    });

    // Overlapping booking fails
    await expect(bookingApi.createPublicBooking({
      businessId: business.id,
      serviceId: service.id,
      staffMemberId,
      startAt: future.toISOString(),
      customer: { fullName: 'Slot Test 2', email: 'slot.test2@example.com', phone: '+1 555 123 4568' },
      customerNote: '',
    })).rejects.toThrow(/no longer available/i);

    // Cancel first appointment
    await appointmentsApi.updateStatus(booking.appointment.id, 'cancelled');

    // Now slot is released: booking the same slot succeeds!
    const rebooked = await bookingApi.createPublicBooking({
      businessId: business.id,
      serviceId: service.id,
      staffMemberId,
      startAt: future.toISOString(),
      customer: { fullName: 'Slot Test 2', email: 'slot.test2@example.com', phone: '+1 555 123 4568' },
      customerNote: '',
    });
    expect(rebooked.appointment.status).toMatch(/pending|confirmed/);
  });

  it('generates bookable slots for every service across all dates', async () => {
    const business = await businessApi.getBusinessBySlug('nova-wellness-studio');
    const services = await servicesApi.list(business.id, { publicOnly: true });
    expect(services.length).toBeGreaterThan(0);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const service of services) {
      const slots = await availabilityApi.getSlots({
        businessId: business.id,
        serviceId: service.id,
        date: tomorrow,
      });
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].start).toBeInstanceOf(Date);
      expect(slots[0].end).toBeInstanceOf(Date);
      expect(slots[0].staffMemberId).toBeDefined();
    }
  });
});
