import { useHashRoute, useSearchParams } from './router';
import AppShell from './components/layout/AppShell';
import OverviewPage from './pages/OverviewPage';
import CoverageTrackerPage from './pages/rules/CoverageTrackerPage';
import ParametersPage from './pages/rules/ParametersPage';
import VariablesPage from './pages/rules/VariablesPage';
import PipelinePage from './pages/data/PipelinePage';
import CalibrationPage from './pages/data/CalibrationPage';
import ValidationPage from './pages/data/ValidationPage';
import BehavioralPage from './pages/BehavioralPage';

export default function App() {
  const path = useHashRoute();
  const params = useSearchParams();
  const isEmbed = params.has('embed');
  const country = params.get('country') || 'us';

  let page: React.ReactNode;
  switch (path) {
    case '/rules/coverage':
      page = <CoverageTrackerPage country={country} />;
      break;
    case '/rules/parameters':
      page = <ParametersPage country={country} />;
      break;
    case '/rules/variables':
      page = <VariablesPage country={country} />;
      break;
    case '/data/pipeline':
      page = <PipelinePage country={country} />;
      break;
    case '/data/calibration':
      page = <CalibrationPage country={country} />;
      break;
    case '/data/validation':
      page = <ValidationPage country={country} />;
      break;
    case '/behavioral':
      page = <BehavioralPage country={country} />;
      break;
    default:
      page = <OverviewPage country={country} />;
      break;
  }

  return (
    <AppShell isEmbed={isEmbed} country={country}>
      {page}
    </AppShell>
  );
}
