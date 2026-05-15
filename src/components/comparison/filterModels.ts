import type { Country } from './detectCountry';

/**
 * Filter a model list to those selected by the URL `models` param,
 * scoped to the active country.
 *
 * Semantics:
 *   - `?models=` undefined → every model whose country matches `country`.
 *   - `?models=none`       → none.
 *   - `?models=id1,id2`    → those models, restricted to the active
 *                            country (cross-country ids are dropped so
 *                            URL hacks can't escape the country scope).
 *
 * Pure utility — safe to import from server components (no 'use client').
 */
export function filterSelectedModels<T extends { id: string; country?: string }>(
  models: T[],
  selectedRaw: string | string[] | undefined,
  country: Country,
): T[] {
  const inCountry = models.filter((m) => m.country === country);

  if (selectedRaw === undefined) return inCountry;

  const param = Array.isArray(selectedRaw) ? selectedRaw[0] : selectedRaw;
  if (param === 'none') return [];

  const ids = new Set(param.split(',').map((s) => s.trim()).filter(Boolean));
  if (ids.size === 0) return [];
  return inCountry.filter((m) => ids.has(m.id));
}
