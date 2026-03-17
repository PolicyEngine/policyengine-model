import type { Parameter, ParameterLeaf } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';

interface ParameterTimelineProps {
  parameters: Record<string, Parameter>;
  moduleName: string | null;
  country: string;
}

function formatValue(val: number | string | boolean | string[], unit: string | null): string {
  if (Array.isArray(val)) return val.length === 0 ? '(empty)' : val.join(', ');
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') {
    if (unit?.startsWith('currency-') || unit?.startsWith('currency_') || unit === 'USD' || unit === 'GBP') {
      const currency = (unit === 'currency-GBP' || unit === 'currency_GBP' || unit === 'GBP') ? '£' : '$';
      return val >= 1000
        ? `${currency}${val.toLocaleString()}`
        : `${currency}${val}`;
    }
    if (unit === '/1') { const pct = val * 100; return `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(2)}%`; }
    return val.toLocaleString();
  }
  return String(val);
}

function isLeaf(p: Parameter): p is ParameterLeaf {
  return p.type === 'parameter';
}

export default function ParameterTimeline({ parameters, moduleName, country }: ParameterTimelineProps) {
  if (!moduleName) return null;
  void country;

  // Find parameters that match this variable's module path
  const prefix = moduleName.split('.').slice(0, -1).join('.');
  const matching = Object.values(parameters).filter(
    (p) => isLeaf(p) && p.parameter.startsWith(prefix) && Object.keys(p.values).length > 0,
  ) as ParameterLeaf[];

  if (matching.length === 0) return null;

  return (
    <div style={{ marginTop: spacing.lg }}>
      <h4
        style={{
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: spacing.md,
        }}
      >
        Parameters ({matching.length})
      </h4>
      <div className="tw:flex tw:flex-col" style={{ gap: spacing.sm }}>
        {matching.slice(0, 10).map((p) => {
          const entries = Object.entries(p.values).sort(
            ([a], [b]) => a.localeCompare(b),
          );
          return (
            <div
              key={p.parameter}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                borderRadius: spacing.radius.md,
                backgroundColor: colors.gray[50],
                border: `1px solid ${colors.border.light}`,
              }}
            >
              <div
                style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                {p.label || p.parameter.split('.').pop()}
              </div>
              {p.description && (
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.text.tertiary,
                    marginBottom: spacing.sm,
                  }}
                >
                  {p.description}
                </div>
              )}
              <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.xs }}>
                {entries.map(([date, val]) => (
                  <span
                    key={date}
                    style={{
                      fontSize: '11px',
                      fontFamily: typography.fontFamily.mono,
                      padding: `2px ${spacing.sm}`,
                      borderRadius: spacing.radius.sm,
                      backgroundColor: colors.white,
                      border: `1px solid ${colors.border.light}`,
                      color: colors.text.secondary,
                    }}
                  >
                    {date.slice(0, 4)}: {formatValue(val, p.unit)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {matching.length > 10 && (
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.text.tertiary,
              fontStyle: 'italic',
            }}
          >
            + {matching.length - 10} more parameters
          </div>
        )}
      </div>
    </div>
  );
}
