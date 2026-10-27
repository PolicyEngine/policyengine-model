import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const requestHeaders = vi.hoisted(() => ({ country: null as string | null }));

vi.mock('next/headers', () => ({
  headers: async () => new Headers(requestHeaders.country ? { 'x-pe-country': requestHeaders.country } : {}),
}));

import RulesOverviewPage from '../../app/rules/page';
import { rulesSection } from '../data/rulesSection';

async function renderRulesOverview({ param, header }: { param?: string; header?: string } = {}) {
  requestHeaders.country = header ?? null;
  render(await RulesOverviewPage({ searchParams: Promise.resolve(param ? { country: param } : {}) }));
}

describe('Rules overview copy', () => {
  beforeEach(() => {
    requestHeaders.country = null;
  });

  it('keeps the US copy unchanged', async () => {
    await renderRulesOverview();
    expect(screen.getByText('How PolicyEngine encodes tax-and-benefit rules — which programs are covered, the legislative parameters that drive calculations, and the input and output variables exposed to households and microsimulations.')).toBeInTheDocument();
    expect(screen.getByText('Which federal, state, and local tax-and-benefit programs PolicyEngine and peer models implement.')).toBeInTheDocument();
    expect(screen.getByText('Browse every legislative parameter that drives the model — thresholds, rates, brackets, eligibility cut-offs.')).toBeInTheDocument();
    expect(screen.getByText('Inspect the input and output variables computed at the person, family, tax unit, and household level.')).toBeInTheDocument();
  });

  it.each([
    ['the country parameter', { param: 'uk' }],
    ['the country header', { header: 'uk' }],
  ])('describes UK programmes and entities when the UK comes from %s', async (_source, request) => {
    await renderRulesOverview(request);
    expect(screen.getByText('Which UK government, devolved and local tax-and-benefit programmes PolicyEngine and peer models implement.')).toBeInTheDocument();
    expect(screen.getByText('Inspect the input and output variables computed at the person, benefit unit and household level.')).toBeInTheDocument();
    expect(screen.queryByText(/federal|tax unit/)).not.toBeInTheDocument();
  });

  it('uses no US-only terms or spelling in the UK copy', () => {
    const text = [rulesSection.uk.description, ...rulesSection.uk.children.map((child) => child.description)].join(' ');
    expect(text).not.toMatch(/federal|\bstates?\b|tax unit|family|\bprograms?\b/i);
  });

  it('links the same pages for both countries', () => {
    expect(rulesSection.uk.children.map((child) => [child.label, child.path]))
      .toEqual(rulesSection.us.children.map((child) => [child.label, child.path]));
  });
});
