import MethodsView from '../../../src/components/comparison/MethodsView';
import { loadComparisonData } from '../../../src/data/comparisons';
import { filterSelectedModels } from '../../../src/components/comparison/filterModels';
import type { ModelingMechanicCategory } from '../../../src/types/comparison';

const ALL_CATEGORIES: ModelingMechanicCategory[] = [
  'architecture',
  'simulation-unit',
  'base-data',
  'data-enhancement',
  'aging-uprating',
  'calibration',
  'take-up',
  'tax-modeling',
  'benefit-modeling',
  'behavioral-response',
  'macro-feedback',
  'health-insurance',
  'dynamic-lifecycle',
  'geography',
  'time-horizon',
  'validation',
  'output',
  'access',
  'other',
];

function parseSelectedCategories(
  raw: string | string[] | undefined,
): Set<ModelingMechanicCategory> | undefined {
  if (raw === undefined) return undefined; // all
  const v = Array.isArray(raw) ? raw[0] : raw;
  const ids = v.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return new Set(); // explicitly empty = none
  const valid = new Set(ALL_CATEGORIES as string[]);
  return new Set(
    ids.filter((id) => valid.has(id)) as ModelingMechanicCategory[],
  );
}

export default async function MethodsRoute({
  searchParams,
}: {
  searchParams: Promise<{
    models?: string | string[];
    country?: string | string[];
    categories?: string | string[];
  }>;
}) {
  const data = loadComparisonData();
  const sp = await searchParams;
  const allModels = data.models;
  const selectedModels = filterSelectedModels(allModels, sp.models, sp.country);
  const selectedIds = new Set(selectedModels.map((m) => m.id));
  const selectedCategories = parseSelectedCategories(sp.categories);
  return (
    <MethodsView
      data={{
        ...data,
        models: selectedModels,
        imputations: data.imputations.filter((i) => selectedIds.has(i.model)),
        accuracy: data.accuracy.filter((a) => selectedIds.has(a.model)),
        modeling: data.modeling.filter((m) => selectedIds.has(m.model)),
      }}
      allModels={allModels}
      selectedCategories={selectedCategories}
    />
  );
}
