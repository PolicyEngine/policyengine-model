import { motion } from 'framer-motion';
import { colors, typography, spacing, statusColors } from '../../designTokens';
import type { CoverageStatus, Program } from '../../types/Program';

const MAX_FORWARD_YEAR = new Date().getFullYear() + 5;

/** Parse a verifiedYears string like "2022-2026", "2022+", or "2024" into a Set of year numbers. */
export function parseYearRange(verifiedYears?: string): Set<number> {
  if (!verifiedYears) return new Set();
  const trimmed = verifiedYears.trim();
  // "2022+" means from 2022 onward (no end year — uprating covers future)
  const openMatch = trimmed.match(/^(\d{4})\+$/);
  if (openMatch) {
    const start = parseInt(openMatch[1], 10);
    const years = new Set<number>();
    for (let y = start; y <= MAX_FORWARD_YEAR; y++) years.add(y);
    return years;
  }
  // "2022-2026" range
  const rangeMatch = trimmed.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    const years = new Set<number>();
    for (let y = start; y <= end; y++) years.add(y);
    return years;
  }
  // Single year "2024"
  const singleMatch = trimmed.match(/^(\d{4})$/);
  if (singleMatch) return new Set([parseInt(singleMatch[1], 10)]);
  return new Set();
}

/** Collect all unique years across all programs' verifiedYears fields. */
export function collectAllYears(programs: Program[]): number[] {
  const allYears = new Set<number>();
  for (const p of programs) {
    for (const y of parseYearRange(p.verifiedYears)) allYears.add(y);
  }
  return Array.from(allYears).sort((a, b) => a - b);
}

/** Check if a program's verifiedYears includes a given year. */
export function programIncludesYear(program: Program, year: number): boolean {
  return parseYearRange(program.verifiedYears).has(year);
}

export const statusLabels: Record<CoverageStatus, string> = {
  complete: 'Complete',
  partial: 'Partial',
  inProgress: 'In progress',
  notStarted: 'Not started',
};

const statusIcons: Record<CoverageStatus, string> = {
  complete: '\u2713',
  partial: '\u25D1',
  inProgress: '\u21BB',
  notStarted: '\u25CB',
};

export function StatusDot({ status, size = 10 }: { status: CoverageStatus; size?: number }) {
  return (
    <span
      className="tw:inline-flex tw:items-center tw:justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: statusColors[status],
        color: status === 'complete' || status === 'partial' ? colors.white : colors.gray[600],
        fontSize: size * 0.7,
        lineHeight: 1,
      }}
    >
      {size >= 14 ? statusIcons[status] : ''}
    </span>
  );
}

export function StatCard({ label, count, color, delay }: { label: string; count: number; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="tw:flex-1 tw:text-center"
      style={{
        minWidth: '120px',
        padding: spacing.xl,
        borderRadius: spacing.radius.xl,
        border: `1px solid ${colors.border.light}`,
        backgroundColor: colors.white,
      }}
    >
      <div style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color, marginBottom: spacing.xs }}>{count}</div>
      <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, fontWeight: typography.fontWeight.medium }}>{label}</div>
    </motion.div>
  );
}
