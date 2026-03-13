'use client';
import { Suspense } from 'react';
import VariablesPage from '../../../src/views/rules/VariablesPage';
import { useCountry } from '../../../src/hooks/useCountry';

function Page() {
  const country = useCountry();
  return <VariablesPage country={country} />;
}

export default function VariablesRoute() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
