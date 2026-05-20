import OverviewPageClient from '../src/views/OverviewPageClient';
import AboutThisModel from '../src/components/comparison/AboutThisModel';
import { detectComparePeers } from '../src/components/comparison/detectComparePeers';

/**
 * Overview route — server component so the "About this model" block
 * can load comparison YAML data on the server and react to the
 * `?compare=` URL contract without a hydration round-trip.
 *
 * Default (no `?compare=`) renders the original Walkthrough +
 * PackageVersions PE-only Overview untouched — comparison is opt-in
 * via the drawer. Once peers are selected, an "About this model"
 * block slots in above the existing children showing transparency /
 * freshness / artifacts / usage side-by-side.
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

  // Only render the About-this-model block in compare mode. Default
  // pages stay as they were before the unified-comparison rebuild —
  // comparison is a lens the user opts into via the drawer.
  const aboutBlock = parsed.compareMode ? (
    <AboutThisModel activeModelIds={[host, ...parsed.peers]} />
  ) : undefined;

  return <OverviewPageClient country={country} aboutBlock={aboutBlock} />;
}
