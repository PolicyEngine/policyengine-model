import type { Country } from '../hooks/useCountry';

interface SectionCopy {
  description: string;
  children: { label: string; description: string; path: string }[];
}

const PARAMETERS_DESCRIPTION =
  'Browse every legislative parameter that drives the model — thresholds, rates, brackets, eligibility cut-offs.';

/** The Rules hub copy for each country, in its own terms and spelling. */
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
        description: PARAMETERS_DESCRIPTION,
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
      'How PolicyEngine encodes tax-and-benefit rules — which programmes are covered, the legislative parameters that drive calculations, and the input and output variables exposed to households and microsimulations.',
    children: [
      {
        label: 'Coverage tracker',
        description:
          'Which UK government, devolved and local tax-and-benefit programmes PolicyEngine and peer models implement.',
        path: '/rules/coverage',
      },
      {
        label: 'Parameters',
        description: PARAMETERS_DESCRIPTION,
        path: '/rules/parameters',
      },
      {
        label: 'Variables',
        description:
          'Inspect the input and output variables computed at the person, benefit unit and household level.',
        path: '/rules/variables',
      },
    ],
  },
};
