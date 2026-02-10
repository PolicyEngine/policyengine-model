import StickyNav from './components/layout/StickyNav';
import SectionContainer from './components/layout/SectionContainer';
import Footer from './components/layout/Footer';
import Walkthrough from './components/microsim/Walkthrough';
import RulesOverview from './components/rules/RulesOverview';
import DataPipeline from './components/data/DataPipeline';
import BehavioralResponses from './components/theory/BehavioralResponses';
import { colors } from './designTokens';

export default function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <StickyNav />

      <SectionContainer
        id="microsim"
        title="How microsimulation works"
        subtitle="The engine"
      >
        <Walkthrough />
      </SectionContainer>

      <SectionContainer
        id="rules"
        title="Policy rules we model"
        subtitle="Coverage"
        background={colors.background.secondary}
      >
        <RulesOverview />
      </SectionContainer>

      <SectionContainer
        id="data"
        title="How we build the data"
        subtitle="Microdata pipeline"
      >
        <DataPipeline />
      </SectionContainer>

      <SectionContainer
        id="theory"
        title="Behavioral responses"
        subtitle="Economic theory"
        background={colors.background.secondary}
      >
        <BehavioralResponses />
      </SectionContainer>

      <Footer />
    </div>
  );
}
