'use client';
import { Suspense } from 'react';
import CoverageTrackerPage from '../../../src/views/rules/CoverageTrackerPage';
import { useCountry } from '../../../src/hooks/useCountry';

function Page() {
  const country = useCountry();
  return <CoverageTrackerPage country={country} />;
}

export default function CoverageRoute() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
