import BehavioralResponses from '../components/theory/BehavioralResponses';
import PageHeader from '../components/layout/PageHeader';
import type { Country } from '../hooks/useCountry';

export default function BehavioralPage({ country }: { country: Country }) {
  return (
    <div>
      <PageHeader
        category="Economic theory"
        title={country === 'uk' ? 'Behavioural responses' : 'Behavioral responses'}
      />
      <BehavioralResponses country={country} />
    </div>
  );
}
