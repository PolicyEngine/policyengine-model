import RulesOverview from '../../components/rules/RulesOverview';
import PageHeader from '../../components/layout/PageHeader';
import type { Country } from '../../hooks/useCountry';

export default function CoverageTrackerPage({ country }: { country: Country }) {
  return (
    <div>
      <PageHeader category="Rules" title="Coverage tracker" />
      <RulesOverview country={country} />
    </div>
  );
}
