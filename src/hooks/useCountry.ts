'use client';
import { createContext, useContext } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const VALID_COUNTRIES = new Set(['us', 'uk']);

/** Derive country from search params and pathname. */
export function useCountryFromUrl(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathCountry = pathname.split('/').filter(Boolean).find(s => VALID_COUNTRIES.has(s));
  return searchParams.get('country') || pathCountry || 'us';
}

/** Context for passing country from layout to pages. */
export const CountryContext = createContext<string>('us');

/** Hook to read country from context (provided by ClientLayout). */
export function useCountry(): string {
  return useContext(CountryContext);
}
