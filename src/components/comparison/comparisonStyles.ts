import { colors, spacing, typography } from '../../designTokens';
import type { CSSProperties } from 'react';

export const tableWrapperStyle: CSSProperties = {
  overflowX: 'auto',
  border: `1px solid ${colors.border.light}`,
  borderRadius: 8,
  backgroundColor: colors.white,
};

export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: typography.fontFamily.primary,
  fontSize: 14,
};

export const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: `${spacing.md} ${spacing.lg}`,
  borderBottom: `1px solid ${colors.border.light}`,
  backgroundColor: colors.background.tertiary,
  color: colors.text.secondary,
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
  verticalAlign: 'bottom',
};

export const tdStyle: CSSProperties = {
  padding: `${spacing.md} ${spacing.lg}`,
  borderBottom: `1px solid ${colors.border.light}`,
  verticalAlign: 'top',
  color: colors.text.primary,
};

export const subTextStyle: CSSProperties = {
  fontSize: 12,
  color: colors.text.tertiary,
  marginTop: 2,
};

/**
 * Sticky first column for wide comparison tables. Backgrounds must stay
 * opaque so peer columns scrolling beneath don't show through; the inset
 * shadow keeps a visible edge once the table scrolls horizontally.
 */
export const stickyFirstColThStyle: CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 3,
  boxShadow: `inset -1px 0 0 ${colors.border.light}`,
};

export const stickyFirstColTdStyle: CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  backgroundColor: colors.white,
  boxShadow: `inset -1px 0 0 ${colors.border.light}`,
};

export const sectionStyle: CSSProperties = {
  marginBottom: spacing['4xl'],
};

export const h2Style: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: colors.primary[900],
  marginTop: spacing['3xl'],
  marginBottom: spacing.md,
};

export const proseStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: colors.text.secondary,
  maxWidth: 760,
};
