'use client';

import Link from 'next/link';
import { IconArrowRight } from '@tabler/icons-react';
import { colors, spacing, typography } from '../../designTokens';
import { usePublicBasePrefix } from '../../hooks/usePublicBasePrefix';
import PageHeader from './PageHeader';

interface SectionChild {
  label: string;
  description: string;
  path: string;
}

interface SectionOverviewProps {
  category: string;
  title: string;
  description: string;
  children: SectionChild[];
}

/**
 * Landing page for a sidebar section whose children are real pages but
 * whose own path is a grouping label (Rules, Data). Renders a hub layout
 * with one card per child, mirroring the order of the sidebar.
 */
export default function SectionOverview({
  category,
  title,
  description,
  children,
}: SectionOverviewProps) {
  const basePrefix = usePublicBasePrefix();
  const href = (path: string) => `${basePrefix}${path}`;

  return (
    <div>
      <PageHeader category={category} title={title} description={description} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: spacing.xl,
        }}
      >
        {children.map((child) => (
          <Link
            key={child.path}
            href={href(child.path)}
            className="tw:no-underline tw:group"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
              padding: spacing['2xl'],
              borderRadius: '12px',
              border: `1px solid ${colors.border.light}`,
              backgroundColor: colors.white,
              color: 'inherit',
              transition:
                'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.primary[300];
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow =
                '0 8px 24px rgba(16, 24, 40, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border.light;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.primary[900],
                fontFamily: typography.fontFamily.primary,
                lineHeight: 1.3,
              }}
            >
              {child.label}
            </span>
            <span
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                lineHeight: 1.6,
                fontFamily: typography.fontFamily.primary,
                flex: 1,
              }}
            >
              {child.description}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.primary[600],
                fontFamily: typography.fontFamily.primary,
              }}
            >
              Explore
              <IconArrowRight size={16} stroke={2} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
