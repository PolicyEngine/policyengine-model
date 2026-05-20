import { NextRequest, NextResponse } from 'next/server';

/**
 * Country routing for the model app.
 *
 * Two integration paths:
 *
 *   1. Embedded in policyengine-app-v2 at `/{countryId}/model/...`:
 *      v2's rewrite strips the prefix, so this app sees plain
 *      `/{path}`. v2 forwards `?country=us|uk` so client components
 *      (and `useCountry`) can read it. Server components also accept
 *      the `x-pe-country` header set below.
 *
 *   2. Standalone preview at `/us/{path}` or `/uk/{path}`: this proxy
 *      rewrites to `/{path}` and injects `x-pe-country` so the same
 *      server code path works.
 *
 * Country is never "all" — every comparison page is scoped to one
 * country, matching the rules-coverage tab. Default is `us` when no
 * signal is present.
 *
 * Legacy `/comparison/*` URLs (from before the comparison was unified
 * into the model page via `?compare=`) are redirected to their new
 * model-section homes here so middleware fires before the next.config
 * `redirects()` (which only runs after middleware rewrites — too late
 * to redirect a country-prefixed path).
 */

/** Old /comparison/* path → new model-section path with ?compare=all. */
const LEGACY_COMPARISON_DESTINATIONS: Record<string, string> = {
  '/comparison': '/?compare=all',
  '/comparison/coverage': '/rules/coverage?compare=all',
  '/comparison/methods': '/data/calibration?compare=all',
  '/comparison/transparency': '/?compare=all',
  '/comparison/freshness': '/?compare=all',
  '/comparison/artifacts': '/?compare=all',
  '/comparison/usage': '/?compare=all',
};

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const match = pathname.match(/^\/(us|uk)(\/.*)?$/);

  // 1. No country prefix → fall through to next.config redirects /
  //    static routing. Country-less legacy `/comparison/*` redirects
  //    live in next.config.ts.
  if (!match) return NextResponse.next();

  const country = match[1];
  const rest = match[2] ?? '/';

  // 2. Country-prefixed legacy `/{country}/comparison/*` paths: emit
  //    a 308 to the country-preserved new path. (next.config redirects
  //    can't see country-prefixed paths because this middleware would
  //    have already stripped the prefix below.)
  if (LEGACY_COMPARISON_DESTINATIONS[rest]) {
    const dest = LEGACY_COMPARISON_DESTINATIONS[rest];
    const target = `/${country}${dest}`;
    const url = req.nextUrl.clone();
    const [path, query] = target.split('?');
    url.pathname = path;
    // Merge the legacy `?compare=all` into existing search params.
    if (query) {
      for (const [k, v] of new URLSearchParams(query)) {
        url.searchParams.set(k, v);
      }
    }
    return NextResponse.redirect(url, 308);
  }

  // 3. Default: rewrite /us/foo/bar -> /foo/bar (preserving search
  //    params) and inject the country header. The browser URL still
  //    shows the /us/ prefix, which `useCountryFromUrl` reads
  //    client-side after hydration.
  const url = req.nextUrl.clone();
  url.pathname = rest;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pe-country', country);

  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  // Match all paths except Next.js internals and static assets.
  matcher: ['/((?!_next|.*\\..*).*)'],
};
