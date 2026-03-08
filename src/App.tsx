import { useEffect, useRef } from 'react';
import StickyNav from './components/layout/StickyNav';
import SectionContainer from './components/layout/SectionContainer';
import Footer from './components/layout/Footer';
import Walkthrough from './components/microsim/Walkthrough';
import RulesOverview from './components/rules/RulesOverview';
import DataPipeline from './components/data/DataPipeline';
import BehavioralResponses from './components/theory/BehavioralResponses';
import { colors } from './designTokens';

const params = new URLSearchParams(window.location.search);
const isEmbed = params.has('embed');
const country = params.get('country') || 'us';

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);

  // When embedded, report document height to parent for seamless iframe sizing
  useEffect(() => {
    if (!isEmbed || !rootRef.current) {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (rootRef.current) {
        window.parent.postMessage(
          { height: rootRef.current.scrollHeight },
          '*'
        );
      }
    });
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} style={{ minHeight: '100vh' }}>
      {!isEmbed && <StickyNav />}

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

      {!isEmbed && <Footer />}
    </div>
  );
}
