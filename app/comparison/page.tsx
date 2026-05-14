import ComparisonOverview from '../../src/components/comparison/ComparisonOverview';
import { loadComparisonData } from '../../src/data/comparisons';

export default function ComparisonRoute() {
  const data = loadComparisonData();
  return <ComparisonOverview data={data} />;
}
