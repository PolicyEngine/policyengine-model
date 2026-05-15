import UsageTable from '../../../src/components/comparison/UsageTable';
import { loadComparisonData } from '../../../src/data/comparisons';
import { filterSelectedModels } from '../../../src/components/comparison/filterModels';
import { detectCountry } from '../../../src/components/comparison/detectCountry';

export default async function UsageRoute({
  searchParams,
}: {
  searchParams: Promise<{ models?: string | string[]; country?: string | string[] }>;
}) {
  const data = loadComparisonData();
  const sp = await searchParams;
  const country = await detectCountry(sp.country);
  const countryModels = data.models.filter((m) => m.country === country);
  const selectedModels = filterSelectedModels(data.models, sp.models, country);
  return (
    <UsageTable
      data={{ ...data, models: selectedModels }}
      countryModels={countryModels}
    />
  );
}
