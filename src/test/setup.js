import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement localStorage's storage event / crypto.randomUUID
// in all environments; ensure a UUID polyfill exists for the demo store.
if (!globalThis.crypto?.randomUUID) {
  globalThis.crypto = globalThis.crypto || {};
  globalThis.crypto.randomUUID = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
