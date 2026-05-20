import CalibrationPage from '../../../src/views/data/CalibrationPageClient';
import CalibrationComparison from '../../../src/components/comparison/CalibrationComparison';
import { loadComparisonData } from '../../../src/data/comparisons';
import { detectComparePeers } from '../../../src/components/comparison/detectComparePeers';

export default async function CalibrationRoute({
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
    return <CalibrationPage country={country} />;
  }

  const data = loadComparisonData();
  const activeIds = [host, ...parsed.peers];
  const activeSet = new Set(activeIds);
  const filteredModels = data.models.filter((m) => activeSet.has(m.id));
  const filteredImputations = data.imputations.filter((i) =>
    activeSet.has(i.model),
  );

  return (
    <CalibrationComparison
      data={{
        ...data,
        models: filteredModels,
        imputations: filteredImputations,
      }}
      activeModelIds={activeIds}
    />
  );
}
