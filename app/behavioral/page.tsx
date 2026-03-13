'use client';
import { Suspense } from 'react';
import BehavioralPage from '../../src/views/BehavioralPage';
import { useCountry } from '../../src/hooks/useCountry';

function Page() {
  const country = useCountry();
  return <BehavioralPage country={country} />;
}

export default function BehavioralRoute() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
