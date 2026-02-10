import { colors, typography, spacing } from '../../designTokens';

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: colors.primary[900],
        color: colors.white,
        padding: `${spacing['4xl']} 0`,
        fontFamily: typography.fontFamily.primary,
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: `0 ${spacing['2xl']}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing.xl,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <img
            src="https://policyengine.org/assets/logos/policyengine/white.svg"
            alt="PolicyEngine"
            style={{ height: '24px' }}
          />
        </div>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            opacity: 0.7,
            margin: 0,
          }}
        >
          PolicyEngine {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
