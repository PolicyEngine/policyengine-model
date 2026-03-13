import type { ParameterLeaf, ParameterNode } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';

interface ParameterCardProps {
  parameter: ParameterLeaf | ParameterNode;
  isSelected: boolean;
  onClick: () => void;
}

function getCurrentValue(param: ParameterLeaf): string {
  const entries = Object.entries(param.values).sort(([a], [b]) => b.localeCompare(a));
  if (entries.length === 0) return '—';
  const [, val] = entries[0];
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') {
    if (param.unit === '/1') return `${(val * 100).toFixed(1)}%`;
    return val.toLocaleString();
  }
  return String(val);
}

export default function ParameterCard({ parameter: param, isSelected, onClick }: ParameterCardProps) {
  const isLeaf = param.type === 'parameter';

  return (
    <button
      onClick={onClick}
      className="tw:w-full tw:text-left tw:cursor-pointer"
      style={{
        padding: `${spacing.md} ${spacing.lg}`,
        borderRadius: spacing.radius.lg,
        border: `1px solid ${isSelected ? colors.primary[400] : colors.border.light}`,
        backgroundColor: isSelected ? colors.primary[50] : colors.white,
        fontFamily: typography.fontFamily.primary,
        transition: 'all 0.15s ease',
        display: 'block',
      }}
    >
      <div className="tw:flex tw:items-start tw:justify-between" style={{ gap: spacing.md }}>
        <div className="tw:flex-1 tw:min-w-0">
          <div
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            {param.label}
          </div>
          <div className="tw:truncate"
            style={{
              fontSize: typography.fontSize.xs,
              fontFamily: typography.fontFamily.mono,
              color: colors.text.tertiary,
              marginTop: '2px',
            }}
          >
            {param.parameter}
          </div>
          {param.description && (
            <div
              className="tw:truncate"
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.secondary,
                marginTop: spacing.xs,
                maxWidth: '500px',
              }}
            >
              {param.description}
            </div>
          )}
        </div>
        <div className="tw:flex tw:items-center tw:flex-shrink-0" style={{ gap: spacing.xs }}>
          {/* Current value badge (leaf only) */}
          {isLeaf && (
            <span
              title="Current value"
              style={{
                fontSize: '10px',
                fontWeight: typography.fontWeight.semibold,
                padding: `1px ${spacing.xs}`,
                borderRadius: spacing.radius.sm,
                backgroundColor: '#DBEAFE',
                color: '#1D4ED8',
                fontFamily: typography.fontFamily.mono,
              }}
            >
              {getCurrentValue(param as ParameterLeaf)}
            </span>
          )}
          {/* Unit badge */}
          {isLeaf && (param as ParameterLeaf).unit && (
            <span
              style={{
                fontSize: '10px',
                padding: `1px ${spacing.xs}`,
                borderRadius: spacing.radius.sm,
                backgroundColor: colors.gray[100],
                color: colors.gray[600],
                fontFamily: typography.fontFamily.mono,
              }}
            >
              {(param as ParameterLeaf).unit === '/1' ? '%' : (param as ParameterLeaf).unit}
            </span>
          )}
          {/* Type badge */}
          <span
            style={{
              fontSize: '10px',
              fontWeight: typography.fontWeight.semibold,
              padding: `1px ${spacing.xs}`,
              borderRadius: spacing.radius.sm,
              backgroundColor: isLeaf ? '#F0FDF4' : '#FEF3C7',
              color: isLeaf ? '#166534' : '#92400E',
            }}
          >
            {isLeaf ? 'value' : 'group'}
          </span>
        </div>
      </div>
    </button>
  );
}
