import OverviewPageClient from '../src/views/OverviewPageClient';
import AboutThisModel from '../src/components/comparison/AboutThisModel';
import { detectComparePeers } from '../src/components/comparison/detectComparePeers';

/**
 * Overview route — server component so the "About this model" block can
 * load comparison YAML data on the server and react to the `?compare=`
 * URL contract without a hydration round-trip.
 *
 * The block is always rendered (PE-only mode when `?compare=` is absent
 * or empty) and expands to side-by-side tables once peers are selected.
 * It's passed as a slot to the client-component overview wrapper so the
 * Walkthrough and PackageVersions children (which use React state /
 * framer-motion) keep their existing client subtree.
 */
export default async function OverviewRoute({
  searchParams,
}: {
  searchParams: Promise<{
    compare?: string | string[];
    country?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const { country, host, parsed } = await detectComparePeers(
    sp.compare,
    sp.country,
  );
  const activeModelIds = [host, ...parsed.peers];

  return (
    <OverviewPageClient
      country={country}
      aboutBlock={<AboutThisModel activeModelIds={activeModelIds} />}
    />
  );
}
