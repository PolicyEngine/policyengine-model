'use client';
import { Suspense } from 'react';
import CalibrationPage from '../../../src/views/data/CalibrationPage';
import { useCountry } from '../../../src/hooks/useCountry';

function Page() {
  const country = useCountry();
  return <CalibrationPage country={country} />;
}

export default function CalibrationRoute() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
