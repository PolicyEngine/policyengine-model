'use client';
import { createContext, useContext } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export type Country = 'us' | 'uk';

const VALID_COUNTRIES: Set<Country> = new Set(['us', 'uk']);

function isCountry(s: string): s is Country {
  return VALID_COUNTRIES.has(s as Country);
}

/** Derive country from search params and pathname. */
export function useCountryFromUrl(): Country {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = searchParams.get('country');
  if (param && isCountry(param)) return param;
  const pathCountry = pathname.split('/').filter(Boolean).find(isCountry);
  return pathCountry || 'us';
}

/** Context for passing country from layout to pages. */
export const CountryContext = createContext<Country>('us');

/** Hook to read country from context (provided by ClientLayout). */
export function useCountry(): Country {
  return useContext(CountryContext);
}
