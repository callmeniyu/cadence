import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatMoney(amount, currency = 'USD') {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(value, pattern = 'MMM d, yyyy') {
  if (!value) return '';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, pattern);
}

export function formatTime(value, pattern = 'h:mm a') {
  if (!value) return '';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, pattern);
}

export function formatDateTime(value) {
  if (!value) return '';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(value) {
  if (!value) return '';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}
