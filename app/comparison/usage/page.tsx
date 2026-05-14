import UsageTable from '../../../src/components/comparison/UsageTable';
import { loadComparisonData } from '../../../src/data/comparisons';

export default function UsageRoute() {
  const data = loadComparisonData();
  return <UsageTable data={data} />;
}
