import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import '../src/index.css';
import ClientLayout from './client-layout';
import { loadComparisonData } from '../src/data/comparisons';
import { hostModelId } from '../src/components/comparison/parseCompare';

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
  // Load the comparison catalogue once at the layout level so the
  // compare drawer (a client component) doesn't have to re-load the
  // YAML on every page. Split per-country here; ClientLayout picks the
  // right list once it knows the active country.
  const data = loadComparisonData();
  const toPeerStub = (m: (typeof data.models)[number]) => ({
    id: m.id,
    name: m.name,
    organization: m.organization,
    sector: m.sector,
    type: m.type,
  });
  const peersByCountry = {
    us: data.models
      .filter((m) => m.country === 'us' && m.id !== hostModelId('us'))
      .map(toPeerStub),
    uk: data.models
      .filter((m) => m.country === 'uk' && m.id !== hostModelId('uk'))
      .map(toPeerStub),
  };
  const hostNames = {
    us: data.models.find((m) => m.id === hostModelId('us'))?.name ?? 'PolicyEngine US',
    uk: data.models.find((m) => m.id === hostModelId('uk'))?.name ?? 'PolicyEngine UK',
  };

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
          <ClientLayout peersByCountry={peersByCountry} hostNames={hostNames}>
            {children}
          </ClientLayout>
        </Suspense>
      </body>
    </html>
  );
}
