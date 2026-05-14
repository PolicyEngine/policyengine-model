'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { colors, spacing } from '../../designTokens';

export interface YearFilterProps {
  years: number[];
}

/**
 * Year chip bar. Updates `?year=YYYY` in the URL. Server-side filtering
 * happens in the page; this component only rewrites the URL.
 */
export default function YearFilter({ years }: YearFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const currentYear = params.get('year');

  function setYear(year: number | 'all') {
    const newParams = new URLSearchParams(params.toString());
    if (year === 'all') newParams.delete('year');
    else newParams.set('year', String(year));
    const qs = newParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (years.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.lg,
        fontSize: 12,
      }}
    >
      <span style={{ fontWeight: 600, color: colors.text.secondary, marginRight: spacing.xs }}>
        Year:
      </span>
      <YearChip label="All" active={currentYear === null} onClick={() => setYear('all')} />
      {years.map((y) => (
        <YearChip
          key={y}
          label={String(y)}
          active={currentYear === String(y)}
          onClick={() => setYear(y)}
        />
      ))}
    </div>
  );
}

function YearChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 4,
        border: 'none',
        backgroundColor: active ? colors.primary[600] : 'transparent',
        color: active ? colors.white : colors.text.secondary,
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: 11,
      }}
    >
      {label}
    </button>
  );
}
