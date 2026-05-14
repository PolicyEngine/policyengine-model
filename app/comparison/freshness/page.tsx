import FreshnessTable from '../../../src/components/comparison/FreshnessTable';
import { loadComparisonData } from '../../../src/data/comparisons';

export default function FreshnessRoute() {
  const data = loadComparisonData();
  return <FreshnessTable data={data} />;
}
