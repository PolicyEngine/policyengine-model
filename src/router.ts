'use client';
import { usePathname } from 'next/navigation';

/** Hook that returns the current route path (compat wrapper around Next.js usePathname). */
export function useHashRoute(): string {
  return usePathname();
}

/** Navigate to a route, preserving query params. */
export function navigate(path: string) {
  const search = window.location.search;
  window.history.pushState(null, '', `${path}${search}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
