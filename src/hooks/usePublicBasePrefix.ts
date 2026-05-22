'use client';

import { useSyncExternalStore } from 'react';

const MODEL_MOUNT_PATTERN = /^\/(us|uk)\/model(?=\/|$)/;
const COUNTRY_PREFIX_PATTERN = /^\/(us|uk)(?=\/|$)/;

export function publicBasePrefixFromPath(pathname: string): string {
  const modelMount = pathname.match(MODEL_MOUNT_PATTERN);
  if (modelMount) return `/${modelMount[1]}/model`;

  const countryPrefix = pathname.match(COUNTRY_PREFIX_PATTERN);
  if (countryPrefix) return `/${countryPrefix[1]}`;

  return '';
}

export function appPathFromPublicPath(pathname: string): string {
  const basePrefix = publicBasePrefixFromPath(pathname);
  if (!basePrefix) return pathname || '/';
  return pathname.slice(basePrefix.length) || '/';
}

/**
 * Rewrites mean SSR may see `/rules/coverage` while the browser URL is
 * `/us/model/rules/coverage`. Keep the initial render prefix-free so
 * hydration matches, then restore the public prefix for user navigation.
 */
export function usePublicBasePrefix(): string {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener('popstate', onStoreChange);
      return () => window.removeEventListener('popstate', onStoreChange);
    },
    () => publicBasePrefixFromPath(window.location.pathname),
    () => '',
  );
}
