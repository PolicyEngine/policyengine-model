import DataPipeline from '../../components/data/DataPipeline';
import PageHeader from '../../components/layout/PageHeader';
import type { Country } from '../../hooks/useCountry';

export default function PipelinePage({ country }: { country: Country }) {
  return (
    <div>
      <PageHeader category="Data" title="Microdata pipeline" />
      <DataPipeline country={country} />
    </div>
  );
}
