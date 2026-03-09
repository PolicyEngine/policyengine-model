import { useHashRoute, useSearchParams } from './router';
import AppShell from './components/layout/AppShell';
import SectionContainer from './components/layout/SectionContainer';
import Walkthrough from './components/microsim/Walkthrough';
import RulesOverview from './components/rules/RulesOverview';
import DataPipeline from './components/data/DataPipeline';
import BehavioralResponses from './components/theory/BehavioralResponses';
import { colors } from './designTokens';
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

  // Embed mode: render all sections as a single scroll page (matches pre-sidebar layout)
  if (isEmbed) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <SectionContainer
          id="microsim"
          title="How microsimulation works"
          subtitle="The engine"
        >
          <Walkthrough country={country} />
        </SectionContainer>

        <SectionContainer
          id="rules"
          title="Policy rules we model"
          subtitle="Coverage"
          background={colors.background.secondary}
        >
          <RulesOverview country={country} />
        </SectionContainer>

        <SectionContainer
          id="data"
          title="How we build the data"
          subtitle="Microdata pipeline"
        >
          <DataPipeline country={country} />
        </SectionContainer>

        <SectionContainer
          id="theory"
          title={country === 'uk' ? 'Behavioural responses' : 'Behavioral responses'}
          subtitle="Economic theory"
          background={colors.background.secondary}
        >
          <BehavioralResponses country={country} />
        </SectionContainer>
      </div>
    );
  }

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
