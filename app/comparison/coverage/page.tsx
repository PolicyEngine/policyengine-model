import CoverageMatrix from '../../../src/components/comparison/CoverageMatrix';
import { loadComparisonData } from '../../../src/data/comparisons';

export default function CoverageRoute() {
  const data = loadComparisonData();
  return <CoverageMatrix data={data} />;
}
