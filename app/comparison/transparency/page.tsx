import TransparencyTable from '../../../src/components/comparison/TransparencyTable';
import { loadComparisonData } from '../../../src/data/comparisons';
import { filterSelectedModels } from '../../../src/components/comparison/filterModels';

export default async function TransparencyRoute({
  searchParams,
}: {
  searchParams: Promise<{ models?: string | string[] }>;
}) {
  const data = loadComparisonData();
  const sp = await searchParams;
  const allModels = data.models;
  const selectedModels = filterSelectedModels(allModels, sp.models);
  return (
    <TransparencyTable
      data={{ ...data, models: selectedModels }}
      allModels={allModels}
    />
  );
}
