'use client';
import { Suspense } from 'react';
import ParametersPage from '../../../src/views/rules/ParametersPage';
import { useCountry } from '../../../src/hooks/useCountry';

function Page() {
  const country = useCountry();
  return <ParametersPage country={country} />;
}

export default function ParametersRoute() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
