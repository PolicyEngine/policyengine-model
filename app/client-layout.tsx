'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import AppShell from '../src/components/layout/AppShell';
import Walkthrough from '../src/components/microsim/Walkthrough';
import RulesOverview from '../src/components/rules/RulesOverview';
import DataPipeline from '../src/components/data/DataPipeline';
import BehavioralResponses from '../src/components/theory/BehavioralResponses';
import { colors } from '../src/designTokens';
import { useCountryFromUrl, CountryContext } from '../src/hooks/useCountry';

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
          <h2 className="tw:text-[40px] tw:font-bold tw:text-pe-primary-900 tw:mt-2 tw:mb-0 tw:leading-[1.2]">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.has('embed');
  const country = useCountryFromUrl();

  const embedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isEmbed || !embedRef.current) return;
    const el = embedRef.current;
    const ro = new ResizeObserver(() => {
      window.parent.postMessage({ type: 'policyengine-model-height', height: el.scrollHeight }, '*');
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isEmbed]);

  if (isEmbed) {
    return (
      <CountryContext value={country}>
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
      </CountryContext>
    );
  }

  return (
    <CountryContext value={country}>
      <AppShell country={country}>
        {children}
      </AppShell>
    </CountryContext>
  );
}
