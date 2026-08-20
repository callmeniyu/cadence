// Backend Error Mapping (spec section 93): translate technical/provider
// errors into short, calm, user-facing copy. Never leak raw SQL / stack
// details to the UI.

const PATTERNS = [
  { test: /exclusion|overlap|conflict|duplicate key.*appointments/i, message: 'That time slot is no longer available. Please choose another time.' },
  { test: /row-level security|permission denied|rls/i, message: 'You do not have permission to perform this action.' },
  { test: /jwt|not authenticated|auth session missing/i, message: 'Your session has expired. Please sign in again.' },
  { test: /network|fetch failed|failed to fetch/i, message: 'We could not reach the service. Please check your connection and try again.' },
  { test: /unique constraint.*slug/i, message: 'That business URL is already taken. Please choose another.' },
  { test: /unique constraint.*email/i, message: 'An account with that email already exists.' },
];

export function toFriendlyError(error) {
  const raw = error?.message || error?.error_description || String(error || 'Unknown error');
  const match = PATTERNS.find((p) => p.test.test(raw));
  return match ? match.message : raw.length > 160 ? 'Something went wrong. Please try again.' : raw;
}
