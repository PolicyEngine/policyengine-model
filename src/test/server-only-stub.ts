// Stub for `server-only` so vitest can import server-side modules.
// The real package throws at import time when used from a client bundle;
// in tests we treat it as a no-op.
export {};
