// Centralized status vocabulary for the whole app.
// Keeping this in one place means the DB CHECK constraints, RLS policies,
// and the UI badges never drift out of sync with each other.

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

// Statuses that occupy a slot on the calendar and must be protected from
// double-booking. Anything not in this list is considered "released".
export const BLOCKING_APPOINTMENT_STATUSES = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.CONFIRMED,
  APPOINTMENT_STATUS.CHECKED_IN,
  APPOINTMENT_STATUS.IN_PROGRESS,
];

export const APPOINTMENT_STATUS_META = {
  pending: { label: 'Pending', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  checked_in: { label: 'Checked In', tone: 'info' },
  in_progress: { label: 'In Progress', tone: 'accent' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  no_show: { label: 'No Show', tone: 'danger' },
};

// Allowed forward transitions. Cancellation is handled separately since it
// can happen from most non-terminal states.
export const APPOINTMENT_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  REFUNDED: 'refunded',
};

export const PAYMENT_STATUS_META = {
  unpaid: { label: 'Unpaid', tone: 'neutral' },
  partially_paid: { label: 'Partially Paid', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'danger' },
};

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  VOID: 'void',
  OVERDUE: 'overdue',
};

export const INVOICE_STATUS_META = {
  draft: { label: 'Draft', tone: 'neutral' },
  issued: { label: 'Issued', tone: 'info' },
  partially_paid: { label: 'Partially Paid', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  void: { label: 'Void', tone: 'neutral' },
  overdue: { label: 'Overdue', tone: 'danger' },
};

export const PAYMENT_METHOD = {
  CASH: 'cash',
  DEMO_CARD: 'demo_card',
  BANK_TRANSFER: 'bank_transfer',
  WALLET: 'wallet',
};

export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  demo_card: 'Demo Card (Simulated)',
  bank_transfer: 'Bank Transfer',
  wallet: 'Wallet',
};

export const PAYMENT_RESULT_STATUS = {
  PENDING: 'pending',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const BUSINESS_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
};

export const BOOKING_SOURCE = {
  PUBLIC_BOOKING: 'public_booking',
  ADMIN: 'admin',
  CUSTOMER_PORTAL: 'customer_portal',
};

export const NOTIFICATION_TYPE = {
  BOOKING_CREATED: 'booking_created',
  BOOKING_CANCELLED: 'booking_cancelled',
  STATUS_CHANGED: 'status_changed',
  INVOICE_ISSUED: 'invoice_issued',
  PAYMENT_RECORDED: 'payment_recorded',
  UPCOMING_REMINDER: 'upcoming_reminder',
  STAFF_ASSIGNMENT: 'staff_assignment',
};

export const BUSINESS_TYPES = [
  { value: 'clinic', label: 'Clinic' },
  { value: 'salon', label: 'Salon' },
  { value: 'gym', label: 'Gym / Fitness' },
  { value: 'training_center', label: 'Training Center' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'repair_service', label: 'Repair / Service' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'other', label: 'Other' },
];

export const WEEKDAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'EGP', 'AED', 'SAR'];
