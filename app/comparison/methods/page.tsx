import MethodsView from '../../../src/components/comparison/MethodsView';
import { loadComparisonData } from '../../../src/data/comparisons';
import { filterSelectedModels } from '../../../src/components/comparison/filterModels';

export default async function MethodsRoute({
  searchParams,
}: {
  searchParams: Promise<{ models?: string | string[] }>;
}) {
  const data = loadComparisonData();
  const sp = await searchParams;
  const allModels = data.models;
  const selectedModels = filterSelectedModels(allModels, sp.models);
  const selectedIds = new Set(selectedModels.map((m) => m.id));
  return (
    <MethodsView
      data={{
        ...data,
        models: selectedModels,
        imputations: data.imputations.filter((i) => selectedIds.has(i.model)),
        accuracy: data.accuracy.filter((a) => selectedIds.has(a.model)),
      }}
      allModels={allModels}
    />
  );
}
