import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  assetPrefix:
    process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
