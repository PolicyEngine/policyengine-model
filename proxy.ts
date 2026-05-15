import { NextRequest, NextResponse } from 'next/server';

/**
 * When the model app is embedded under a country-scoped path
 * (`/us/model/...` or `/uk/model/...` in policyengine-app-v2), inject
 * the detected country as the `x-pe-country` header so server components
 * can filter without waiting for client hydration.
 */
export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const match = pathname.match(/^\/(us|uk)(\/|$)/);
  if (!match) return NextResponse.next();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pe-country', match[1]);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Match all paths except Next.js internals and static assets.
  matcher: ['/((?!_next|.*\\..*).*)'],
};
