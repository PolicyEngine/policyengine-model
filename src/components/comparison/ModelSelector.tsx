'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { colors, spacing, typography } from '../../designTokens';
import type { Model } from '../../types/comparison';

type ModelStub = Pick<Model, 'id' | 'name' | 'organization' | 'country'>;

export interface ModelSelectorProps {
  allModels: ModelStub[];
  /** Param name in the URL (defaults to "models"). */
  paramName?: string;
}

/**
 * Reads the `models` and `country` URL search params and renders a
 * checkbox toolbar that lets the user filter which models appear in the
 * comparison tables. Server components on each page read these params to
 * filter the rendered data; this component only rewrites the URL.
 *
 * Default-active set is determined by:
 *   1. `?models=` (explicit selection — wins)
 *   2. `?country=us|uk` (country default)
 *   3. all models
 */
export default function ModelSelector({
  allModels,
  paramName = 'models',
}: ModelSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const explicitModels = params.get(paramName);
  const countryParam = params.get('country');

  // Compute the "default-active" set (what's highlighted when ?models= absent).
  function defaultActive(): Set<string> {
    if (countryParam && countryParam !== 'all') {
      return new Set(
        allModels.filter((m) => m.country === countryParam).map((m) => m.id),
      );
    }
    return new Set(allModels.map((m) => m.id));
  }

  const selected = explicitModels
    ? new Set(explicitModels.split(',').filter(Boolean))
    : defaultActive();

  function setQuery(
    mutate: (p: URLSearchParams) => void,
  ): void {
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
      // Drop the param if it matches the country default (clean URL).
      const matchesDefault =
        next.size === defaultActive().size &&
        Array.from(next).every((x) => defaultActive().has(x));
      if (matchesDefault) p.delete(paramName);
      else p.set(paramName, Array.from(next).join(','));
    });
  }

  function selectAll() {
    setQuery((p) => {
      p.delete(paramName);
      p.set('country', 'all');
    });
  }

  function clearAll() {
    setQuery((p) => p.set(paramName, 'none'));
  }

  function setCountry(c: 'all' | 'us' | 'uk') {
    setQuery((p) => {
      p.delete(paramName);
      if (c === 'all') p.delete('country');
      else p.set('country', c);
    });
  }

  const activeCountry: 'us' | 'uk' | 'all' =
    countryParam === 'us' || countryParam === 'uk' ? countryParam : 'all';

  const countries = ['all', 'us', 'uk'] as const;
  const labelByCountry: Record<(typeof countries)[number], string> = {
    all: 'All',
    us: 'US',
    uk: 'UK',
  };

  // Group pills by country for readability.
  const usModels = allModels.filter((m) => m.country === 'us');
  const ukModels = allModels.filter((m) => m.country === 'uk');
  const otherModels = allModels.filter(
    (m) => m.country !== 'us' && m.country !== 'uk',
  );

  function renderPill(m: ModelStub) {
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
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
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
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
        <span style={{ fontWeight: 600, color: colors.text.secondary }}>Country:</span>
        {countries.map((c) => {
          const isOn = activeCountry === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCountry(c)}
              style={{
                padding: `${spacing.xs} ${spacing.md}`,
                borderRadius: 4,
                border: 'none',
                backgroundColor: isOn ? colors.primary[600] : 'transparent',
                color: isOn ? colors.white : colors.text.secondary,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {labelByCountry[c]}
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
            All models
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

      {(activeCountry === 'all' || activeCountry === 'us') && usModels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
          {activeCountry === 'all' && (
            <span style={{ color: colors.text.tertiary, fontSize: 11, fontWeight: 600 }}>US:</span>
          )}
          {usModels.map(renderPill)}
        </div>
      )}
      {(activeCountry === 'all' || activeCountry === 'uk') && ukModels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
          {activeCountry === 'all' && (
            <span style={{ color: colors.text.tertiary, fontSize: 11, fontWeight: 600 }}>UK:</span>
          )}
          {ukModels.map(renderPill)}
        </div>
      )}
      {activeCountry === 'all' && otherModels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
          <span style={{ color: colors.text.tertiary, fontSize: 11, fontWeight: 600 }}>Other:</span>
          {otherModels.map(renderPill)}
        </div>
      )}
    </div>
  );
}
