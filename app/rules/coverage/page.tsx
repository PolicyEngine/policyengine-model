import CoverageTrackerPage from '../../../src/views/rules/CoverageTrackerPage';
import CoverageMatrix from '../../../src/components/comparison/CoverageMatrix';
import PageHeader from '../../../src/components/layout/PageHeader';
import { loadComparisonData } from '../../../src/data/comparisons';
import { detectComparePeers } from '../../../src/components/comparison/detectComparePeers';

/**
 * Coverage route — branches on `?compare=`. Empty (PE-only) renders the
 * existing client `CoverageTrackerPage` unchanged; non-empty renders
 * the `CoverageMatrix` filtered to the host PE model plus selected
 * peers, preserving host-first row order.
 */
export default async function CoverageRoute({
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
    return <CoverageTrackerPage country={country} />;
  }

  const data = loadComparisonData();
  const order = [host, ...parsed.peers];
  const orderIndex = new Map(order.map((id, i) => [id, i]));
  const filteredModels = data.models
    .filter((m) => orderIndex.has(m.id))
    .sort(
      (a, b) =>
        (orderIndex.get(a.id) ?? Infinity) -
        (orderIndex.get(b.id) ?? Infinity),
    );

  return (
    <div>
      <PageHeader category="Rules" title="Coverage tracker" />
      <CoverageMatrix data={{ ...data, models: filteredModels }} />
    </div>
  );
}
