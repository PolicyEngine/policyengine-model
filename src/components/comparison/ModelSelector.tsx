'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { colors, spacing, typography } from '../../designTokens';
import type { Model } from '../../types/comparison';

type ModelStub = Pick<Model, 'id' | 'name' | 'organization' | 'country'>;

export interface ModelSelectorProps {
  /**
   * All models in the active country. The selector never shows
   * cross-country pills — country is determined by the page URL (just
   * like the rules-coverage tab), not toggled here.
   */
  countryModels: ModelStub[];
  /** Param name in the URL (defaults to "models"). */
  paramName?: string;
}

/**
 * Chip bar for narrowing the active country's models within a
 * comparison page. Updates `?models=` in the URL.
 *
 * Default-active set is every model in the active country when
 * `?models=` is absent; otherwise the explicit list (intersected with
 * the country's models so URL hacks can't escape country scope).
 */
export default function ModelSelector({
  countryModels,
  paramName = 'models',
}: ModelSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const explicit = params.get(paramName);
  const inCountryIds = new Set(countryModels.map((m) => m.id));

  let selected: Set<string>;
  if (explicit === 'none') {
    selected = new Set();
  } else if (explicit) {
    selected = new Set(
      explicit
        .split(',')
        .map((s) => s.trim())
        .filter((id) => inCountryIds.has(id)),
    );
  } else {
    selected = new Set(inCountryIds);
  }

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
      if (next.size === 0) {
        p.set(paramName, 'none');
      } else if (next.size === inCountryIds.size) {
        p.delete(paramName);
      } else {
        p.set(paramName, Array.from(next).join(','));
      }
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
      <span style={{ fontWeight: 600, color: colors.text.secondary }}>
        Models:
      </span>
      {countryModels.map((m) => {
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
          None
        </button>
      </div>
    </div>
  );
}
