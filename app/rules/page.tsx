import SectionOverview from '../../src/components/layout/SectionOverview';

export default function RulesOverviewPage() {
  return (
    <SectionOverview
      category="Model"
      title="Rules"
      description="How PolicyEngine encodes tax-and-benefit rules — which programs are covered, the legislative parameters that drive calculations, and the input and output variables exposed to households and microsimulations."
      children={[
        {
          label: 'Coverage tracker',
          description:
            'Which federal, state, and local tax-and-benefit programs PolicyEngine and peer models implement.',
          path: '/rules/coverage',
        },
        {
          label: 'Parameters',
          description:
            'Browse every legislative parameter that drives the model — thresholds, rates, brackets, eligibility cut-offs.',
          path: '/rules/parameters',
        },
        {
          label: 'Variables',
          description:
            'Inspect the input and output variables computed at the person, family, tax unit, and household level.',
          path: '/rules/variables',
        },
      ]}
    />
  );
}
