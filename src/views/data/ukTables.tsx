import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePublicBasePrefix } from '../../hooks/usePublicBasePrefix';
import { colors, typography, spacing } from '../../designTokens';

/** Shared table chrome for the UK data pages. Scrolls inside itself on narrow screens. */
export function DataTable({ head, children, minWidth = 640 }: { head: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div
      className="tw:overflow-x-auto tw:[contain:inline-size]"
      style={{ borderRadius: spacing.radius.xl, border: `1px solid ${colors.border.light}`, boxShadow: spacing.shadow.sm }}
    >
      <table style={{ width: '100%', minWidth, borderCollapse: 'collapse', fontFamily: typography.fontFamily.primary }}>
        <thead>
          <tr>
            {head.map((label, i) => (
              <th
                key={label}
                scope="col"
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  textAlign: i === 0 ? 'left' : 'right',
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.secondary,
                  backgroundColor: colors.gray[50],
                  borderBottom: `1px solid ${colors.border.light}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const cell = (align: 'left' | 'right' = 'right', extra: CSSProperties = {}): CSSProperties => ({
  padding: `${spacing.sm} ${spacing.lg}`,
  textAlign: align,
  fontSize: typography.fontSize.sm,
  color: colors.text.primary,
  borderTop: `1px solid ${colors.border.light}`,
  verticalAlign: 'top',
  fontVariantNumeric: 'tabular-nums',
  ...extra,
});

export const sectionHeading: CSSProperties = {
  fontSize: typography.fontSize['2xl'],
  fontWeight: typography.fontWeight.bold,
  color: colors.primary[900],
  margin: `0 0 ${spacing.md}`,
};

export const bodyText: CSSProperties = {
  fontSize: typography.fontSize.base,
  color: colors.text.secondary,
  lineHeight: 1.7,
  margin: `0 0 ${spacing.lg}`,
  maxWidth: '760px',
};

export function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="tw:flex-1"
      style={{
        minWidth: '150px',
        padding: spacing.xl,
        borderRadius: spacing.radius.xl,
        border: `1px solid ${colors.border.light}`,
        backgroundColor: colors.white,
      }}
    >
      <div style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold, color: colors.primary[900] }}>
        {value}
      </div>
      <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing.xs, lineHeight: 1.5 }}>
        {label}
      </div>
    </div>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary[600], textDecoration: 'underline' }}>
      {children}
    </a>
  );
}

export const issueUrl = (repo: string, n: number) => `https://github.com/PolicyEngine/${repo}/issues/${n}`;

/** A link to another model page that keeps the public prefix and ?country=/?embed=. */
export function PageLink({ path, children }: { path: string; children: ReactNode }) {
  const base = usePublicBasePrefix();
  const search = useSearchParams().toString();
  return (
    <Link href={`${base}${path}${search ? `?${search}` : ''}`} style={{ color: colors.primary[600], textDecoration: 'underline' }}>
      {children}
    </Link>
  );
}
