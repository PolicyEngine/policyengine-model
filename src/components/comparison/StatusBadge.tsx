import { colors } from '../../designTokens';
import type { CoverageStatus, Tristate } from '../../types/comparison';

const COVERAGE_STYLES: Record<CoverageStatus, { bg: string; fg: string; label: string }> = {
  implemented: { bg: colors.primary[100], fg: colors.primary[800], label: 'Implemented' },
  partial: { bg: colors.primary[50], fg: colors.primary[700], label: 'Partial' },
  'not-implemented': { bg: colors.gray[100], fg: colors.gray[700], label: 'Not modeled' },
  'out-of-scope': { bg: colors.gray[50], fg: colors.gray[600], label: 'Out of scope' },
  unknown: { bg: '#FEF3C7', fg: '#92400E', label: 'Unknown' },
};

const TRISTATE_STYLES: Record<Tristate, { bg: string; fg: string; label: string }> = {
  yes: { bg: colors.primary[100], fg: colors.primary[800], label: 'Yes' },
  partial: { bg: colors.primary[50], fg: colors.primary[700], label: 'Partial' },
  no: { bg: '#FEE2E2', fg: '#991B1B', label: 'No' },
  unknown: { bg: '#FEF3C7', fg: '#92400E', label: 'Unknown' },
};

interface CoverageBadgeProps {
  status: CoverageStatus;
}

export function CoverageBadge({ status }: CoverageBadgeProps) {
  const style = COVERAGE_STYLES[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        backgroundColor: style.bg,
        color: style.fg,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  );
}

interface TristateBadgeProps {
  value: Tristate;
}

export function TristateBadge({ value }: TristateBadgeProps) {
  const style = TRISTATE_STYLES[value];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        backgroundColor: style.bg,
        color: style.fg,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  );
}
