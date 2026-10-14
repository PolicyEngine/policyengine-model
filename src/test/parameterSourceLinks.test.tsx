import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParameterLeaf } from '../types/Variable';
// Load the dependency graph before case timers; each case still resets the tree cache.
import '../components/parameters/ParameterDetail';

beforeEach(() => {
  // Each case must load its own tree rather than reuse the component's cache.
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function showParameter(country: string, tree: unknown) {
  const path = country === 'uk' ? 'gov.hmrc.income_tax.rates.basic' : 'gov.irs.income_tax.rate';
  const parameter: ParameterLeaf = {
    type: 'parameter', parameter: path, label: 'Income tax rate', description: null,
    unit: '/1', period: 'year', values: { '2025-01-01': 0.1 },
  };
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(tree)));
  vi.stubGlobal('fetch', fetchImpl);
  const { default: ParameterDetail } = await import('../components/parameters/ParameterDetail');
  render(<ParameterDetail country={country} parameter={parameter} />);
  return { path, fetchImpl };
}

describe('Parameter source links', () => {
  it.each([
    { country: 'us', shape: 'legacy array' },
    { country: 'us', shape: 'provenance snapshot' },
    { country: 'uk', shape: 'legacy array' },
    { country: 'uk', shape: 'provenance snapshot' },
  ])('preserves the exact $country source link with a $shape', async ({ country, shape }) => {
    const path = country === 'uk' ? 'gov/hmrc/income_tax/rates/basic.yaml' : 'gov/irs/income_tax/rate.yaml';
    const tree = shape === 'legacy array' ? [path] : {
      source: { repo: `PolicyEngine/policyengine-${country}`, commit: 'a'.repeat(40) },
      paths: [path],
    };
    const { fetchImpl } = await showParameter(country, tree);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'View source' })).toHaveAttribute('href',
        `https://github.com/PolicyEngine/policyengine-${country}/blob/main/policyengine_${country}/parameters/${path}`);
    });
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith(`/param-tree-${country}.json`);
  });

  it.each([
    { paths: 'gov/irs/income_tax/rate.yaml' },
    { paths: ['gov/irs/income_tax/rate.yaml', 42] },
    ['gov/irs/income_tax/rate.yaml', 42],
    null,
  ].map(tree => ({ tree })))('keeps the existing directory fallback for an invalid tree: %j', async ({ tree }) => {
    await showParameter('us', tree);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'View source' })).toHaveAttribute('href',
        'https://github.com/PolicyEngine/policyengine-us/tree/main/policyengine_us/parameters/gov/irs');
    });
  });
});
