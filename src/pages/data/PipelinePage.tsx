import DataPipeline from '../../components/data/DataPipeline';
import PageHeader from '../../components/layout/PageHeader';

export default function PipelinePage({ country }: { country: string }) {
  return (
    <div>
      <PageHeader category="Data" title="Microdata pipeline" />
      <DataPipeline country={country} />
    </div>
  );
}
