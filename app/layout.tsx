import type { Metadata } from 'next';
import Script from 'next/script';
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

// Matches the GA4 property used by policyengine-app-v2/website so
// page_view and tool_engaged events from this multizone land in the
// same account as the rest of policyengine.org traffic.
const GA_MEASUREMENT_ID = 'G-2YHG89FY0N';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="policyengine-model-origin" content={prodOrigin} />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body>
        <Suspense>
          <ClientLayout>{children}</ClientLayout>
        </Suspense>
      </body>
    </html>
  );
}
