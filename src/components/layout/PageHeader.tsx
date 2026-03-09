import { colors, typography, spacing } from '../../designTokens';

interface PageHeaderProps {
  category: string;
  title: string;
  description?: string;
}

export default function PageHeader({ category, title, description }: PageHeaderProps) {
  return (
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
        {category}
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
        {title}
      </h1>
      {description && (
        <p
          style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
            lineHeight: 1.7,
            marginTop: spacing.lg,
            maxWidth: '720px',
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
