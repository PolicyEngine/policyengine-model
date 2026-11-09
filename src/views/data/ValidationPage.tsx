import { colors, typography, spacing } from '../../designTokens';
import { IconExternalLink } from '@tabler/icons-react';
import PageHeader from '../../components/layout/PageHeader';
import type { Country } from '../../hooks/useCountry';

// What each country's page says, and where its full comparison lives. The US
// validates against NBER's TAXSIM; TAXSIM models US taxes only, so the UK page
// points to the scorecard, which compares UK estimates with published figures.
const COPY: Record<Country, { intro: string; heading: string; body: string; href: string; link: string }> = {
  us: {
    intro:
      "PolicyEngine validates its tax calculations against NBER's TAXSIM model, comparing results across thousands of household configurations. The full interactive comparison is available in our Jupyter Book documentation.",
    heading: 'TAXSIM validation book',
    body: 'Detailed comparison of PolicyEngine calculations vs. TAXSIM across federal income tax, payroll taxes, state income taxes, and credits for multiple filing statuses, income levels, and years.',
    href: 'https://policyengine.github.io/policyengine-us',
    link: 'View full validation',
  },
  uk: {
    intro:
      'PolicyEngine compares its UK estimates with figures that others publish, such as official statistics and other models’ estimates.',
    heading: 'PolicyEngine scorecard',
    body: 'Each published figure appears beside PolicyEngine’s estimate, with the gap between them and a note wherever the two measure different things. Large gaps stay on the page.',
    href: 'https://www.policyengine.org/scorecard?country=uk',
    link: 'Open the UK scorecard',
  },
};

export default function ValidationPage({ country }: { country: Country }) {
  const copy = COPY[country];

  return (
    <div>
      <PageHeader category="Data" title="Validation" />

      <div style={{ maxWidth: '720px' }}>
        <p
          style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
            lineHeight: 1.7,
            marginBottom: spacing['2xl'],
          }}
        >
          {copy.intro}
        </p>

        <div
          style={{
            padding: spacing['2xl'],
            borderRadius: spacing.radius.xl,
            border: `1px solid ${colors.border.light}`,
            backgroundColor: colors.background.secondary,
          }}
        >
          <h3
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.primary[800],
              marginBottom: spacing.sm,
            }}
          >
            {copy.heading}
          </h3>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: 1.6,
              marginBottom: spacing.lg,
            }}
          >
            {copy.body}
          </p>
          <a
            href={copy.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.sm} ${spacing.xl}`,
              borderRadius: spacing.radius.lg,
              backgroundColor: colors.primary[600],
              color: colors.white,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              fontFamily: typography.fontFamily.primary,
              textDecoration: 'none',
            }}
          >
            {copy.link} <IconExternalLink size={16} stroke={1.5} />
          </a>
        </div>
      </div>
    </div>
  );
}
