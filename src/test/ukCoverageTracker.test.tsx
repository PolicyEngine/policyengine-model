import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describeVerifiedYears, groupByGovernment, parameterUrl } from '../components/rules/UkCoverageTracker';
import type { Program } from '../types/Program';

// A pinned copy of the UK registry snapshot (public/programs-uk.json is generated at build time and not committed).
// Refresh with: cp public/programs-uk.json src/test/fixtures/programs-uk.snapshot.json
const ukSnapshot = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/programs-uk.snapshot.json'), 'utf8'));

interface RegistryEntry {
  id: string;
  status: string;
  notes?: string;
  verified_start_year: number;
  verified_end_year?: number;
}
const registry: RegistryEntry[] = ukSnapshot.programs;
const commit: string = ukSnapshot.source.commit;
const github = 'https://github.com/PolicyEngine/policyengine-uk';

// Parameter files under the prefixes the tests open: a folder (Universal Credit) and a single file (benefit cap).
const parameterTree = [
  'gov/dwp/universal_credit/elements/child/amount.yaml',
  'gov/dwp/benefit_cap.yaml',
];

function response(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
}

function stubFetch({ snapshot = true, tree = true } = {}) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/uk/model/programs-uk.json') return snapshot ? response(ukSnapshot) : response(null, 404);
    if (url === '/uk/model/param-tree-uk.json') return tree ? response(parameterTree) : response(null, 404);
    throw new Error(`Unexpected fetch: ${url}`);
  }));
}

async function renderUkTracker() {
  const { default: CoverageTrackerPage } = await import('../views/rules/CoverageTrackerPage');
  render(<CoverageTrackerPage country="uk" />);
  await screen.findByText('Total programmes');
}

function statCount(label: string) {
  return Number(within(screen.getAllByText(label)[0].parentElement!).getByText(/^\d+$/).textContent);
}

function sectionCounts() {
  return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
}

// Role queries with names are slow over every card, so find a card by its programme name.
function details(programme: string) {
  const button = screen.getByText(programme, { selector: 'button span' }).closest('button')!;
  return { button, panel: document.getElementById(button.getAttribute('aria-controls')!)! };
}

describe('UK coverage tracker over the pinned UK registry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.history.replaceState({}, '', '/uk/model/rules/coverage');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('places every programme under exactly one known body and level of government', async () => {
    stubFetch();
    const { fetchProgramsWithSource } = await import('../data/fetchPrograms');
    const { groupByGovernment, ukAgency } = await import('../components/rules/UkCoverageTracker');
    const { programs } = await fetchProgramsWithSource('uk');
    expect(programs).toHaveLength(registry.length);
    expect(programs.filter((p) => ukAgency(p).level === 'other').map((p) => `${p.id} (${p.agency})`)).toEqual([]);

    const sections = groupByGovernment(programs, programs);
    expect(sections.map((s) => s.level)).toEqual(['uk', 'devolved', 'local']);
    const ids = sections.flatMap((s) => s.groups.flatMap((g) => g.programs.map((p) => p.id)));
    expect(ids).toHaveLength(programs.length);
    expect(new Set(ids).size).toBe(programs.length);
    expect(sections.find((s) => s.level === 'devolved')!.groups.map((g) => g.name))
      .toEqual(['Revenue Scotland', 'Social Security Scotland', 'Welsh Government']);
    expect(sections.find((s) => s.level === 'local')!.showAgencies).toBe(false);
  });

  it('shows the registry provenance, status counts and UK sections, with no US states', async () => {
    stubFetch();
    await renderUkTracker();

    expect(screen.getByText(/^Coverage reflects policyengine-uk \S+ \(main @ [0-9a-f]{7}, fetched \d{4}-\d{2}-\d{2}\)\./)).toBeInTheDocument();
    expect(statCount('Total programmes')).toBe(registry.length);
    expect(statCount('Complete')).toBe(registry.filter((p) => p.status === 'complete').length);
    expect(statCount('Partial')).toBe(registry.filter((p) => p.status === 'partial').length);
    // The UK registry uses only complete and partial.
    expect(screen.queryByText('In progress')).not.toBeInTheDocument();

    const headings = sectionCounts();
    expect(headings.map((h) => h!.replace(/ \(\d+\)$/, ''))).toEqual([
      'UK government programmes', 'Devolved programmes', 'Local authority programmes',
    ]);
    const total = headings.reduce((sum, h) => sum + Number(h!.match(/\((\d+)\)$/)![1]), 0);
    expect(total).toBe(registry.length);
    expect(screen.getByRole('heading', { level: 3, name: /^HM Revenue and Customs \(\d+\)$/ })).toBeInTheDocument();

    expect(document.body.textContent).not.toMatch(/By state|Federal programs|State programs|All states/);
  });

  it('narrows the list by name, body or variable, and says when nothing matches', async () => {
    stubFetch();
    await renderUkTracker();
    const search = screen.getByRole('searchbox', { name: 'Search programmes' });
    const dwp = registry.filter((p) => ukSnapshot.programs.find((q: { id: string; agency: string }) => q.id === p.id).agency === 'DWP');

    fireEvent.change(search, { target: { value: 'work and pensions' } });
    expect(sectionCounts()).toEqual([`UK government programmes (${dwp.length})`]);
    expect(screen.getByRole('heading', { level: 3, name: `Department for Work and Pensions (${dwp.length})` })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'pension_age_winter_heating_payment' } });
    expect(sectionCounts()).toEqual(['Devolved programmes (1)']);
    expect(details('Pension Age Winter Heating Payment').button).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'no such programme' } });
    expect(screen.getByText('No programmes match.')).toBeInTheDocument();
    // The summary counts describe the registry, not the search.
    expect(statCount('Total programmes')).toBe(registry.length);
  });

  it('counts only the programmes verified for a chosen year', async () => {
    stubFetch();
    await renderUkTracker();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by verified year' }), { target: { value: '2023' } });
    const verified2023 = registry.filter((p) => p.verified_start_year <= 2023 && (p.verified_end_year ?? Infinity) >= 2023);
    expect(statCount('Total programmes')).toBe(verified2023.length);
    expect(verified2023.length).toBeLessThan(registry.length);
  });

  it('opens a programme in place with its registry details and a parameters link the tree confirms', async () => {
    stubFetch();
    await renderUkTracker();

    const benefitCap = details('Benefit cap');
    expect(benefitCap.button).toHaveAttribute('aria-expanded', 'false');
    expect(benefitCap.panel).not.toBeVisible();
    fireEvent.click(benefitCap.button);
    expect(benefitCap.button).toHaveAttribute('aria-expanded', 'true');
    expect(benefitCap.panel).toBeVisible();
    const notes = registry.find((p) => p.id === 'benefit_cap')!.notes!;
    expect(within(benefitCap.panel).getByText(notes)).toBeInTheDocument();
    expect(within(benefitCap.panel).getByText('2022 onwards')).toBeInTheDocument();
    expect(within(benefitCap.panel).getByText('benefit_cap_reduction')).toBeInTheDocument();
    expect(within(benefitCap.panel).queryByText(/Years:/)).not.toBeInTheDocument();
    expect(await within(benefitCap.panel).findByRole('link', { name: 'Parameters on GitHub' }))
      .toHaveAttribute('href', `${github}/blob/${commit}/policyengine_uk/parameters/gov/dwp/benefit_cap.yaml`);

    const universalCredit = details('Universal Credit');
    fireEvent.click(universalCredit.button);
    expect(within(universalCredit.panel).getByRole('link', { name: 'Parameters on GitHub' }))
      .toHaveAttribute('href', `${github}/tree/${commit}/policyengine_uk/parameters/gov/dwp/universal_credit`);
    // Both stay open.
    expect(benefitCap.panel).toBeVisible();

    // Maternity Allowance has no parameter_prefix; Child Benefit's is missing from this tree.
    for (const name of ['Maternity Allowance', 'Child Benefit']) {
      const programme = details(name);
      fireEvent.click(programme.button);
      expect(within(programme.panel).queryByRole('link')).not.toBeInTheDocument();
    }
  });

  it('omits parameter links when the parameter tree is unavailable', async () => {
    stubFetch({ tree: false });
    await renderUkTracker();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/uk/model/param-tree-uk.json'));
    const universalCredit = details('Universal Credit');
    fireEvent.click(universalCredit.button);
    expect(within(universalCredit.panel).queryByRole('link')).not.toBeInTheDocument();
  });

  it('points to the registry, never the US fallback programmes, when the UK registry cannot be loaded', async () => {
    stubFetch({ snapshot: false });
    const { default: CoverageTrackerPage } = await import('../views/rules/CoverageTrackerPage');
    render(<CoverageTrackerPage country="uk" />);
    expect(await screen.findByText(/The UK programme registry could not be loaded/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'programs.yaml in policyengine-uk' }))
      .toHaveAttribute('href', `${github}/blob/main/policyengine_uk/programs.yaml`);
    expect(screen.queryByText('SNAP')).not.toBeInTheDocument();
    expect(screen.queryByText(/Coverage reflects/)).not.toBeInTheDocument();
  });
});

