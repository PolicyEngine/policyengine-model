'use client';
import { Suspense } from 'react';
import OverviewPage from '../src/views/OverviewPage';
import { useCountry } from '../src/hooks/useCountry';

function Page() {
  const country = useCountry();
  return <OverviewPage country={country} />;
}

export default function OverviewRoute() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
