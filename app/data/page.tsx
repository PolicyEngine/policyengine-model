import SectionOverview from '../../src/components/layout/SectionOverview';
import { detectCountry } from '../../src/components/comparison/detectCountry';
import { dataSection } from '../../src/data/sectionOverviews';

export default async function DataOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string | string[] }>;
}) {
  const country = await detectCountry((await searchParams).country);
  const copy = dataSection[country];
  return (
    <SectionOverview
      category="Model"
      title="Data"
      description={copy.description}
      children={copy.children}
    />
  );
}
