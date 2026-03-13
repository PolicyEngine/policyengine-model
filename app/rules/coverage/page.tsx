'use client';
import CoverageTrackerPage from '../../../src/views/rules/CoverageTrackerPage';
import { useCountry } from '../../../src/hooks/useCountry';

export default function CoverageRoute() {
  const country = useCountry();
  return <CoverageTrackerPage country={country} />;
}
