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
