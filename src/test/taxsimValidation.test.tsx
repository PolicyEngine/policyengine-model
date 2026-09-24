import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  fetchTaxsimValidation,
  parseTaxsimSummary,
  taxsimSummaryUrl,
  TAXSIM_DASHBOARD_URL,
  TAXSIM_VALIDATION_YEARS,
  type TaxsimValidation,
} from '../data/fetchTaxsimValidation';
import ValidationPage, { fallbackNotes, provenanceText } from '../views/data/ValidationPage';

// Hand-written test fixture shaped like policyengine-taxsim's
// dashboard/public/data/{year}/summary_{year}.json. Values are made up.
function summaryFixture(overrides: Record<string, unknown> = {}, taxsimFallback?: unknown) {
  return {
    federalMatchPct: 80.1,
    stateMatchPct: 70.2,
    federalMatchPctRel: 90.3,
    stateMatchPctRel: 95.4,
    stateMatchPctRelNet: 96.5,
    totalRecords: 1000,
    sampleRecords: 100,
    metadata: {
      policyengineUsVersion: '9.9.9',
      generatedAt: '2030-01-02T03:04:05+00:00',
      ...(taxsimFallback === undefined ? {} : { taxsimFallback }),
    },
    stateBreakdown: [{ state: 'CA', households: 10 }],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function fetchFrom(byYear: Record<number, () => Response | Promise<Response>>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const year = TAXSIM_VALIDATION_YEARS.find((y) => url === taxsimSummaryUrl(y));
    if (year === undefined || !byYear[year]) return jsonResponse({ error: 'not found' }, 404);
    return byYear[year]();
  }) as unknown as typeof fetch;
}

const allYears = (make: (year: number) => unknown) =>
  Object.fromEntries(TAXSIM_VALIDATION_YEARS.map((y) => [y, () => jsonResponse(make(y))]));

describe('parseTaxsimSummary', () => {
  it('maps each summary field to the matching tolerance', () => {
    expect(parseTaxsimSummary(2025, summaryFixture())).toEqual({
      year: 2025,
      records: 1000,
      federalWithin15: 80.1,
      stateWithin15: 70.2,
      federalWithin1Pct: 90.3,
      stateWithin1Pct: 95.4,
      stateWithin1PctNetOfRebates: 96.5,
      policyengineUsVersion: '9.9.9',
      generatedAt: '2030-01-02T03:04:05+00:00',
      taxsimFallbackStates: [],
    });
  });

  it('reads the TAXSIM fallback states only when they apply to that year', () => {
    const fallback = { states: ['GA', 'MD'], years: [2029, 2030], appliesToThisYear: true };
    expect(parseTaxsimSummary(2030, summaryFixture({}, fallback))?.taxsimFallbackStates).toEqual(['GA', 'MD']);
    expect(
      parseTaxsimSummary(2028, summaryFixture({}, { ...fallback, appliesToThisYear: false }))
        ?.taxsimFallbackStates,
    ).toEqual([]);
    // The dashboard also accepts a single `state`.
    expect(
      parseTaxsimSummary(2030, summaryFixture({}, { state: 'MD', appliesToThisYear: true }))
        ?.taxsimFallbackStates,
    ).toEqual(['MD']);
  });

  it('accepts summaries generated before the net-of-rebates metric existed', () => {
    const result = parseTaxsimSummary(2021, summaryFixture({ stateMatchPctRelNet: undefined }));
    expect(result?.stateWithin1PctNetOfRebates).toBeNull();
  });

  it.each([
    ['a missing headline rate', { federalMatchPctRel: undefined }],
    ['a rate above 100', { stateMatchPct: 100.1 }],
    ['a negative rate', { federalMatchPct: -1 }],
    ['a non-numeric rate', { stateMatchPctRel: '95.4' }],
    ['an invalid net rate', { stateMatchPctRelNet: Number.NaN }],
    ['no records', { totalRecords: 0 }],
    ['a fractional record count', { totalRecords: 10.5 }],
  ])('rejects %s', (_label, overrides) => {
    expect(parseTaxsimSummary(2025, summaryFixture(overrides))).toBeNull();
  });

  it('rejects non-object payloads', () => {
    expect(parseTaxsimSummary(2025, null)).toBeNull();
    expect(parseTaxsimSummary(2025, [summaryFixture()])).toBeNull();
  });
});

describe('fetchTaxsimValidation', () => {
  it('loads every published year from the dashboard data with an hourly cache', async () => {
    const fetchImpl = fetchFrom(allYears(() => summaryFixture()));
    const result = await fetchTaxsimValidation(fetchImpl);

    expect(result.results.map((r) => r.year)).toEqual([...TAXSIM_VALIDATION_YEARS]);
    expect(result.failedYears).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://www.policyengine.org/us/taxsim/data/2025/summary_2025.json',
      expect.objectContaining({ next: { revalidate: 3600 }, signal: expect.any(AbortSignal) }),
    );
  });

  it('skips a year that is missing, malformed, or fails to download', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = fetchFrom({
      2021: () => jsonResponse(summaryFixture()),
      // 2022 omitted: 404
      2023: () => jsonResponse({ totalRecords: 5 }),
      2024: () => Promise.reject(new Error('network down')),
      2025: () => new Response('not json', { status: 200 }),
    });
    const result = await fetchTaxsimValidation(fetchImpl);

    expect(result.results.map((r) => r.year)).toEqual([2021]);
    expect(result.failedYears).toEqual([2022, 2023, 2024, 2025]);
  });

});

