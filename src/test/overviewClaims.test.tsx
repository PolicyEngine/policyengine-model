import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import type { CoverageStatus, Program } from '../types/Program';
import type { ProgramsSource } from '../data/fetchPrograms';
import { computeStatusCount, summarizeRegistry } from '../data/programStatus';
import { getMicrosimSteps } from '../data/microsimSteps';

const searchParams = vi.hoisted(() => ({ current: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => searchParams.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// A pinned copy of the registry snapshot (public/programs-us.json is generated at build time and not committed).
const usSnapshot = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/programs-us.snapshot.json'), 'utf8'));

function response(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
}

const policyRulesCard = () => screen.getByRole('heading', { name: 'Policy rules' }).parentElement!;

describe('US overview policy-rules card', () => {
  beforeEach(() => {
    // fetchPrograms caches per module instance; start every test from an empty cache.
    vi.resetModules();
    searchParams.current = new URLSearchParams();
    window.history.replaceState({}, '', '/us/model');
  });

  afterEach(() => {
    vi.doUnmock('../data/fetchPrograms');
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('cites the same total and complete counts the coverage tracker shows', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(usSnapshot)));
    const { default: ThreeIngredients } = await import('../components/microsim/ThreeIngredients');
    const { default: CoverageTrackerPage } = await import('../views/rules/CoverageTrackerPage');

    const tracker = render(<CoverageTrackerPage country="us" />);
    // A summary stat card is a label whose previous sibling holds the number.
    const statValue = (label: string) => {
      const card = within(tracker.container).getAllByText(label)
        .find(el => /^\d+$/.test(el.previousElementSibling?.textContent ?? ''));
      return Number(card!.previousElementSibling!.textContent);
    };
    await within(tracker.container).findByText(/Federal programs \(\d+\)/);
    const total = statValue('Total programs');
    const complete = statValue('Complete');
    tracker.unmount();

    render(<ThreeIngredients country="us" />);
    expect(total).toBe(usSnapshot.programs.length);
    expect(await within(policyRulesCard()).findByText(
      `lists ${total} federal, state, and local programs, ${complete} of them marked complete.`,
      { exact: false },
    )).toBeInTheDocument();
    expect(policyRulesCard()).not.toHaveTextContent(/Over 55/);
  });

  it('links to the coverage tracker under the public mount and keeps the query string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(usSnapshot)));
    searchParams.current = new URLSearchParams('embed=true&country=us');
    const { default: ThreeIngredients } = await import('../components/microsim/ThreeIngredients');

    render(<ThreeIngredients country="us" />);
    const link = within(policyRulesCard()).getByRole('link', { name: 'coverage tracker' });
    expect(link).toHaveAttribute('href', '/us/model/rules/coverage?embed=true&country=us');
    await within(policyRulesCard()).findByText(/marked complete/);
  });

  it('shows no number while the registry is loading', async () => {
    vi.doMock('../data/fetchPrograms', () => ({ fetchProgramsWithSource: () => new Promise(() => {}) }));
    const { default: ThreeIngredients } = await import('../components/microsim/ThreeIngredients');

    render(<ThreeIngredients country="us" />);
    expect(policyRulesCard()).toHaveTextContent(
      'The coverage tracker lists federal, state, and local programs and the status of each.',
    );
    expect(policyRulesCard()).not.toHaveTextContent(/\d/);
  });

  it('shows no number when only the bundled fallback list is available', async () => {
    const fallbackPrograms: Program[] = [
      { id: 'a', name: 'A', fullName: 'A', status: 'complete', githubLinks: {} },
    ];
    const fetchProgramsWithSource = vi.fn().mockResolvedValue({
      programs: fallbackPrograms,
      source: { kind: 'fallback' },
    });
    vi.doMock('../data/fetchPrograms', () => ({ fetchProgramsWithSource }));
    const { default: ThreeIngredients } = await import('../components/microsim/ThreeIngredients');

    render(<ThreeIngredients country="us" />);
    await waitFor(() => expect(fetchProgramsWithSource).toHaveBeenCalledWith('us'));
    await act(async () => {});
    expect(policyRulesCard()).toHaveTextContent('lists federal, state, and local programs and the status of each.');
    expect(policyRulesCard()).not.toHaveTextContent(/\d/);
  });

  it('cites the production API registry when the snapshot is unavailable', async () => {
    const programs: Program[] = [
      { id: 'a', name: 'A', fullName: 'A', agency: 'IRS', status: 'complete', githubLinks: {} },
      { id: 'b', name: 'B', fullName: 'B', agency: 'State', status: 'partial', githubLinks: {} },
    ];
    vi.doMock('../data/fetchPrograms', () => ({
      fetchProgramsWithSource: vi.fn().mockResolvedValue({
        programs,
        source: { kind: 'api', repo: 'PolicyEngine/policyengine-us', apiVersion: '2.2.1' },
      }),
    }));
    const { default: ThreeIngredients } = await import('../components/microsim/ThreeIngredients');

    render(<ThreeIngredients country="us" />);
    expect(await within(policyRulesCard()).findByText(
      'lists 2 federal, state, and local programs, 1 of them marked complete.',
      { exact: false },
    )).toBeInTheDocument();
  });

  it('does not load the US registry for the UK overview', async () => {
    const fetchProgramsWithSource = vi.fn();
    vi.doMock('../data/fetchPrograms', () => ({ fetchProgramsWithSource }));
    const { default: ThreeIngredients } = await import('../components/microsim/ThreeIngredients');

    render(<ThreeIngredients country="uk" />);
    await act(async () => {});
    expect(fetchProgramsWithSource).not.toHaveBeenCalled();
    expect(within(policyRulesCard()).queryByRole('link')).not.toBeInTheDocument();
  });
});

const STATUSES: CoverageStatus[] = ['complete', 'partial', 'inProgress', 'notStarted'];
const status = fc.constantFrom(...STATUSES);
const program: fc.Arbitrary<Program> = fc.record({
  id: fc.string(),
  agency: fc.option(fc.constantFrom('IRS', 'HHS', 'SSA', 'State', 'Local' as const), { nil: undefined }),
  coverage: fc.option(fc.constantFrom('US', 'CA', 'NY', 'Los Angeles County, CA', ''), { nil: undefined }),
  status,
  hasStateVariation: fc.option(fc.boolean(), { nil: undefined }),
  stateImplementations: fc.option(
    fc.array(fc.record({ state: fc.constantFrom('CA', 'NY', 'TX', 'WA'), status })),
    { nil: undefined },
  ),
}).map(p => ({ ...p, name: p.id, fullName: p.id, githubLinks: {} }));
const source: fc.Arbitrary<ProgramsSource> = fc.constantFrom<ProgramsSource>(
  { kind: 'fallback' },
  { kind: 'api', repo: 'PolicyEngine/policyengine-us' },
  {
    kind: 'snapshot', repo: 'PolicyEngine/policyengine-us', branch: 'main',
    commit: 'abcdef1', fetchedAt: '2026-10-14T00:00:00.000Z', version: '2.2.1',
  },
);

describe('summarizeRegistry invariants', () => {
  it('never cites the bundled fallback list or an empty registry', () => {
    fc.assert(fc.property(fc.array(program), programs => {
      expect(summarizeRegistry({ programs, source: { kind: 'fallback' } })).toBeNull();
    }));
    expect(summarizeRegistry({ programs: [], source: { kind: 'api', repo: 'PolicyEngine/policyengine-us' } })).toBeNull();
  });

  it('counts every registry program once and never claims more complete programs than the registry marks complete', () => {
    fc.assert(fc.property(fc.array(program, { minLength: 1 }), source, (programs, src) => {
      const summary = summarizeRegistry({ programs, source: src });
      if (src.kind === 'fallback') {
        expect(summary).toBeNull();
        return;
      }
      const counts = computeStatusCount(programs);
      expect(summary).toEqual({ total: programs.length, complete: counts.complete });
      expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(programs.length);
      expect(summary!.complete).toBeGreaterThanOrEqual(0);
      expect(summary!.complete).toBeLessThanOrEqual(programs.filter(p => p.status === 'complete').length);
    }));
  });
});

describe('US walkthrough behavioral step', () => {
  const step = getMicrosimSteps('us')[3];

  it('describes the labor supply mechanism policyengine-us implements, not the elasticity of taxable income', () => {
    expect(step.description).not.toMatch(/taxable income/i);
    expect(step.description).toMatch(/fixed by default/);
    expect(step.description).toMatch(/labor supply elasticities/);
    expect(step.description).toMatch(/marginal tax rates/);
    expect(step.description).toMatch(/net income/);
  });
});
