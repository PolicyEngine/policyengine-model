import type { Metadata } from 'next';
import { Suspense } from 'react';
import '../src/index.css';
import ClientLayout from './client-layout';

const prodOrigin =
  process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : '';

export const metadata: Metadata = {
  title: 'PolicyEngine Model',
  icons: {
    icon: `${prodOrigin}/icon.svg`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense>
          <ClientLayout>{children}</ClientLayout>
        </Suspense>
      </body>
    </html>
  );
}
