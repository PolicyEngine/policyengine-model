import BehavioralPageClient from '../../src/views/BehavioralPageClient';
import BehavioralComparison from '../../src/components/comparison/BehavioralComparison';
import PageHeader from '../../src/components/layout/PageHeader';
import { loadComparisonData } from '../../src/data/comparisons';
import { detectComparePeers } from '../../src/components/comparison/detectComparePeers';

export default async function BehavioralRoute({
  searchParams,
}: {
  searchParams: Promise<{
    compare?: string | string[];
    country?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const { country, host, parsed } = await detectComparePeers(
    sp.compare,
    sp.country,
  );

  if (!parsed.compareMode) {
    return <BehavioralPageClient country={country} />;
  }

  const data = loadComparisonData();
  const order = [host, ...parsed.peers];
  const orderIndex = new Map(order.map((id, i) => [id, i]));
  const filteredModels = data.models
    .filter((m) => orderIndex.has(m.id))
    .sort(
      (a, b) =>
        (orderIndex.get(a.id) ?? Infinity) - (orderIndex.get(b.id) ?? Infinity),
    );

  return (
    <div>
      <PageHeader
        category="Economic theory"
        title={country === 'uk' ? 'Behavioural responses' : 'Behavioral responses'}
      />
      <BehavioralComparison
        data={{ ...data, models: filteredModels }}
        activeModelIds={order}
      />
    </div>
  );
}
