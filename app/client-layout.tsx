'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import AppShell from '../src/components/layout/AppShell';
import Walkthrough from '../src/components/microsim/Walkthrough';
import RulesOverview from '../src/components/rules/RulesOverview';
import DataPipeline from '../src/components/data/DataPipeline';
import BehavioralResponses from '../src/components/theory/BehavioralResponses';
import { colors } from '../src/designTokens';

function EmbedSection({
  title,
  subtitle,
  background,
  children,
}: {
  title: string;
  subtitle: string;
  background?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="tw:py-24 tw:font-primary"
      style={background ? { backgroundColor: background } : undefined}
    >
      <div className="tw:max-w-[1200px] tw:mx-auto tw:px-6">
        <div className="tw:mb-12">
          <p className="tw:text-sm tw:font-semibold tw:text-pe-primary-600 tw:uppercase tw:tracking-wider tw:m-0">
            {subtitle}
          </p>
          <h2 className="tw:text-[40px] tw:font-bold tw:text-pe-primary-900 tw:mt-2 tw:mb-0 tw:ml-0 tw:mr-0 tw:leading-[1.2]">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function extractCountryFromPath(pathname: string): string | null {
  const VALID_COUNTRIES = new Set(['us', 'uk']);
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && VALID_COUNTRIES.has(segments[0])) {
    return segments[0];
  }
  return null;
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.has('embed');
  const country = searchParams.get('country') || extractCountryFromPath(pathname) || 'us';

  const embedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isEmbed || !embedRef.current) return;
    const ro = new ResizeObserver(() => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'policyengine-model-height', height }, '*');
    });
    ro.observe(embedRef.current);
    return () => ro.disconnect();
  }, [isEmbed]);

  if (isEmbed) {
    return (
      <div ref={embedRef} style={{ minHeight: '100vh' }}>
        <EmbedSection title="How microsimulation works" subtitle="The engine">
          <Walkthrough country={country} />
        </EmbedSection>
        <EmbedSection
          title="Policy rules we model"
          subtitle="Coverage"
          background={colors.background.secondary}
        >
          <RulesOverview country={country} />
        </EmbedSection>
        <EmbedSection title="How we build the data" subtitle="Microdata pipeline">
          <DataPipeline country={country} />
        </EmbedSection>
        <EmbedSection
          title={country === 'uk' ? 'Behavioural responses' : 'Behavioral responses'}
          subtitle="Economic theory"
          background={colors.background.secondary}
        >
          <BehavioralResponses country={country} />
        </EmbedSection>
      </div>
    );
  }

  return (
    <AppShell isEmbed={false} country={country}>
      {children}
    </AppShell>
  );
}
