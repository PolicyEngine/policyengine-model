'use client';

import { useSyncExternalStore } from 'react';

/**
 * SSR-safe media-query subscription using `useSyncExternalStore`.
 *
 * Returns `serverFallback` during SSR / the first render on the client
 * (so the server and client agree on initial markup — no hydration
 * mismatch), then snaps to the real `MediaQueryList.matches` value
 * after mount and stays subscribed to changes.
 *
 * Use this instead of reading `window.matchMedia` in a `useState`
 * initializer — that pattern looks SSR-safe but actually causes
 * hydration mismatches whenever the actual viewport differs from the
 * SSR fallback (which it does on every mobile device).
 */
export function useMediaQuery(query: string, serverFallback: boolean): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}
