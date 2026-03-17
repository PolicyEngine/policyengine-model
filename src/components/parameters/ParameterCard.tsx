import type { ParameterLeaf, ParameterNode } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';

interface ParameterCardProps {
  parameter: ParameterLeaf | ParameterNode;
  isSelected: boolean;
  onClick: () => void;
}

function getCurrentValue(param: ParameterLeaf): { text: string; isList: boolean; count: number } {
  const entries = Object.entries(param.values).sort(([a], [b]) => b.localeCompare(a));
  if (entries.length === 0) return { text: '—', isList: false, count: 0 };
  const [, val] = entries[0];
  // Handle arrays (list-type parameters)
  if (Array.isArray(val)) {
    if (val.length === 0) return { text: '(empty)', isList: true, count: 0 };
    return { text: val.join(', '), isList: true, count: val.length };
  }
  if (typeof val === 'boolean') return { text: val ? 'true' : 'false', isList: false, count: 0 };
  if (typeof val === 'number') {
    if (param.unit === '/1') { const pct = val * 100; return { text: `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(2)}%`, isList: false, count: 0 }; }
    return { text: val.toLocaleString(), isList: false, count: 0 };
  }
  const str = String(val);
  if (str.includes(',')) {
    const items = str.split(',').map(s => s.trim()).filter(Boolean);
    return { text: str, isList: true, count: items.length };
  }
  return { text: str, isList: false, count: 0 };
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
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.secondary,
                marginTop: spacing.xs,
                lineHeight: 1.4,
              }}
            >
              {param.description}
            </div>
          )}
        </div>
        <div className="tw:flex tw:items-center tw:flex-shrink-0" style={{ gap: spacing.xs }}>
          {/* Current value badge (leaf only) */}
          {isLeaf && (() => {
            const { text, isList, count } = getCurrentValue(param as ParameterLeaf);
            return (
              <span
                title={isList ? text : `Current value: ${text}`}
                style={{
                  fontSize: '10px',
                  fontWeight: typography.fontWeight.semibold,
                  padding: `1px ${spacing.xs}`,
                  borderRadius: spacing.radius.sm,
                  backgroundColor: colors.primary[50],
                  color: colors.primary[700],
                  fontFamily: typography.fontFamily.mono,
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {isList ? (count === 0 ? '(empty)' : `${count} items`) : text}
              </span>
            );
          })()}
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
              {(() => {
                const u = (param as ParameterLeaf).unit;
                if (u === '/1') return '%';
                if (u === 'currency-USD' || u === 'currency_USD' || u === 'USD') return '$';
                if (u === 'currency-GBP' || u === 'currency_GBP' || u === 'GBP') return '£';
                return u;
              })()}
            </span>
          )}
          {/* Type badge */}
          <span
            style={{
              fontSize: '10px',
              fontWeight: typography.fontWeight.semibold,
              padding: `1px ${spacing.xs}`,
              borderRadius: spacing.radius.sm,
              backgroundColor: isLeaf ? colors.primary[100] : colors.gray[100],
              color: isLeaf ? colors.primary[800] : colors.gray[600],
            }}
          >
            {isLeaf ? 'value' : 'group'}
          </span>
        </div>
      </div>
    </button>
  );
}
