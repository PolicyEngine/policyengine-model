import SectionOverview from '../../src/components/layout/SectionOverview';
import { detectCountry } from '../../src/components/comparison/detectCountry';
import { rulesSection } from '../../src/data/rulesSection';

export default async function RulesOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string | string[] }>;
}) {
  const country = await detectCountry((await searchParams).country);
  const { description, children } = rulesSection[country];
  return (
    <SectionOverview
      category="Model"
      title="Rules"
      description={description}
      children={children}
    />
  );
}
