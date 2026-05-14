import ArtifactsTable from '../../../src/components/comparison/ArtifactsTable';
import { loadComparisonData } from '../../../src/data/comparisons';
import { filterSelectedModels } from '../../../src/components/comparison/filterModels';

export default async function ArtifactsRoute({
  searchParams,
}: {
  searchParams: Promise<{ models?: string | string[] }>;
}) {
  const data = loadComparisonData();
  const sp = await searchParams;
  const allModels = data.models;
  const selectedModels = filterSelectedModels(allModels, sp.models);
  return (
    <ArtifactsTable
      data={{ ...data, models: selectedModels }}
      allModels={allModels}
    />
  );
}
