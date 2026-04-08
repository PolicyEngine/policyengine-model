import type { NextConfig } from 'next';

const isVercelProduction = process.env.VERCEL_ENV === 'production';

const nextConfig: NextConfig = {
  assetPrefix:
    process.env.NODE_ENV === 'production'
      ? isVercelProduction
        ? 'https://policyengine-model-phi.vercel.app'
        : `https://${process.env.VERCEL_URL}`
      : undefined,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
