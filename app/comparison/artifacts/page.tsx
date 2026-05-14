import ArtifactsTable from '../../../src/components/comparison/ArtifactsTable';
import { loadComparisonData } from '../../../src/data/comparisons';

export default function ArtifactsRoute() {
  const data = loadComparisonData();
  return <ArtifactsTable data={data} />;
}
