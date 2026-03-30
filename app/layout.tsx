import type { Metadata } from 'next';
import { Suspense } from 'react';
import '../src/index.css';
import ClientLayout from './client-layout';

const origin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://policyengine-model-phi.vercel.app';

export const metadata: Metadata = {
  title: 'PolicyEngine Model',
  icons: {
    icon: `${origin}/icon.svg`,
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
