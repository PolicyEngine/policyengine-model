import ValidationPage from '../../../src/views/data/ValidationPage';
import ValidationComparison from '../../../src/components/comparison/ValidationComparison';
import { loadComparisonData } from '../../../src/data/comparisons';
import { detectComparePeers } from '../../../src/components/comparison/detectComparePeers';
import UkValidationPage from '../../../src/views/data/UkValidationPage';

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

  // The UK page reports the pinned UK release; TAXSIM covers US taxes only.
  if (!parsed.compareMode && country === 'uk') {
    return <UkValidationPage />;
  }

  if (!parsed.compareMode) {
    return <ValidationPage country={country} />;
  }

  const data = loadComparisonData();
  const activeModelIds = [host, ...parsed.peers];

  return (
    <ValidationComparison data={data} activeModelIds={activeModelIds} />
  );
}
