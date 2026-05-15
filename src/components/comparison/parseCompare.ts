/**
 * Parse the `?compare=` URL search param. Pure utility — safe to use
 * from server components, the AppShell client wrapper, and any
 * section component that needs to know whether peers are active.
 *
 * Semantics:
 *   - `undefined` / `''` / missing  → PE-only mode (empty peer list).
 *   - `'all'`                       → every peer in the active country.
 *   - `'id1,id2'`                   → those peers, intersected with the
 *                                     country's peer set so URL hacks
 *                                     can't escape country scope.
 *
 * The host country's "self" model (policyengine-us or policyengine-uk)
 * is never returned in the peer list — it's the implicit anchor of
 * every comparison and shouldn't be selectable as a peer.
 */
export interface ParsedCompare {
  /** Peer model ids (excluding the host PE model). */
  peers: string[];
  /** True when at least one peer is selected. */
  compareMode: boolean;
  /** True when the user explicitly asked for all peers. */
  isAll: boolean;
}

export function parseComparePeers(
  raw: string | string[] | undefined,
  countryPeerIds: string[],
): ParsedCompare {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) {
    return { peers: [], compareMode: false, isAll: false };
  }
  if (value === 'all') {
    return { peers: [...countryPeerIds], compareMode: true, isAll: true };
  }
  const set = new Set(countryPeerIds);
  const peers = value
    .split(',')
    .map((s) => s.trim())
    .filter((id) => set.has(id));
  return {
    peers,
    compareMode: peers.length > 0,
    isAll: false,
  };
}

/**
 * Build the host PE model id for a given country. The host is implicit
 * in every compare view — every comparison page is rooted at
 * PolicyEngine US or PolicyEngine UK.
 */
export function hostModelId(country: 'us' | 'uk'): string {
  return country === 'us' ? 'policyengine-us' : 'policyengine-uk';
}
