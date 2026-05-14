'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { colors, spacing, typography } from '../../designTokens';
import type { Model } from '../../types/comparison';

export interface ModelSelectorProps {
  allModels: Pick<Model, 'id' | 'name' | 'organization'>[];
  /** Param name in the URL (defaults to "models"). */
  paramName?: string;
}

/**
 * Reads the `models` URL search param and renders a checkbox toolbar
 * letting the user filter which models appear in the comparison tables.
 * Server components on each page read `searchParams.models` to filter
 * the rendered data — this component just rewrites the URL.
 */
export default function ModelSelector({
  allModels,
  paramName = 'models',
}: ModelSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const raw = params.get(paramName) ?? '';
  const selected = new Set(
    raw ? raw.split(',').filter(Boolean) : allModels.map((m) => m.id),
  );

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const newParams = new URLSearchParams(params.toString());
    // If all selected, drop the param entirely for a clean URL.
    if (next.size === allModels.length) {
      newParams.delete(paramName);
    } else {
      newParams.set(paramName, Array.from(next).join(','));
    }
    const qs = newParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function selectAll() {
    const newParams = new URLSearchParams(params.toString());
    newParams.delete(paramName);
    const qs = newParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        marginBottom: spacing.xl,
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border.light}`,
        borderRadius: 8,
        fontFamily: typography.fontFamily.primary,
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
        Compare:
      </span>
      {allModels.map((m) => {
        const isOn = selected.has(m.id);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            title={m.organization}
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
            {m.name}
          </button>
        );
      })}
      <button
        type="button"
        onClick={selectAll}
        style={{
          marginLeft: 'auto',
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
    </div>
  );
}

