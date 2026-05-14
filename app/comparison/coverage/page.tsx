import CoverageMatrix from '../../../src/components/comparison/CoverageMatrix';
import { loadComparisonData } from '../../../src/data/comparisons';
import { filterSelectedModels } from '../../../src/components/comparison/filterModels';

export default async function CoverageRoute({
  searchParams,
}: {
  searchParams: Promise<{ models?: string | string[]; country?: string | string[] }>;
}) {
  const data = loadComparisonData();
  const sp = await searchParams;
  const allModels = data.models;
  const selectedModels = filterSelectedModels(allModels, sp.models, sp.country);
  return (
    <CoverageMatrix
      data={{ ...data, models: selectedModels }}
      allModels={allModels}
    />
  );
}
