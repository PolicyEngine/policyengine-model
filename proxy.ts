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
 */
export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const match = pathname.match(/^\/(us|uk)(\/.*)?$/);
  if (!match) return NextResponse.next();

  const country = match[1];
  const rest = match[2] ?? '/';

  // Rewrite /us/foo/bar -> /foo/bar (preserving search params) and inject
  // the country header so server components can read it. The browser URL
  // still shows the /us/ prefix, which `useCountryFromUrl` reads
  // client-side after hydration.
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
