'use client';
import type { ReactNode } from 'react';
import OverviewPage from './OverviewPage';
import type { Country } from '../hooks/useCountry';

/**
 * Client-component boundary wrapper for `OverviewPage`. The walkthrough
 * and package-version widgets inside `OverviewPage` use React state and
 * framer-motion, so when rendered from a server route they must cross a
 * `'use client'` boundary. Keeping that boundary in a thin wrapper lets
 * `OverviewPage` and its children stay as authored while the server
 * route passes in the server-rendered "About this model" block as a
 * slot.
 */
export default function OverviewPageClient({
  country,
  aboutBlock,
}: {
  country: Country;
  aboutBlock?: ReactNode;
}) {
  return <OverviewPage country={country} aboutBlock={aboutBlock} />;
}
