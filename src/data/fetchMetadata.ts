import { createPolicyEngineApiClient } from '@policyengine/api-client';

import type { Metadata } from '../types/Variable';

// www.policyengine.org's dashboard API, which forwards metadata reads to the
// PolicyEngine Public API with PolicyEngine's credential.
const policyengine = createPolicyEngineApiClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawCache = new Map<string, any>();
const metadataCache = new Map<string, Metadata>();

/** Fetch and cache the raw API response (shared with fetchPrograms). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchMetadataRaw(country: string = 'us'): Promise<any> {
  if (rawCache.has(country)) return rawCache.get(country)!;

  if (country !== 'us' && country !== 'uk') {
    throw new Error(`No metadata for country "${country}"`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await policyengine.getMetadata<any>(country);

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
