import type { Metadata, Variable } from '../types/Variable';
import { publicBasePrefixFromPath } from '../hooks/usePublicBasePrefix';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawCache = new Map<string, any>();
const metadataCache = new Map<string, Metadata>();

/** Fetch and cache the raw API response (shared with fetchPrograms). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchMetadataRaw(country: string = 'us'): Promise<any> {
  if (rawCache.has(country)) return rawCache.get(country)!;

  const res = await fetch(`https://api.policyengine.org/${country}/metadata`);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const data = await res.json();
  const result = data.result ?? data;

  rawCache.set(country, result);
  return result;
}

/** Fetch and cache structured metadata (variables + parameters). */
export async function fetchMetadata(country: string = 'us'): Promise<Metadata> {
  if (metadataCache.has(country)) return metadataCache.get(country)!;

  const raw = await fetchMetadataRaw(country);
  const variables: Record<string, Variable> = raw.variables ?? {};

  const result: Metadata = {
    variables: await withModuleNames(country, variables),
    parameters: raw.parameters ?? {},
  };

  metadataCache.set(country, result);
  return result;
}

/**
 * Fill missing modules from exact Variable class declarations. Older snapshots
 * can fall back to unique file stems; unmatched names stay unclassified.
 */
export function fillModuleNames(
  variables: Record<string, Variable>,
  paths: string[],
  modules?: Record<string, string>,
): Record<string, Variable> {
  const pathSet = new Set(paths);
  const byStem = new Map<string, string | null>();
  for (const path of paths) {
    const stem = path.split('/').pop()!.replace(/\.py$/, '');
    byStem.set(stem, byStem.has(stem) ? null : path);
  }
  return Object.fromEntries(
    Object.entries(variables).map(([name, v]) => {
      if (v.moduleName) return [name, v];
      if (modules) {
        const moduleName = Object.hasOwn(modules, name) ? modules[name] : undefined;
        if (typeof moduleName !== 'string' || !pathSet.has(`${moduleName.replace(/\./g, '/')}.py`)) return [name, v];
        return [name, { ...v, moduleName }];
      }
      const path = byStem.get(name);
      if (!path) return [name, v];
      return [name, { ...v, moduleName: path.replace(/\.py$/, '').replace(/\//g, '.') }];
    }),
  );
}

/** The UK API serves no module names; fill them from the build-time variable tree. */
async function withModuleNames(
  country: string,
  variables: Record<string, Variable>,
): Promise<Record<string, Variable>> {
  const all = Object.values(variables);
  const missing = all.filter((v) => !v.moduleName).length;
  if (all.length === 0 || missing < all.length / 2) return variables;
  try {
    const prefix = typeof window === 'undefined' ? '' : publicBasePrefixFromPath(window.location.pathname);
    const res = await fetch(`${prefix}/variable-tree-${country}.json`);
    if (!res.ok) return variables;
    const tree = await res.json();
    const modules = tree?.modules && typeof tree.modules === 'object' && !Array.isArray(tree.modules)
      ? tree.modules : undefined;
    return Array.isArray(tree?.paths) ? fillModuleNames(variables, tree.paths, modules) : variables;
  } catch {
    return variables;
  }
}
