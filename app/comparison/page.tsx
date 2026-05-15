import ComparisonOverview from '../../src/components/comparison/ComparisonOverview';
import { loadComparisonData } from '../../src/data/comparisons';
import { filterSelectedModels } from '../../src/components/comparison/filterModels';
import { detectCountryFilter } from '../../src/components/comparison/detectCountry';

export default async function ComparisonRoute({
  searchParams,
}: {
  searchParams: Promise<{ models?: string | string[]; country?: string | string[] }>;
}) {
  const data = loadComparisonData();
  const sp = await searchParams;
  const allModels = data.models;
  const countryFilter = await detectCountryFilter(sp.country);
  const selectedModels = filterSelectedModels(allModels, sp.models, countryFilter);
  return (
    <ComparisonOverview
      data={{ ...data, models: selectedModels }}
      allModels={allModels}
    />
  );
}
