import type { CSSProperties } from 'react';
import { colors } from '../../designTokens';

/**
 * Helpers for visually distinguishing the host PolicyEngine model
 * ("this model") from peer models inside comparison tables.
 *
 * The host is always a PolicyEngine country model (policyengine-us /
 * policyengine-uk), so an id-prefix check is sufficient and keeps the
 * components free of extra props threading.
 */
export function isPolicyEngineModel(modelId: string): boolean {
  return modelId.startsWith('policyengine');
}

/**
 * Flat (opaque) tint for host-model cells — primary-500 at ~5% over
 * white, precomputed so sticky cells stay opaque while scrolling.
 */
export const hostCellBackground = '#F2FAF9';

/** Tint for host-model header cells, over the tertiary header gray. */
export const hostHeaderBackground = colors.primary[50];

export const hostCellStyle: CSSProperties = {
  backgroundColor: hostCellBackground,
};

const chipStyle: CSSProperties = {
  display: 'inline-block',
  padding: '1px 8px',
  borderRadius: 999,
  backgroundColor: colors.primary[600],
  color: colors.white,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};

/** Small "This model" pill rendered next to the host model's name. */
export function ThisModelChip({ style }: { style?: CSSProperties }) {
  return <span style={{ ...chipStyle, ...style }}>This model</span>;
}

/**
 * Relative deviation of a model's predicted value from an
 * administrative target, formatted for display (e.g. "+1.8% vs target").
 * Returns null when either value is missing or the target is zero.
 */
export function formatDeviation(
  predicted: number | 'unknown' | undefined | null,
  target: number,
): string | null {
  if (typeof predicted !== 'number' || !Number.isFinite(predicted)) return null;
  if (!Number.isFinite(target) || target === 0) return null;
  const pct = ((predicted - target) / Math.abs(target)) * 100;
  const magnitude = Math.abs(pct);
  if (magnitude < 0.05) return 'within 0.1% of target';
  const digits = magnitude < 10 ? 1 : 0;
  const sign = pct >= 0 ? '+' : '−';
  return `${sign}${magnitude.toFixed(digits)}% vs target`;
}
