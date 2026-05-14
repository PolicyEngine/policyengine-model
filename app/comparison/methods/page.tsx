import MethodsView from '../../../src/components/comparison/MethodsView';
import { loadComparisonData } from '../../../src/data/comparisons';

export default function MethodsRoute() {
  const data = loadComparisonData();
  return <MethodsView data={data} />;
}
