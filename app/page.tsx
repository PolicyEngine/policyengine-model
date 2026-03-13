'use client';
import OverviewPage from '../src/views/OverviewPage';
import { useCountry } from '../src/hooks/useCountry';

export default function OverviewRoute() {
  const country = useCountry();
  return <OverviewPage country={country} />;
}
