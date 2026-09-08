import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const registryProgram = {
  id: 'tanf',
  name: 'TANF',
  full_name: 'Temporary Assistance for Needy Families',
  agency: 'HHS',
  category: 'Benefits',
  status: 'in_progress',
  coverage: 'US',
  has_state_variation: true,
  variable: 'tanf',
  parameter_prefix: 'gov.hhs.tanf',
  verified_start_year: 2021,
  verified_end_year: 2026,
  notes: 'Registry notes',
  state_implementations: [
    { state: 'CA', status: 'complete', name: 'CalWORKs', full_name: 'California Work Opportunity', variable: 'ca_tanf', notes: 'State notes' },
    { state: 'NY', status: 'in_progress' },
    { state: 'MA', name: 'Missing status' },
    { state: 'TX', status: 'not_started' },
    { state: 'WA', status: 'partial' },
  ],
};

function snapshot(country = 'us') {
  return {
    source: {
      repo: `PolicyEngine/policyengine-${country}`,
      branch: country === 'us' ? 'main' : 'master',
      commit: 'abcdef1234567890abcdef1234567890abcdef12',
      fetchedAt: '2026-09-08T12:34:56.000Z',
    },
    version: '1.823.0',
    apiVersion: '1.764.6',
    programs: [registryProgram],
  };
}

function response(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
}

describe('program source loading', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.history.replaceState({}, '', '/us/model/rules/coverage');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('prefers a mounted snapshot, transforms raw fields, and retains provenance', async () => {
    vi.mocked(fetch).mockResolvedValue(response(snapshot()));
    const { fetchProgramsWithSource, fetchPrograms } = await import('../data/fetchPrograms');
    const result = await fetchProgramsWithSource();

    expect(fetch).toHaveBeenCalledExactlyOnceWith('/us/model/programs-us.json');
    expect(result.source).toEqual({ kind: 'snapshot', ...snapshot().source, version: '1.823.0', apiVersion: '1.764.6' });
    expect(result.programs[0]).toMatchObject({
      id: 'tanf', name: 'TANF', fullName: registryProgram.full_name,
      agency: 'HHS', category: 'Benefits', status: 'inProgress', coverage: 'US',
      hasStateVariation: true, variable: 'tanf', verifiedYears: '2021-2026',
      notes: 'Registry notes. Years: 2021-2026',
      stateImplementations: [
        { state: 'CA', status: 'complete', name: 'CalWORKs', fullName: 'California Work Opportunity', variable: 'ca_tanf', notes: 'State notes' },
        { state: 'NY', status: 'inProgress' },
        { state: 'MA', status: 'notStarted', name: 'Missing status' },
        { state: 'TX', status: 'notStarted' },
        { state: 'WA', status: 'partial' },
      ],
    });
    expect(result.programs[0].githubLinks.parameters).toBe(`https://github.com/PolicyEngine/policyengine-us/tree/${snapshot().source.commit}/policyengine_us/parameters/gov/hhs/tanf`);
    expect(result.programs[0].stateImplementations?.[0].githubLinks?.parameters).toContain('/parameters/gov/states/ca');
    expect(await fetchPrograms()).toBe(result.programs);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['/', '/programs-us.json'],
    ['/rules/coverage', '/programs-us.json'],
    ['/us/rules/coverage', '/us/programs-us.json'],
    ['/us/model', '/us/model/programs-us.json'],
  ])('resolves static assets from %s', async (path, expected) => {
    window.history.replaceState({}, '', path);
    vi.mocked(fetch).mockResolvedValue(response(snapshot()));
    const { fetchPrograms } = await import('../data/fetchPrograms');
    await fetchPrograms('us');
    expect(fetch).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('loads UK snapshots with UK source links and isolates country caches', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(snapshot()))
      .mockResolvedValueOnce(response(snapshot('uk')));
    const { fetchProgramsWithSource } = await import('../data/fetchPrograms');
    await fetchProgramsWithSource('us');
    window.history.replaceState({}, '', '/uk/model/rules/coverage');
    const uk = await fetchProgramsWithSource('uk');
    expect(fetch).toHaveBeenNthCalledWith(2, '/uk/model/programs-uk.json');
    expect(uk.source).toMatchObject({ repo: 'PolicyEngine/policyengine-uk', branch: 'master' });
    expect(uk.programs[0].githubLinks.parameters).toContain('/policyengine-uk/tree/');
    expect(uk.programs[0].githubLinks.parameters).toContain('/policyengine_uk/parameters/');
  });

  it.each([
    ['missing snapshot', response(null, 404)],
    ['invalid snapshot structure', response({ programs: [] })],
    ['invalid source', response({ ...snapshot(), source: { ...snapshot().source, fetchedAt: 'invalid' } })],
    ['wrong country', response(snapshot('uk'))],
    ['invalid programs', response({ ...snapshot(), programs: [null] })],
    ['invalid JSON', new Response('{not json', { status: 200, headers: { 'Content-Type': 'application/json' } })],
  ])('falls back to API metadata after %s', async (_label, snapshotResponse) => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(snapshotResponse)
      .mockResolvedValueOnce(response({ result: { version: '1.764.6', modelled_policies: { programs: [{ ...registryProgram, status: 'partial' }] } } }));
    const { fetchProgramsWithSource } = await import('../data/fetchPrograms');
    const result = await fetchProgramsWithSource();
    expect(fetch).toHaveBeenNthCalledWith(1, '/us/model/programs-us.json');
    expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.policyengine.org/us/metadata');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.programs[0].status).toBe('partial');
    expect(result.source).toEqual({ kind: 'api', repo: 'PolicyEngine/policyengine-us', apiVersion: '1.764.6' });
  });

  it('accepts API metadata without an envelope or optional version', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Snapshot unavailable'))
      .mockResolvedValueOnce(response({ modelled_policies: { programs: [{ id: 'test', name: 'Test', status: 'complete', verified_years: '2024' }] } }));
    const { fetchProgramsWithSource } = await import('../data/fetchPrograms');
    const result = await fetchProgramsWithSource();
    expect(result.source).toEqual({ kind: 'api', repo: 'PolicyEngine/policyengine-us' });
    expect(result.programs[0]).toMatchObject({ fullName: 'Test', verifiedYears: '2024', notes: 'Years: 2024' });
  });

  it('uses hardcoded programs only after both snapshot and API fail', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Offline'));
    const { fetchProgramsWithSource } = await import('../data/fetchPrograms');
    const { programs } = await import('../data/programs');
    const result = await fetchProgramsWithSource();
    expect(fetch).toHaveBeenNthCalledWith(1, '/us/model/programs-us.json');
    expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.policyengine.org/us/metadata');
    expect(result.programs).toBe(programs);
    expect(result.source).toEqual({ kind: 'fallback' });
  });

  it('uses hardcoded programs when API metadata has no registry', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(null, 404)).mockResolvedValueOnce(response({ version: '1.764.6' }));
    const { fetchProgramsWithSource } = await import('../data/fetchPrograms');
    expect((await fetchProgramsWithSource()).source).toEqual({ kind: 'fallback' });
  });

  it('retries a later call after using the hardcoded fallback', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Offline')).mockRejectedValueOnce(new Error('Offline'));
    const { fetchProgramsWithSource } = await import('../data/fetchPrograms');
    expect((await fetchProgramsWithSource()).source.kind).toBe('fallback');
    vi.mocked(fetch).mockResolvedValueOnce(response(snapshot()));
    expect((await fetchProgramsWithSource()).source.kind).toBe('snapshot');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
