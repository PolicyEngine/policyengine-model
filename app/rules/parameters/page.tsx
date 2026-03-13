'use client';
import ParametersPage from '../../../src/views/rules/ParametersPage';
import { useCountry } from '../../../src/hooks/useCountry';

export default function ParametersRoute() {
  const country = useCountry();
  return <ParametersPage country={country} />;
}
