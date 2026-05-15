import 'server-only';
import { headers } from 'next/headers';

/**
 * Detect the active country for a server-rendered comparison page.
 *
 * Resolution order:
 *   1. Explicit `?country=` URL search param (callers pass this in).
 *   2. `x-pe-country` request header set by proxy.ts based on
 *      `/us/...` or `/uk/...` path prefix.
 *   3. `'us'` default for consumers that need a concrete country.
 *
 * Mirrors the client-side `useCountry` hook so the same default applies
 * server-side, avoiding a hydration flicker on country-scoped pages.
 */
export async function detectCountry(
  paramCountry: string | string[] | undefined,
): Promise<'us' | 'uk'> {
  const fromParam = Array.isArray(paramCountry) ? paramCountry[0] : paramCountry;
  if (fromParam === 'us' || fromParam === 'uk') return fromParam;
  if (fromParam === 'all') {
    // Explicit "show all" signal — caller uses this to disable filtering.
    // detectCountry never returns 'all'; let caller branch on the param.
    // Fall through to header/default for filtering callers that ignore 'all'.
  }
  const h = await headers();
  const fromHeader = h.get('x-pe-country');
  if (fromHeader === 'us' || fromHeader === 'uk') return fromHeader;
  return 'us';
}

/**
 * Returns the country to filter by, or `undefined` if the user explicitly
 * requested all countries via `?country=all` or if there is no country
 * signal. Server pages should call this and pass the result to
 * `filterSelectedModels` as its country argument; `undefined` disables
 * country filtering (i.e. shows every model).
 */
export async function detectCountryFilter(
  paramCountry: string | string[] | undefined,
): Promise<'us' | 'uk' | undefined> {
  const v = Array.isArray(paramCountry) ? paramCountry[0] : paramCountry;
  if (v === 'all') return undefined;
  if (v === 'us' || v === 'uk') return v;
  const h = await headers();
  const fromHeader = h.get('x-pe-country');
  if (fromHeader === 'us' || fromHeader === 'uk') return fromHeader;
  return undefined;
}
