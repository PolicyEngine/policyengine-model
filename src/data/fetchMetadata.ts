import type { Metadata } from '../types/Variable';

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

  const result: Metadata = {
    variables: raw.variables ?? {},
    parameters: raw.parameters ?? {},
  };

  metadataCache.set(country, result);
  return result;
}
