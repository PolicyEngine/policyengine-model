import RulesOverview from '../../components/rules/RulesOverview';
import PageHeader from '../../components/layout/PageHeader';

export default function CoverageTrackerPage({ country }: { country: string }) {
  return (
    <div>
      <PageHeader category="Rules" title="Coverage tracker" />
      <RulesOverview country={country} />
    </div>
  );
}
