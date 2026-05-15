import type { ReactNode } from 'react';
import Walkthrough from '../components/microsim/Walkthrough';
import PageHeader from '../components/layout/PageHeader';
import type { Country } from '../hooks/useCountry';
import PackageVersions from '../components/microsim/PackageVersions';

export default function OverviewPage({
  country,
  aboutBlock,
}: {
  country: Country;
  /**
   * Server-rendered "About this model" block (transparency, freshness,
   * artifacts, usage). Rendered between the page header and the
   * microsimulation walkthrough. Optional so component tests that mount
   * `<OverviewPage country="us" />` directly still work without having
   * to spin up the comparison data loader.
   */
  aboutBlock?: ReactNode;
}) {
  return (
    <div>
      <PageHeader category="The engine" title="How microsimulation works" />
      {aboutBlock}
      <Walkthrough country={country} />
      <PackageVersions />
    </div>
  );
}
