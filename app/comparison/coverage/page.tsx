import CoverageMatrix from '../../../src/components/comparison/CoverageMatrix';
import { loadComparisonData } from '../../../src/data/comparisons';
import { filterSelectedModels } from '../../../src/components/comparison/filterModels';
import { detectCountryFilter } from '../../../src/components/comparison/detectCountry';

export default async function CoverageRoute({
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
    <CoverageMatrix
      data={{ ...data, models: selectedModels }}
      allModels={allModels}
    />
  );
}
