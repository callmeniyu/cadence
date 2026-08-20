import { describe, it, expect } from 'vitest';
import { generateSlots, rangesOverlap } from './slotEngine';

function d(dateStr, h, m) {
  const dt = new Date(dateStr);
  dt.setHours(h, m, 0, 0);
  return dt;
}

describe('rangesOverlap', () => {
  it('detects overlapping ranges', () => {
    expect(rangesOverlap(d('2026-01-01', 9, 0), d('2026-01-01', 10, 0), d('2026-01-01', 9, 30), d('2026-01-01', 10, 30))).toBe(true);
  });
  it('detects non-overlapping adjacent ranges as non-overlapping', () => {
    expect(rangesOverlap(d('2026-01-01', 9, 0), d('2026-01-01', 10, 0), d('2026-01-01', 10, 0), d('2026-01-01', 11, 0))).toBe(false);
  });
});

describe('generateSlots', () => {
  const baseDate = new Date('2026-01-05T00:00:00'); // a Monday, far in the future relative to test run
  const farFutureNow = new Date('2026-01-01T00:00:00');

  it('generates slots within a working window respecting duration and interval', () => {
    const slots = generateSlots({
      date: baseDate,
      workingWindows: [{ startTime: '09:00', endTime: '11:00' }],
      blockedRanges: [],
      existingAppointments: [],
      durationMinutes: 30,
      slotIntervalMinutes: 30,
      leadTimeMinutes: 0,
      now: farFutureNow,
    });
    // 09:00, 09:30, 10:00, 10:30 -> 4 slots (10:30-11:00 is the last that fits)
    expect(slots.length).toBe(4);
    expect(slots[0].start.getHours()).toBe(9);
    expect(slots[slots.length - 1].start.getHours()).toBe(10);
  });

  it('excludes slots that overlap an existing appointment', () => {
    const slots = generateSlots({
      date: baseDate,
      workingWindows: [{ startTime: '09:00', endTime: '11:00' }],
      blockedRanges: [],
      existingAppointments: [{ start: d('2026-01-05', 9, 30), end: d('2026-01-05', 10, 0) }],
      durationMinutes: 30,
      slotIntervalMinutes: 30,
      leadTimeMinutes: 0,
      now: farFutureNow,
    });
    const startHours = slots.map((s) => `${s.start.getHours()}:${s.start.getMinutes()}`);
    expect(startHours).not.toContain('9:30');
  });

  it('excludes slots that overlap a blocked range', () => {
    const slots = generateSlots({
      date: baseDate,
      workingWindows: [{ startTime: '09:00', endTime: '11:00' }],
      blockedRanges: [{ start: d('2026-01-05', 10, 0), end: d('2026-01-05', 10, 30) }],
      existingAppointments: [],
      durationMinutes: 30,
      slotIntervalMinutes: 30,
      leadTimeMinutes: 0,
      now: farFutureNow,
    });
    const startHours = slots.map((s) => `${s.start.getHours()}:${s.start.getMinutes()}`);
    expect(startHours).not.toContain('10:0');
  });

  it('respects lead time by excluding slots too soon from now', () => {
    const now = d('2026-01-05', 8, 50);
    const slots = generateSlots({
      date: baseDate,
      workingWindows: [{ startTime: '09:00', endTime: '11:00' }],
      blockedRanges: [],
      existingAppointments: [],
      durationMinutes: 30,
      slotIntervalMinutes: 30,
      leadTimeMinutes: 60, // must be at least 60 min from now (9:50)
      now,
    });
    expect(slots.every((s) => s.start.getTime() >= now.getTime() + 60 * 60000)).toBe(true);
    expect(slots.some((s) => s.start.getHours() === 9 && s.start.getMinutes() === 0)).toBe(false);
  });

  it('accounts for buffers when packing slots', () => {
    const slots = generateSlots({
      date: baseDate,
      workingWindows: [{ startTime: '09:00', endTime: '10:00' }],
      blockedRanges: [],
      existingAppointments: [],
      durationMinutes: 30,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      slotIntervalMinutes: 30,
      leadTimeMinutes: 0,
      now: farFutureNow,
    });
    // total needed per slot = 50 min; window is 60 min => only 1 slot fits
    expect(slots.length).toBe(1);
  });
});
