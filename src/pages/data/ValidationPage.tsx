import { colors, typography, spacing } from '../../designTokens';
import { IconExternalLink } from '@tabler/icons-react';

export default function ValidationPage({ country }: { country: string }) {
  const taxsimUrl =
    country === 'uk'
      ? 'https://policyengine.github.io/policyengine-uk'
      : 'https://policyengine.github.io/policyengine-us';

  return (
    <div>
      <div style={{ marginBottom: spacing['4xl'] }}>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: colors.primary[600],
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: spacing.sm,
          }}
        >
          Data
        </p>
        <h1
          style={{
            fontSize: typography.fontSize['5xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary[900],
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Validation
        </h1>
      </div>

      <div
        style={{
          maxWidth: '720px',
        }}
      >
        <p
          style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
            lineHeight: 1.7,
            marginBottom: spacing['2xl'],
          }}
        >
          PolicyEngine validates its tax calculations against NBER's TAXSIM model, comparing
          results across thousands of household configurations. The full interactive comparison
          is available in our Jupyter Book documentation.
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
            TAXSIM validation book
          </h3>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: 1.6,
              marginBottom: spacing.lg,
            }}
          >
            Detailed comparison of PolicyEngine calculations vs. TAXSIM across federal income
            tax, payroll taxes, state income taxes, and credits for multiple filing statuses,
            income levels, and years.
          </p>
          <a
            href={taxsimUrl}
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
            View full validation <IconExternalLink size={16} stroke={1.5} />
          </a>
        </div>
      </div>
    </div>
  );
}
