'use client';
import BehavioralPage from '../../src/views/BehavioralPage';
import { useCountry } from '../../src/hooks/useCountry';

export default function BehavioralRoute() {
  const country = useCountry();
  return <BehavioralPage country={country} />;
}
