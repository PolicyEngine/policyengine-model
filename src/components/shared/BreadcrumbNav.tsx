import { IconArrowLeft } from '@tabler/icons-react';
import { colors, typography, spacing } from '../../designTokens';

export default function BreadcrumbNav({ items, onBack }: {
  items: { label: string; onClick: () => void }[];
  onBack: () => void;
}) {
  return (
    <div className="tw:flex tw:items-center tw:flex-wrap" style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
      <button
        onClick={onBack}
        className="tw:flex tw:items-center tw:cursor-pointer"
        style={{
          border: 'none',
          backgroundColor: 'transparent',
          color: colors.primary[600],
          padding: `${spacing.xs} ${spacing.xs} ${spacing.xs} 0`,
          fontFamily: typography.fontFamily.primary,
          fontSize: typography.fontSize.sm,
        }}
      >
        <IconArrowLeft size={16} stroke={1.5} />
      </button>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="tw:flex tw:items-center" style={{ gap: spacing.xs }}>
            {i > 0 && (
              <span style={{ color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>/</span>
            )}
            {isLast ? (
              <span style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
              }}>
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="tw:cursor-pointer"
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  padding: `${spacing.xs} 0`,
                  fontFamily: typography.fontFamily.primary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.primary[600],
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
