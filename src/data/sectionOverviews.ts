import type { Country } from '../hooks/useCountry';

export interface SectionCopy {
  description: string;
  children: { label: string; description: string; path: string }[];
}

/** Hub-page copy for the Rules section, per country. */
export const rulesSection: Record<Country, SectionCopy> = {
  us: {
    description:
      'How PolicyEngine encodes tax-and-benefit rules — which programs are covered, the legislative parameters that drive calculations, and the input and output variables exposed to households and microsimulations.',
    children: [
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
    ],
  },
  uk: {
    description:
      'How PolicyEngine encodes UK tax and benefit rules: which programmes are covered, the legislative parameters that drive calculations, and the input and output variables exposed to households and microsimulations.',
    children: [
      {
        label: 'Coverage tracker',
        description:
          'Which UK-wide and devolved taxes and benefits PolicyEngine UK models, by department, with the status of each.',
        path: '/rules/coverage',
      },
      {
        label: 'Parameters',
        description:
          'Browse every legislative parameter that drives the model: rates, thresholds, allowances, and eligibility cut-offs.',
        path: '/rules/parameters',
      },
      {
        label: 'Variables',
        description:
          'Inspect the input and output variables computed for each person, benefit unit, and household.',
        path: '/rules/variables',
      },
    ],
  },
};

/** Hub-page copy for the Data section, per country. */
export const dataSection: Record<Country, SectionCopy> = {
  us: {
    description:
      'How PolicyEngine builds the microdata behind its simulations — from raw survey records to calibrated, validated datasets that match official population totals.',
    children: [
      {
        label: 'Pipeline',
        description:
          'Each stage that turns survey and tax records into PolicyEngine-ready microdata.',
        path: '/data/pipeline',
      },
      {
        label: 'Calibration targets',
        description:
          'The population totals (program enrollment, income aggregates, demographic counts) used to reweight the underlying survey.',
        path: '/data/calibration',
      },
      {
        label: 'Validation',
        description:
          'How simulated outputs are cross-checked against published official statistics.',
        path: '/data/validation',
      },
    ],
  },
  uk: {
    description:
      'How PolicyEngine builds the UK household data behind its simulations: from Family Resources Survey households to a calibrated file whose weighted totals match official statistics.',
    children: [
      {
        label: 'Pipeline',
        description:
          'Each stage that turns Family Resources Survey households into the enhanced dataset PolicyEngine UK runs on.',
        path: '/data/pipeline',
      },
      {
        label: 'Calibration targets',
        description:
          'The OBR, DWP, HMRC, ONS, and other official statistics the household weights are fitted to, nationally and for each constituency and local authority.',
        path: '/data/calibration',
      },
      {
        label: 'Validation',
        description:
          'How closely the calibrated data matches its targets, and how it does on statistics held out of calibration.',
        path: '/data/validation',
      },
    ],
  },
};