describe('fallbackNotes', () => {
  it('groups years that share the same fallback states and names the states', () => {
    const base = parseTaxsimSummary(2021, summaryFixture())!;
    const results = [2021, 2022, 2023, 2024, 2025].map((year) => ({
      ...base,
      year,
      taxsimFallbackStates: year >= 2024 ? ['GA', 'MD'] : [],
    }));
    expect(fallbackNotes(results)).toEqual([
      'For 2024–2025, the TAXSIM results for Georgia and Maryland come from the previous TAXSIM build; other states use the updated build.',
    ]);
    expect(fallbackNotes(results.slice(0, 3))).toEqual([]);
  });
});

describe('provenanceText', () => {
  it('collapses a shared version and date into one line', () => {
    const r = parseTaxsimSummary(2025, summaryFixture())!;
    expect(provenanceText([r, { ...r, year: 2024 }])).toBe(
      'Results computed with policyengine-us 9.9.9, generated 2030-01-02.',
    );
  });

  it('lists differing versions and spans differing dates', () => {
    const r = parseTaxsimSummary(2025, summaryFixture())!;
    const other = { ...r, year: 2024, policyengineUsVersion: '9.9.8', generatedAt: '2029-12-30T00:00:00Z' };
    expect(provenanceText([r, other])).toBe(
      'Results computed with policyengine-us 9.9.9, 9.9.8, generated 2029-12-30 to 2030-01-02.',
    );
  });
});

describe('ValidationPage', () => {
  function validation(overrides: Partial<TaxsimValidation> = {}): TaxsimValidation {
    const results = TAXSIM_VALIDATION_YEARS.map(
      (y) => parseTaxsimSummary(y, summaryFixture({ federalMatchPctRel: 80 + (y - 2020) }))!,
    );
    return { results, failedYears: [], ...overrides };
  }

  it('shows each year with the tolerance its column reports', () => {
    render(<ValidationPage country="us" taxsim={validation()} />);
    const table = screen.getByRole('table', { name: /PolicyEngine and TAXSIM agree/ });
    const row2025 = within(table).getByRole('row', { name: /^2025/ });
    // Federal 1%, federal $15, state 1%, state 1% net, state $15.
    expect(within(row2025).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '85.0%',
      '80.1%',
      '95.4%',
      '96.5%',
      '70.2%',
    ]);
    expect(screen.getByText(/tax years 2021–2025/)).toBeInTheDocument();
    expect(screen.getByText(/Each year compares 1,000 household records/)).toBeInTheDocument();
    expect(
      screen.getByText('Results computed with policyengine-us 9.9.9, generated 2030-01-02.'),
    ).toBeInTheDocument();
  });

  it('defines each tolerance and links to the dashboard and the matching code', () => {
    render(<ValidationPage country="us" taxsim={validation()} />);
    expect(screen.getByText(/differ by less than 1% of the record's gross income/)).toBeInTheDocument();
    expect(screen.getByText(/85% of Social Security benefits/)).toBeInTheDocument();
    expect(screen.getByText(/zero or negative gross\s+income use the \$15 test/)).toBeInTheDocument();
    expect(screen.getByText(/differ by \$15 or less/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open the TAXSIM dashboard/ })).toHaveAttribute(
      'href',
      TAXSIM_DASHBOARD_URL,
    );
    expect(screen.getByRole('link', { name: 'scripts/refresh_dashboard.py' })).toHaveAttribute(
      'href',
      'https://github.com/PolicyEngine/policyengine-taxsim/blob/main/scripts/refresh_dashboard.py',
    );
    expect(screen.queryByText(/Jupyter Book/)).not.toBeInTheDocument();
  });

  it('discloses a TAXSIM build fallback only when the data records one', () => {
    const full = validation();
    const results = full.results.map((r) =>
      r.year >= 2024 ? { ...r, taxsimFallbackStates: ['GA', 'MD'] } : r,
    );
    const { unmount } = render(<ValidationPage country="us" taxsim={{ ...full, results }} />);
    expect(
      screen.getByText(/For 2024–2025, the TAXSIM results for Georgia and Maryland come from the previous TAXSIM build/),
    ).toBeInTheDocument();
    unmount();

    render(<ValidationPage country="us" taxsim={full} />);
    expect(screen.queryByText(/previous TAXSIM build/)).not.toBeInTheDocument();
  });

  it('says which years failed to load', () => {
    const full = validation();
    render(
      <ValidationPage
        country="us"
        taxsim={{ ...full, results: full.results.filter((r) => r.year !== 2023), failedYears: [2023] }}
      />,
    );
    expect(screen.getByText(/Results for 2023 could not be loaded/)).toBeInTheDocument();
    expect(screen.getByText(/tax years 2021, 2022, 2024, 2025/)).toBeInTheDocument();
  });

  it('shows the definitions and dashboard link, but no numbers, when nothing loads', () => {
    render(
      <ValidationPage
        country="us"
        taxsim={{ results: [], failedYears: [...TAXSIM_VALIDATION_YEARS] }}
      />,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    expect(screen.getByText(/latest results could not be loaded/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open the TAXSIM dashboard/ })).toBeInTheDocument();
    expect(screen.getByText('How agreement is measured')).toBeInTheDocument();
  });

  it('adds a records column when years compare different numbers of records', () => {
    const full = validation();
    const results = full.results.map((r, i) => (i === 0 ? { ...r, records: 999 } : r));
    render(<ValidationPage country="us" taxsim={{ ...full, results }} />);
    expect(screen.getByRole('columnheader', { name: 'Records' })).toBeInTheDocument();
    expect(screen.queryByText(/Each year compares/)).not.toBeInTheDocument();
  });

  it('keeps the UK page on the UK validation book', () => {
    render(<ValidationPage country="uk" />);
    expect(screen.getByRole('link', { name: /View full validation/ })).toHaveAttribute(
      'href',
      'https://policyengine.github.io/policyengine-uk',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
