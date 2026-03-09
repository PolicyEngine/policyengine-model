import Walkthrough from '../components/microsim/Walkthrough';
import PageHeader from '../components/layout/PageHeader';

export default function OverviewPage({ country }: { country: string }) {
  return (
    <div>
      <PageHeader category="The engine" title="How microsimulation works" />
      <Walkthrough country={country} />
    </div>
  );
}
