import { afterEach, describe, expect, it, vi } from 'vitest';
import { fillModuleNames } from '../data/fetchMetadata';
import type { Variable } from '../types/Variable';

const variable = (name: string, moduleName: string | null = null): Variable => ({ name, moduleName } as Variable);
const modules = {
  CB_HITC: 'gov.hmrc.income_tax.charges.child_benefit_hitc',
  has_student_loan: 'gov.hmrc.student_loans.student_loan_repayment',
  armed_forces_independence_payment: 'gov.dwp.afip',
};
const paths = Object.values(modules).map(moduleName => `${moduleName.replace(/\./g, '/')}.py`);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('variable module enrichment', () => {
  it('uses exact classes rather than file stems for UK departments', () => {
    const variables = Object.fromEntries(Object.keys(modules).map(name => [name, variable(name)]));
    const filled = fillModuleNames(variables, paths, modules);
    for (const [name, moduleName] of Object.entries(modules)) expect(filled[name].moduleName).toBe(moduleName);
    expect(variables.CB_HITC.moduleName).toBeNull();
  });

  it('trusts the class map over a stem match and leaves unknown names unclassified', () => {
    const filled = fillModuleNames({
      afip: variable('afip'),
      cb_hitc: variable('cb_hitc'),
      unknown: variable('unknown'),
    }, paths, modules);
    for (const v of Object.values(filled)) expect(v.moduleName).toBeNull();
  });

  it('preserves existing API modules and refuses modules absent from the source tree', () => {
    const original = variable('CB_HITC', 'gov.irs.api_module');
    expect(fillModuleNames({ CB_HITC: original }, paths, modules).CB_HITC).toBe(original);
    expect(fillModuleNames({ CB_HITC: variable('CB_HITC') }, [], modules).CB_HITC.moduleName).toBeNull();
    expect(fillModuleNames({ constructor: variable('constructor') }, paths, {}))
      .toMatchObject({ constructor: { moduleName: null } });
  });

  it('loads the generated class map through fetchMetadata', async () => {
    const variables = Object.fromEntries(Object.keys(modules).map(name => [name, variable(name)]));
    const fetchImpl = vi.fn<typeof fetch>(async input => {
      if (String(input) === 'https://api.policyengine.org/uk/metadata') {
        return new Response(JSON.stringify({ result: { variables, parameters: {} } }));
      }
      if (String(input) === '/variable-tree-uk.json') {
        return new Response(JSON.stringify({ source: { commit: 'a'.repeat(40) }, paths, modules }));
      }
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchImpl);
    const { fetchMetadata } = await import('../data/fetchMetadata');
    const metadata = await fetchMetadata('uk');
    expect(metadata.variables.CB_HITC.moduleName).toBe(modules.CB_HITC);
    expect(metadata.variables.has_student_loan.moduleName).toBe(modules.has_student_loan);
    expect(metadata.variables.armed_forces_independence_payment.moduleName).toBe(modules.armed_forces_independence_payment);
  });

  it('keeps the metadata usable if the generated snapshot is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async input => {
      if (String(input) === 'https://api.policyengine.org/uk/metadata') {
        return new Response(JSON.stringify({ variables: { CB_HITC: variable('CB_HITC') }, parameters: {} }));
      }
      throw new Error('Snapshot offline');
    }));
    const { fetchMetadata } = await import('../data/fetchMetadata');
    await expect(fetchMetadata('uk')).resolves.toEqual({ variables: { CB_HITC: variable('CB_HITC') }, parameters: {} });
  });

  it('keeps US metadata unchanged and does not request a module snapshot', async () => {
    const variables = { income_tax: variable('income_tax', 'gov.irs.income_tax') };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ variables, parameters: {} })));
    vi.stubGlobal('fetch', fetchImpl);
    const { fetchMetadata } = await import('../data/fetchMetadata');
    await expect(fetchMetadata('us')).resolves.toEqual({ variables, parameters: {} });
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith('https://api.policyengine.org/us/metadata');
  });
});
