import 'server-only';
import { headers } from 'next/headers';

export type Country = 'us' | 'uk';

/**
 * Detect the active country for a server-rendered comparison page.
 * Mirrors the client-side `useCountry` hook so SSR matches hydration.
 *
 * Resolution order:
 *   1. `?country=us|uk` URL search param (caller passes this in).
 *   2. `x-pe-country` request header (set by `proxy.ts` for `/us/...`
 *      or `/uk/...` paths, or by the v2 app when it rewrites the
 *      embed).
 *   3. `'us'` default.
 *
 * Country is never `undefined` — every comparison page is scoped to a
 * single country, just like the rules-coverage tab.
 */
export async function detectCountry(
  paramCountry: string | string[] | undefined,
): Promise<Country> {
  const fromParam = Array.isArray(paramCountry) ? paramCountry[0] : paramCountry;
  if (fromParam === 'us' || fromParam === 'uk') return fromParam;
  const h = await headers();
  const fromHeader = h.get('x-pe-country');
  if (fromHeader === 'us' || fromHeader === 'uk') return fromHeader;
  return 'us';
}
