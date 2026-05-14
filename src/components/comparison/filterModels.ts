/**
 * Filter a model list to those selected by URL search params. Defaults
 * to all-selected when no param is set. Pure utility — safe to import
 * from server components (no 'use client').
 */
export function filterSelectedModels<T extends { id: string }>(
  models: T[],
  selectedRaw: string | string[] | undefined,
): T[] {
  if (!selectedRaw) return models;
  const param = Array.isArray(selectedRaw) ? selectedRaw[0] : selectedRaw;
  const ids = new Set(param.split(',').filter(Boolean));
  if (ids.size === 0) return models;
  return models.filter((m) => ids.has(m.id));
}
