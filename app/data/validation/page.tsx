import ValidationPage from '../../../src/views/data/ValidationPage';
import ValidationComparison from '../../../src/components/comparison/ValidationComparison';
import { loadComparisonData } from '../../../src/data/comparisons';
import { detectComparePeers } from '../../../src/components/comparison/detectComparePeers';
import { fetchTaxsimValidation } from '../../../src/data/fetchTaxsimValidation';

export default async function ValidationRoute({
  searchParams,
}: {
  searchParams: Promise<{
    compare?: string | string[];
    country?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const { country, host, parsed } = await detectComparePeers(
    sp.compare,
    sp.country,
  );

  if (!parsed.compareMode) {
    const taxsim = country === 'us' ? await fetchTaxsimValidation() : null;
    return <ValidationPage country={country} taxsim={taxsim} />;
  }

  const data = loadComparisonData();
  const activeModelIds = [host, ...parsed.peers];

  return (
    <ValidationComparison data={data} activeModelIds={activeModelIds} />
  );
}
