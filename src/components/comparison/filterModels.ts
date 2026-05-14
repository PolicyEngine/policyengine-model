/**
 * Filter a model list to those selected by URL search params.
 *
 * Semantics:
 *   - `undefined` (no `?models=` param)   → all models (default).
 *   - empty string or just whitespace      → none.
 *   - comma-separated ids                  → those models, in input order.
 *
 * Pure utility — safe to import from server components (no 'use client').
 */
export function filterSelectedModels<T extends { id: string }>(
  models: T[],
  selectedRaw: string | string[] | undefined,
): T[] {
  if (selectedRaw === undefined) return models;
  const param = Array.isArray(selectedRaw) ? selectedRaw[0] : selectedRaw;
  const ids = new Set(param.split(',').map((s) => s.trim()).filter(Boolean));
  if (ids.size === 0) return [];
  return models.filter((m) => ids.has(m.id));
}