describe('UK coverage helpers', () => {
  const tree = new Set(['gov/hmrc/income_tax/rates/uk.yaml', 'gov/dwp/benefit_cap.yaml', 'gov/hmrc/vat.yaml']);

  it('links a parameter folder, a whole file, or the file that holds a key', () => {
    expect(parameterUrl('gov.hmrc.income_tax', tree, 'abc')).toBe(`${github}/tree/abc/policyengine_uk/parameters/gov/hmrc/income_tax`);
    expect(parameterUrl('gov.dwp.benefit_cap', tree, 'abc')).toBe(`${github}/blob/abc/policyengine_uk/parameters/gov/dwp/benefit_cap.yaml`);
    expect(parameterUrl('gov.hmrc.vat.standard_rate', tree, 'abc')).toBe(`${github}/blob/abc/policyengine_uk/parameters/gov/hmrc/vat.yaml`);
  });

  it('gives no link it cannot confirm', () => {
    expect(parameterUrl('gov.dwp.pip', tree, 'abc')).toBeUndefined();
    expect(parameterUrl(undefined, tree, 'abc')).toBeUndefined();
    expect(parameterUrl('gov.hmrc.income_tax', null, 'abc')).toBeUndefined();
  });

  it('names an agency it does not know under other programmes', () => {
    const programme = (id: string, agency: string): Program =>
      ({ id, name: id, fullName: id, status: 'complete', agency: agency as Program['agency'], githubLinks: {} });
    const programs = [programme('universal_credit', 'DWP'), programme('ni_rate_relief', 'Department for Communities')];
    expect(groupByGovernment(programs, programs).map((s) => [s.heading, s.showAgencies, s.groups.map((g) => g.name)]))
      .toEqual([
        ['UK government programmes', false, ['Department for Work and Pensions']],
        ['Other programmes', true, ['Department for Communities']],
      ]);
  });

  it.each([
    ['2019+', '2019 onwards'],
    ['2023-2025', '2023 to 2025'],
    ['2024-2024', '2024'],
    ['2024', '2024'],
    [undefined, undefined],
  ])('describes verified years %s as %s', (years, expected) => {
    expect(describeVerifiedYears(years)).toBe(expected);
  });
});
