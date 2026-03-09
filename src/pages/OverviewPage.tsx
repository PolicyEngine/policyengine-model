import Walkthrough from '../components/microsim/Walkthrough';
import { colors, typography, spacing } from '../designTokens';

export default function OverviewPage({ country }: { country: string }) {
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
          The engine
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
          How microsimulation works
        </h1>
      </div>
      <Walkthrough country={country} />
    </div>
  );
}
