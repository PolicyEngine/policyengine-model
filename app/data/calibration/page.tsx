'use client';
import CalibrationPage from '../../../src/views/data/CalibrationPage';
import { useCountry } from '../../../src/hooks/useCountry';

export default function CalibrationRoute() {
  const country = useCountry();
  return <CalibrationPage country={country} />;
}
