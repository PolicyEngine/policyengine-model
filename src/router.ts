import { useSyncExternalStore } from 'react';

/** Parse the hash path, e.g. "#/rules/coverage" → "/rules/coverage" */
function getHashPath(): string {
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') return '/';
  return hash.startsWith('#/') ? hash.slice(1) : hash.slice(1);
}

function getSearchString(): string {
  return window.location.search;
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyListeners() {
  for (const cb of listeners) cb();
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', notifyListeners);
  window.addEventListener('popstate', notifyListeners);
}

/** Navigate to a hash route, preserving query params. */
export function navigate(path: string) {
  const search = window.location.search;
  window.history.pushState(null, '', `${search}#${path}`);
  notifyListeners();
}

/** Hook that returns the current hash route path. */
export function useHashRoute(): string {
  return useSyncExternalStore(subscribe, getHashPath);
}

/** Hook that returns current URL search params, reactive to URL changes. */
export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, getSearchString);
  return new URLSearchParams(search);
}
