import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config, proxy } from '../../proxy';

const ORIGIN = 'https://model.test';

function runProxy(path: string) {
  return proxy(new NextRequest(`${ORIGIN}${path}`));
}

function headerUrl(response: Response, header: string) {
  const value = response.headers.get(header);
  expect(value).toBeTruthy();
  return new URL(value!, ORIGIN);
}

describe('country proxy', () => {
  it.each([
    ['/us/programs-us.json', '/programs-us.json'],
    ['/us/programs-uk.json', '/programs-uk.json'],
    ['/uk/programs-us.json', '/programs-us.json'],
    ['/uk/programs-uk.json', '/programs-uk.json'],
    ['/us/model/programs-us.json', '/programs-us.json'],
    ['/us/model/programs-uk.json', '/programs-uk.json'],
    ['/uk/model/programs-us.json', '/programs-us.json'],
    ['/uk/model/programs-uk.json', '/programs-uk.json'],
  ])('matches and rewrites the registry snapshot at %s', (path, expected) => {
    expect(unstable_doesMiddlewareMatch({ config, url: `${ORIGIN}${path}` })).toBe(true);

    const response = runProxy(path);
    const rewrite = headerUrl(response, 'x-middleware-rewrite');
    expect(rewrite.pathname).toBe(expected);
  });

  it.each([
    '/programs-us.json',
    '/us/model/logo.svg',
    '/us/model/programs-ca.json',
    '/_next/static/chunks/main.js',
  ])('keeps unrelated static paths outside the proxy: %s', (path) => {
    expect(unstable_doesMiddlewareMatch({ config, url: `${ORIGIN}${path}` })).toBe(false);
  });

  it('rewrites /us/model routes to internal app paths', () => {
    const response = runProxy('/us/model/rules/coverage?compare=all');
    const rewrite = headerUrl(response, 'x-middleware-rewrite');

    expect(rewrite.pathname).toBe('/rules/coverage');
    expect(rewrite.searchParams.get('compare')).toBe('all');
  });

  it('redirects mounted legacy comparison URLs under /us/model', () => {
    const response = runProxy('/us/model/comparison/modeling');
    const location = headerUrl(response, 'location');

    expect(response.status).toBe(308);
    expect(location.pathname).toBe('/us/model');
    expect(location.searchParams.get('compare')).toBe('all');
  });

  it('redirects standalone legacy comparison URLs under the country prefix', () => {
    const response = runProxy('/uk/comparison/coverage');
    const location = headerUrl(response, 'location');

    expect(response.status).toBe(308);
    expect(location.pathname).toBe('/uk/rules/coverage');
    expect(location.searchParams.get('compare')).toBe('all');
  });
});
