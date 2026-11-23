export function uid(prefix = '') {
  const raw = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return prefix ? `${prefix}_${raw}` : raw;
}

// Generates a readable, non-sequential public booking code, e.g. CAD-7K2P9Q
export function generateBookingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `CAD-${code}`;
}

export function generateInvoiceNumber(year, sequence) {
  return `INV-${year}-${String(sequence).padStart(5, '0')}`;
}
