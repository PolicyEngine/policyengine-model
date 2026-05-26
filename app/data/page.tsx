import SectionOverview from '../../src/components/layout/SectionOverview';

export default function DataOverviewPage() {
  return (
    <SectionOverview
      category="Model"
      title="Data"
      description="How PolicyEngine builds the microdata behind its simulations — from raw survey records to calibrated, validated datasets that match official population totals."
      children={[
        {
          label: 'Pipeline',
          description:
            'Each stage that turns raw CPS, FRS, and SCF records into PolicyEngine-ready microdata.',
          path: '/data/pipeline',
        },
        {
          label: 'Calibration targets',
          description:
            'The population totals (program enrolment, income aggregates, demographic counts) used to reweight the underlying survey.',
          path: '/data/calibration',
        },
        {
          label: 'Validation',
          description:
            'How simulated outputs are cross-checked against published official statistics.',
          path: '/data/validation',
        },
      ]}
    />
  );
}
