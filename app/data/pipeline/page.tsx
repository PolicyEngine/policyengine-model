'use client';
import { Suspense } from 'react';
import PipelinePage from '../../../src/views/data/PipelinePage';
import { useCountry } from '../../../src/hooks/useCountry';

function Page() {
  const country = useCountry();
  return <PipelinePage country={country} />;
}

export default function PipelineRoute() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
