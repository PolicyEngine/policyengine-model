'use client';
import BehavioralPage from './BehavioralPage';
import type { Country } from '../hooks/useCountry';

/**
 * Client-component boundary wrapper for `BehavioralPage`. The default
 * PE-only behavioral view uses framer-motion via `BehavioralResponses`,
 * so when rendered from the server route (`app/behavioral/page.tsx`) it
 * must cross a `'use client'` boundary. Keeping that boundary in a thin
 * wrapper lets `BehavioralPage` and `BehavioralResponses` stay as authored.
 */
export default function BehavioralPageClient({ country }: { country: Country }) {
  return <BehavioralPage country={country} />;
}
