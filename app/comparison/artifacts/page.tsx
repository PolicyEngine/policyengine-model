import ArtifactsTable from '../../../src/components/comparison/ArtifactsTable';
import { loadComparisonData } from '../../../src/data/comparisons';
import { filterSelectedModels } from '../../../src/components/comparison/filterModels';
import { detectCountry } from '../../../src/components/comparison/detectCountry';

export default async function ArtifactsRoute({
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
    <ArtifactsTable
      data={{ ...data, models: selectedModels }}
      countryModels={countryModels}
    />
  );
}
