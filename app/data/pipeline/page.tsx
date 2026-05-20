import PipelinePage from '../../../src/views/data/PipelinePage';
import PageHeader from '../../../src/components/layout/PageHeader';
import PipelineComparison from '../../../src/components/comparison/PipelineComparison';
import { loadComparisonData } from '../../../src/data/comparisons';
import { detectComparePeers } from '../../../src/components/comparison/detectComparePeers';

export default async function PipelineRoute({
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
    return <PipelinePage country={country} />;
  }

  const data = loadComparisonData();
  const activeModelIds = [host, ...parsed.peers];

  return (
    <div>
      <PageHeader category="Data" title="Microdata pipeline" />
      <PipelineComparison data={data} activeModelIds={activeModelIds} />
    </div>
  );
}
