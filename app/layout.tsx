import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import '../src/index.css';
import ClientLayout from './client-layout';

export const metadata: Metadata = {
  title: 'PolicyEngine Model',
};

// Matches the GA4 property used by policyengine-app-v2/website so
// page_view and tool_engaged events from this multizone land in the
// same account as the rest of policyengine.org traffic.
const GA_MEASUREMENT_ID = 'G-2YHG89FY0N';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
