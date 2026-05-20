'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { parseComparePeers, hostModelId } from '../components/comparison/parseCompare';
import { useCountry } from './useCountry';

/**
 * Client-side hook returning the active peer set from `?compare=`.
 * Returns an empty peer list (and `compareMode: false`) when the param
 * is absent. The hook needs the country's peer ids to validate the
 * parsed value — passed in by the caller (usually the drawer or the
 * page that hydrates the list from a server-supplied prop).
 */
export function useComparePeers(countryPeerIds: string[]) {
  const params = useSearchParams();
  const raw = params.get('compare');
  return useMemo(
    () => parseComparePeers(raw ?? undefined, countryPeerIds),
    [raw, countryPeerIds],
  );
}

/** Convenience: the host PE model id for the active country. */
export function useHostModelId(): string {
  const country = useCountry();
  return hostModelId(country);
}
