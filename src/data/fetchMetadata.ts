import type { Metadata } from '../types/Variable';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawCache = new Map<string, any>();
const metadataCache = new Map<string, Metadata>();

/** Try loading pre-built static metadata first, fall back to live API. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchFromStaticOrAPI(country: string): Promise<any> {
  // Try the pre-built static file (generated at build time by scripts/fetch-metadata.js)
  try {
    const staticUrl = `${import.meta.env.BASE_URL}metadata-${country}.json`;
    const res = await fetch(staticUrl);
    if (res.ok) {
      const data = await res.json();
      // Verify it has the expected shape
      if (data.variables && data.parameters) return data;
    }
  } catch {
    // Static file not available, fall through to API
  }

  // Fall back to live API
  const res = await fetch(`https://api.policyengine.org/${country}/metadata`);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const data = await res.json();
  return data.result ?? data;
}

/** Fetch and cache the raw API response (shared with fetchPrograms). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchMetadataRaw(country: string = 'us'): Promise<any> {
  if (rawCache.has(country)) return rawCache.get(country)!;

  const result = await fetchFromStaticOrAPI(country);
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
