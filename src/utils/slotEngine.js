import { addMinutes, isBefore, isAfter, startOfDay, setHours, setMinutes, isSameDay } from 'date-fns';

// Shared slot-generation algorithm.
//
// This mirrors the flow documented in the spec (section 94):
// 1. load service duration + buffers
// 2. load business/staff working windows
// 3. apply date-specific blocked times
// 4. apply minimum lead time
// 5. load active (blocking) appointments
// 6. generate interval candidates
// 7. remove conflicts
// 8. return remaining slots
//
// IMPORTANT: this is only used to give the customer a pleasant list of
// candidate times. It is NOT the source of truth for whether a slot can
// actually be booked — the database (exclusion constraint + booking RPC)
// makes that decision atomically at insert time. See
// supabase/migrations/004_functions_triggers.sql.

export function generateSlots({
  date, // JS Date, the calendar day being viewed (business-local midnight)
  workingWindows, // [{ startTime: 'HH:mm', endTime: 'HH:mm' }]
  blockedRanges, // [{ start: Date, end: Date }]
  existingAppointments, // [{ start: Date, end: Date }] blocking ones only
  durationMinutes,
  bufferBeforeMinutes = 0,
  bufferAfterMinutes = 0,
  slotIntervalMinutes = 30,
  leadTimeMinutes = 60,
  now = new Date(),
}) {
  const slots = [];
  const earliestBookable = addMinutes(now, leadTimeMinutes);
  const totalNeeded = durationMinutes + bufferBeforeMinutes + bufferAfterMinutes;

  for (const window of workingWindows) {
    const [startH, startM] = window.startTime.split(':').map(Number);
    const [endH, endM] = window.endTime.split(':').map(Number);
    let cursor = setMinutes(setHours(startOfDay(date), startH), startM);
    const windowEnd = setMinutes(setHours(startOfDay(date), endH), endM);

    while (true) {
      const candidateStart = addMinutes(cursor, bufferBeforeMinutes);
      const candidateEnd = addMinutes(candidateStart, durationMinutes);
      const occupiedEnd = addMinutes(cursor, totalNeeded);
      if (isAfter(occupiedEnd, windowEnd)) break;

      const withinLeadTime = isBefore(candidateStart, earliestBookable);
      const overlapsBlocked = blockedRanges.some(
        (b) => isBefore(cursor, b.end) && isAfter(occupiedEnd, b.start)
      );
      const overlapsAppointment = existingAppointments.some(
        (a) => isBefore(cursor, a.end) && isAfter(occupiedEnd, a.start)
      );

      if (!withinLeadTime && !overlapsBlocked && !overlapsAppointment) {
        slots.push({ start: candidateStart, end: candidateEnd });
      }
      cursor = addMinutes(cursor, slotIntervalMinutes);
    }
  }

  return slots.sort((a, b) => a.start - b.start);
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return isBefore(aStart, bEnd) && isAfter(aEnd, bStart);
}

export function isToday(date) {
  return isSameDay(date, new Date());
}
