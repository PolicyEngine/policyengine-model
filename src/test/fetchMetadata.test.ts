import { afterEach, describe, expect, it, vi } from 'vitest';
import { fillModuleNames, moduleMapMatches } from '../data/fetchMetadata';
import type { Variable } from '../types/Variable';

const variable = (name: string, moduleName: string | null = null): Variable => ({ name, moduleName } as Variable);
const modules = {
  CB_HITC: 'gov.hmrc.income_tax.charges.child_benefit_hitc',
  has_student_loan: 'gov.hmrc.student_loans.student_loan_repayment',
  armed_forces_independence_payment: 'gov.dwp.afip',
};
const snapshot = {
  source: { repo: 'PolicyEngine/policyengine-uk', version: '2.130.1', commit: 'a'.repeat(40) },
  modules,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('variable module enrichment', () => {
  it('uses exact classes rather than file stems for UK departments', () => {
    const variables = Object.fromEntries(Object.keys(modules).map(name => [name, variable(name)]));
    const filled = fillModuleNames(variables, modules);
    for (const [name, moduleName] of Object.entries(modules)) expect(filled[name].moduleName).toBe(moduleName);
    expect(variables.CB_HITC.moduleName).toBeNull();
  });

  it('leaves names the map lacks unclassified, whatever their files are called', () => {
    const filled = fillModuleNames({ afip: variable('afip'), cb_hitc: variable('cb_hitc'), unknown: variable('unknown') }, modules);
    for (const v of Object.values(filled)) expect(v.moduleName).toBeNull();
  });

  it('preserves existing API modules and ignores inherited object keys', () => {
    const original = variable('CB_HITC', 'gov.irs.api_module');
    expect(fillModuleNames({ CB_HITC: original }, modules).CB_HITC).toBe(original);
    expect(fillModuleNames({ constructor: variable('constructor') }, {})).toMatchObject({ constructor: { moduleName: null } });
  });

  it('accepts only a map from the country repository at the version the API serves', () => {
    expect(moduleMapMatches(snapshot, 'uk', '2.130.1')).toBe(true);
    const rejected: [string, unknown, unknown][] = [
      ['a stale version', snapshot, '2.131.0'],
      ['the wrong repository', { ...snapshot, source: { ...snapshot.source, repo: 'PolicyEngine/policyengine-us' } }, '2.130.1'],
      ['no provenance', { modules }, '2.130.1'],
      ['no commit', { ...snapshot, source: { repo: snapshot.source.repo, version: '2.130.1' } }, '2.130.1'],
      ['an API with no version', snapshot, undefined],
      ['a map that is a list', { ...snapshot, modules: [] }, '2.130.1'],
      ['a country with no map repository', snapshot, '2.130.1'],
    ];
    for (const [label, s, apiVersion] of rejected) {
      expect([label, moduleMapMatches(s, label === 'a country with no map repository' ? 'us' : 'uk', apiVersion)]).toEqual([label, false]);
    }
  });

  async function loadUk(api: { version?: string }, served: unknown) {
    const variables = Object.fromEntries(Object.keys(modules).map(name => [name, variable(name)]));
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async input => {
      if (String(input) === 'https://api.policyengine.org/uk/metadata') {
        return new Response(JSON.stringify({ result: { variables, parameters: {}, ...api } }));
      }
      if (String(input) === '/variable-modules-uk.json') {
        if (served instanceof Error) throw served;
        return new Response(JSON.stringify(served));
      }
      throw new Error(`Unexpected request: ${input}`);
    }));
    const { fetchMetadata } = await import('../data/fetchMetadata');
    return fetchMetadata('uk');
  }

  it('fills UK modules through fetchMetadata when the map matches the API version', async () => {
    const metadata = await loadUk({ version: '2.130.1' }, snapshot);
    for (const [name, moduleName] of Object.entries(modules)) expect(metadata.variables[name].moduleName).toBe(moduleName);
  });

  it.each([
    ['a stale map', { version: '2.131.0' }, snapshot],
    ['a map from another repository', { version: '2.130.1' }, { ...snapshot, source: { ...snapshot.source, repo: 'someone/fork' } }],
    ['a map with no provenance', { version: '2.130.1' }, { modules }],
    ['an unavailable map', { version: '2.130.1' }, new Error('Snapshot offline')],
  ])('leaves every UK variable unclassified with %s', async (_, api, served) => {
    const metadata = await loadUk(api, served);
    for (const v of Object.values(metadata.variables)) expect(v.moduleName).toBeNull();
  });

  it('keeps US metadata unchanged and does not request a module map', async () => {
    const variables = { income_tax: variable('income_tax', 'gov.irs.income_tax') };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ variables, parameters: {} })));
    vi.stubGlobal('fetch', fetchImpl);
    const { fetchMetadata } = await import('../data/fetchMetadata');
    await expect(fetchMetadata('us')).resolves.toEqual({ variables, parameters: {} });
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith('https://api.policyengine.org/us/metadata');
  });
});
