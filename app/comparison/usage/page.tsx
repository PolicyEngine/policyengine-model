import UsageTable from '../../../src/components/comparison/UsageTable';
import { loadComparisonData } from '../../../src/data/comparisons';
import { filterSelectedModels } from '../../../src/components/comparison/filterModels';

export default async function UsageRoute({
  searchParams,
}: {
  searchParams: Promise<{ models?: string | string[]; country?: string | string[] }>;
}) {
  const data = loadComparisonData();
  const sp = await searchParams;
  const allModels = data.models;
  const selectedModels = filterSelectedModels(allModels, sp.models, sp.country);
  return (
    <UsageTable
      data={{ ...data, models: selectedModels }}
      allModels={allModels}
    />
  );
}
