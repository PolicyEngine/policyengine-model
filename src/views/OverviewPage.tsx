import Walkthrough from '../components/microsim/Walkthrough';
import PageHeader from '../components/layout/PageHeader';
import type { Country } from '../hooks/useCountry';
import PackageVersions from '../components/microsim/PackageVersions';

export default function OverviewPage({ country }: { country: Country }) {
  return (
    <div>
      <PageHeader category="The engine" title="How microsimulation works" />
      <Walkthrough country={country} />
      <PackageVersions />
    </div>
  );
}
