import type { NextConfig } from 'next';

const PROD_ORIGIN = 'https://policyengine-model-phi.vercel.app';

const nextConfig: NextConfig = {
  assetPrefix:
    process.env.NODE_ENV === 'production'
      ? (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : PROD_ORIGIN)
      : undefined,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
