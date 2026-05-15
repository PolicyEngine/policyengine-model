import TransparencyTable from '../../../src/components/comparison/TransparencyTable';
import { loadComparisonData } from '../../../src/data/comparisons';
import { filterSelectedModels } from '../../../src/components/comparison/filterModels';
import { detectCountryFilter } from '../../../src/components/comparison/detectCountry';

export default async function TransparencyRoute({
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
    <TransparencyTable
      data={{ ...data, models: selectedModels }}
      allModels={allModels}
    />
  );
}
