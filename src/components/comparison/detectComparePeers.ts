import 'server-only';
import { loadComparisonData } from '../../data/comparisons';
import { parseComparePeers, hostModelId, type ParsedCompare } from './parseCompare';
import { detectCountry, type Country } from './detectCountry';

/**
 * Server-side helper: given a page's `?compare=` value, returns the
 * resolved peer set for the active country (validated against the
 * model catalogue) plus the host PE model id.
 *
 * Use from any server component that needs to render compare-mode
 * content (Coverage, Calibration, Behavioral, etc.). Mirrors the
 * client-side `useComparePeers` hook so SSR matches hydration.
 */
export async function detectComparePeers(
  rawCompare: string | string[] | undefined,
  rawCountry: string | string[] | undefined,
): Promise<{
  country: Country;
  host: string;
  parsed: ParsedCompare;
}> {
  const country = await detectCountry(rawCountry);
  const data = loadComparisonData();
  const host = hostModelId(country);
  const countryPeerIds = data.models
    .filter((m) => m.country === country && m.id !== host)
    .map((m) => m.id);
  const parsed = parseComparePeers(rawCompare, countryPeerIds);
  return { country, host, parsed };
}
