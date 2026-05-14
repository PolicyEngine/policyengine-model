/**
 * Filter a model list to those selected by URL search params.
 *
 * Semantics:
 *   - `?models=` undefined            → all models (subject to country filter).
 *   - `?models=` empty                → none.
 *   - `?models=id1,id2`               → those models, in input order.
 *
 * `?country=us|uk` filters the default-all set further. When `?models=`
 * is set explicitly, country is ignored — explicit selection wins.
 *
 * Pure utility — safe to import from server components (no 'use client').
 */
export function filterSelectedModels<T extends { id: string; country?: string }>(
  models: T[],
  selectedRaw: string | string[] | undefined,
  countryRaw?: string | string[] | undefined,
): T[] {
  // Explicit selection wins over country default.
  if (selectedRaw !== undefined) {
    const param = Array.isArray(selectedRaw) ? selectedRaw[0] : selectedRaw;
    const ids = new Set(param.split(',').map((s) => s.trim()).filter(Boolean));
    if (ids.size === 0) return [];
    return models.filter((m) => ids.has(m.id));
  }
  // Country default — single value, ignored if 'all' or missing.
  if (countryRaw !== undefined) {
    const country = (Array.isArray(countryRaw) ? countryRaw[0] : countryRaw).trim();
    if (country && country !== 'all') {
      return models.filter((m) => m.country === country);
    }
  }
  return models;
}
