import { useHashRoute, useSearchParams } from './router';
import AppShell from './components/layout/AppShell';
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

function EmbedSection({
  title,
  subtitle,
  background,
  children,
}: {
  title: string;
  subtitle: string;
  background?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="tw:py-24 tw:font-primary"
      style={background ? { backgroundColor: background } : undefined}
    >
      <div className="tw:max-w-[1200px] tw:mx-auto tw:px-6">
        <div className="tw:mb-12">
          <p className="tw:text-sm tw:font-semibold tw:text-pe-primary-600 tw:uppercase tw:tracking-wider tw:m-0">
            {subtitle}
          </p>
          <h2 className="tw:text-[40px] tw:font-bold tw:text-pe-primary-900 tw:mt-2 tw:mb-0 tw:ml-0 tw:mr-0 tw:leading-[1.2]">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function App() {
  const path = useHashRoute();
  const params = useSearchParams();
  const isEmbed = params.has('embed');
  const country = params.get('country') || 'us';

  // Embed mode: render all sections as a single scroll page without animations
  // (IntersectionObserver doesn't fire reliably in cross-origin iframes)
  if (isEmbed) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <EmbedSection title="How microsimulation works" subtitle="The engine">
          <Walkthrough country={country} />
        </EmbedSection>

        <EmbedSection
          title="Policy rules we model"
          subtitle="Coverage"
          background={colors.background.secondary}
        >
          <RulesOverview country={country} />
        </EmbedSection>

        <EmbedSection title="How we build the data" subtitle="Microdata pipeline">
          <DataPipeline country={country} />
        </EmbedSection>

        <EmbedSection
          title={country === 'uk' ? 'Behavioural responses' : 'Behavioral responses'}
          subtitle="Economic theory"
          background={colors.background.secondary}
        >
          <BehavioralResponses country={country} />
        </EmbedSection>
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
