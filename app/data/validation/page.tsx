'use client';
import { Suspense } from 'react';
import ValidationPage from '../../../src/views/data/ValidationPage';
import { useCountry } from '../../../src/hooks/useCountry';

function Page() {
  const country = useCountry();
  return <ValidationPage country={country} />;
}

export default function ValidationRoute() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
