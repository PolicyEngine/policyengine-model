import TransparencyTable from '../../../src/components/comparison/TransparencyTable';
import { loadComparisonData } from '../../../src/data/comparisons';

export default function TransparencyRoute() {
  const data = loadComparisonData();
  return <TransparencyTable data={data} />;
}
