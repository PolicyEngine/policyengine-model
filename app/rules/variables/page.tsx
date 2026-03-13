'use client';
import VariablesPage from '../../../src/views/rules/VariablesPage';
import { useCountry } from '../../../src/hooks/useCountry';

export default function VariablesRoute() {
  const country = useCountry();
  return <VariablesPage country={country} />;
}
