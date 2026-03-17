import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  assetPrefix:
    process.env.NODE_ENV === 'production'
      ? 'https://policyengine-model-phi.vercel.app'
      : undefined,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
