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
    variables: await withModuleNames(country, variables, raw.version),
    parameters: raw.parameters ?? {},
  };

  metadataCache.set(country, result);
  return result;
}

// The repository each country's module map must come from.
const MODULE_MAP_REPO: Record<string, string> = { uk: 'PolicyEngine/policyengine-uk' };

export interface ModuleMapSnapshot {
  source: { repo: string; version: string; commit: string };
  modules: Record<string, string>;
}

/** Fill missing modules from a class-to-module map; names it lacks stay unclassified. */
export function fillModuleNames(
  variables: Record<string, Variable>,
  modules: Record<string, string>,
): Record<string, Variable> {
  return Object.fromEntries(
    Object.entries(variables).map(([name, v]) => {
      if (v.moduleName) return [name, v];
      const moduleName = Object.hasOwn(modules, name) ? modules[name] : undefined;
      return typeof moduleName === 'string' && moduleName ? [name, { ...v, moduleName }] : [name, v];
    }),
  );
}

/**
 * Whether a module map describes the variables an API response serves: it must
 * come from the country's repository, at the package version the API reports.
 */
export function moduleMapMatches(snapshot: unknown, country: string, apiVersion: unknown): snapshot is ModuleMapSnapshot {
  const s = snapshot as ModuleMapSnapshot | null;
  return (
    typeof apiVersion === 'string' &&
    apiVersion !== '' &&
    s?.source?.repo === MODULE_MAP_REPO[country] &&
    s.source.version === apiVersion &&
    typeof s.source.commit === 'string' &&
    /^[0-9a-f]{40}$/.test(s.source.commit) &&
    !!s.modules &&
    typeof s.modules === 'object' &&
    !Array.isArray(s.modules)
  );
}

/** The UK API serves no module names; fill them from the build-time map for the same release. */
async function withModuleNames(
  country: string,
  variables: Record<string, Variable>,
  apiVersion: unknown,
): Promise<Record<string, Variable>> {
  const all = Object.values(variables);
  const missing = all.filter((v) => !v.moduleName).length;
  if (all.length === 0 || missing < all.length / 2 || !MODULE_MAP_REPO[country]) return variables;
  try {
    const prefix = typeof window === 'undefined' ? '' : publicBasePrefixFromPath(window.location.pathname);
    const res = await fetch(`${prefix}/variable-modules-${country}.json`);
    if (!res.ok) return variables;
    const snapshot = await res.json();
    return moduleMapMatches(snapshot, country, apiVersion) ? fillModuleNames(variables, snapshot.modules) : variables;
  } catch {
    return variables;
  }
}
