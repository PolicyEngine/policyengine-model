'use client';
import { usePathname, useSearchParams } from 'next/navigation';

const VALID_COUNTRIES = new Set(['us', 'uk']);

export function useCountry(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathCountry = pathname.split('/').filter(Boolean).find(s => VALID_COUNTRIES.has(s));
  return searchParams.get('country') || pathCountry || 'us';
}
