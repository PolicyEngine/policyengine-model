'use client';
import PipelinePage from '../../../src/views/data/PipelinePage';
import { useCountry } from '../../../src/hooks/useCountry';

export default function PipelineRoute() {
  const country = useCountry();
  return <PipelinePage country={country} />;
}
