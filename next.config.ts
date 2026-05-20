import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  assetPrefix:
    process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
  turbopack: {
    root: process.cwd(),
  },
  // Legacy /comparison/* routes redirect into the corresponding model
  // section with `?compare=all`, mirroring the new unified design
  // where comparison is a lens (drawer-controlled URL param) on the
  // existing pages rather than a separate hierarchy.
  //
  // Note: country-prefixed variants like `/us/comparison/coverage` are
  // handled by `proxy.ts` (Next.js middleware runs before redirects(),
  // so the country prefix has been stripped before this rule fires).
  // Keep this list in sync with `LEGACY_COMPARISON_DESTINATIONS` in
  // `proxy.ts`.
  async redirects() {
    return [
      {
        source: '/comparison/coverage',
        destination: '/rules/coverage?compare=all',
        permanent: true,
      },
      {
        source: '/comparison/methods',
        destination: '/data/calibration?compare=all',
        permanent: true,
      },
      // Transparency / Freshness / Artifacts / Usage now live in the
      // Overview's "About this model" block. Send all four (plus the
      // top-level /comparison) to the Overview with peers expanded.
      {
        source: '/comparison/transparency',
        destination: '/?compare=all',
        permanent: true,
      },
      {
        source: '/comparison/freshness',
        destination: '/?compare=all',
        permanent: true,
      },
      {
        source: '/comparison/artifacts',
        destination: '/?compare=all',
        permanent: true,
      },
      {
        source: '/comparison/usage',
        destination: '/?compare=all',
        permanent: true,
      },
      {
        source: '/comparison',
        destination: '/?compare=all',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
