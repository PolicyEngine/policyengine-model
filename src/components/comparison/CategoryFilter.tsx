'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { colors, spacing } from '../../designTokens';

export interface CategoryFilterProps {
  categories: Array<{ id: string; label: string }>;
  /** URL search param name (defaults to "categories"). */
  paramName?: string;
}

/**
 * Chip bar for filtering modeling-mechanic categories. Updates
 * `?categories=` in the URL as a comma-separated list. Server pages
 * read the param and filter rows accordingly. Default-active set is
 * "all" when the param is absent.
 */
export default function CategoryFilter({
  categories,
  paramName = 'categories',
}: CategoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const raw = params.get(paramName);
  const allIds = categories.map((c) => c.id);
  const selected = raw
    ? new Set(raw.split(',').filter(Boolean))
    : new Set(allIds);

  function setQuery(mutate: (p: URLSearchParams) => void) {
    const newParams = new URLSearchParams(params.toString());
    mutate(newParams);
    const qs = newParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setQuery((p) => {
      if (next.size === allIds.length) p.delete(paramName);
      else p.set(paramName, Array.from(next).join(','));
    });
  }

  function selectAll() {
    setQuery((p) => p.delete(paramName));
  }

  function clearAll() {
    setQuery((p) => p.set(paramName, 'none'));
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.xs,
        padding: spacing.md,
        marginBottom: spacing.lg,
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border.light}`,
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      <span
        style={{
          fontWeight: 600,
          color: colors.text.secondary,
          marginRight: spacing.xs,
        }}
      >
        Categories:
      </span>
      {categories.map((c) => {
        const isOn = selected.has(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            style={{
              padding: `${spacing.xs} ${spacing.md}`,
              borderRadius: 999,
              border: isOn
                ? `1px solid ${colors.primary[500]}`
                : `1px solid ${colors.border.medium}`,
              backgroundColor: isOn ? colors.primary[50] : colors.white,
              color: isOn ? colors.primary[800] : colors.text.tertiary,
              fontWeight: isOn ? 600 : 500,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {c.label}
          </button>
        );
      })}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: spacing.xs }}>
        <button
          type="button"
          onClick={selectAll}
          style={{
            padding: `${spacing.xs} ${spacing.md}`,
            border: 'none',
            background: 'transparent',
            color: colors.primary[600],
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          All
        </button>
        <button
          type="button"
          onClick={clearAll}
          style={{
            padding: `${spacing.xs} ${spacing.md}`,
            border: 'none',
            background: 'transparent',
            color: colors.text.tertiary,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
