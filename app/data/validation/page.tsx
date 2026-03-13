'use client';
import ValidationPage from '../../../src/views/data/ValidationPage';
import { useCountry } from '../../../src/hooks/useCountry';

export default function ValidationRoute() {
  const country = useCountry();
  return <ValidationPage country={country} />;
}
