import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  getLevel, getSubGroup, getSubGroupLabel, getSubGroupDescription, levelsFor, levelConfig, LEVEL_CONFIG, type Level,
} from '../components/shared/categoryUtils';
import { fillModuleNames } from '../data/fetchMetadata';
import { verifiedLinks } from '../components/rules/UkCoverageTracker';
import type { Variable } from '../types/Variable';

const US_ONLY: Level[] = ['federal', 'state', 'local', 'territory'];
const UK_ONLY: Level[] = ['uk_government', 'devolved', 'local_authority', 'assumptions', 'unclassified'];

describe('UK parameter and variable taxonomy', () => {
  it.each([
    ['gov.hmrc.income_tax.rates.uk[0].rate', 'uk_government', 'hmrc', 'HM Revenue and Customs (HMRC)'],
    ['gov.dwp.universal_credit.elements.standard_allowance', 'uk_government', 'dwp', 'Department for Work and Pensions (DWP)'],
    ['gov.social_security_scotland.scottish_child_payment.amount', 'devolved', 'social_security_scotland', 'Social Security Scotland'],
    ['gov.wra.land_transaction_tax.rates', 'devolved', 'wra', 'Welsh Revenue Authority'],
    ['gov.local_authorities.domestic_rates.rates', 'local_authority', 'domestic_rates', 'Northern Ireland domestic rates'],
    ['gov.local_authorities.newham.council_tax_reduction.max', 'local_authority', 'newham', 'Newham'],
    ['gov.economic_assumptions.yoy_growth.obr.cpi', 'assumptions', 'economic_assumptions', 'Economic assumptions'],
    ['gov.simulation.labour_supply_responses.income_elasticity', 'assumptions', 'simulation', 'Simulation settings'],
    ['gov.dynamic.labour_supply_response', 'assumptions', 'dynamic', 'Dynamic response settings'],
    ['gov.gov_tax', 'uk_government', 'all_government_totals', 'Totals across all levels of government'],
    ['gov.gov_spending', 'uk_government', 'all_government_totals', 'Totals across all levels of government'],
    ['gov.gov_balance', 'uk_government', 'all_government_totals', 'Totals across all levels of government'],
    ['gov.contrib.policyengine.disable_simulated_benefits', 'reform', 'policyengine', 'Policyengine'],
    ['household.income.employment_income', 'household', 'income', 'Income'],
    ['input.vehicle.num_vehicles', 'household', 'vehicle', 'Vehicles'],
    ['input.rent', 'household', 'input', 'Other inputs'],
  ])('%s is %s / %s', (path, level, group, label) => {
    expect(getLevel(path, 'uk')).toBe(level);
    expect(getSubGroup(path, 'uk')).toBe(group);
    expect(getSubGroupLabel(group, level as Level, 'uk')).toBe(label);
  });

  it('keeps unknown UK modules separate from household variables', () => {
    for (const path of [null, '', 'misc.unknown']) {
      expect(getLevel(path, 'uk')).toBe('unclassified');
      expect(getSubGroup(path, 'uk')).toBe('Other');
    }
    expect(levelConfig('unclassified', 'uk').label).toBe('Unclassified variables');
    expect(getLevel('household.income.household_net_income', 'uk')).toBe('household');
    expect(getLevel('input.demographic', 'uk')).toBe('household');
  });

  it('describes UK inputs, calculated results, reform assumptions, and cross-government totals', () => {
    expect(levelConfig('household', 'uk')).toMatchObject({
      label: 'Household variables',
      description: 'Demographic, income, consumption, and wealth inputs, and calculated household results such as household net income',
    });
    expect(levelConfig('reform', 'uk').description).toBe('Contributed reform proposals and modelling assumptions, some enabled by default');
    expect(getSubGroupDescription('all_government_totals', 'uk_government', 'uk')).toBe('Tax, spending, and balance totals across UK, devolved, and local government');
  });

  it('never puts a UK path in a US level, or a US path in a UK level', () => {
    const segment = fc.stringMatching(/^[a-z][a-z_0-9]{0,12}$/);
    fc.assert(fc.property(fc.array(segment, { minLength: 1, maxLength: 6 }), (parts) => {
      for (const root of ['gov', 'household', 'input', 'contrib', 'misc']) {
        const path = [root, ...parts].join('.');
        expect(levelsFor('uk')).toContain(getLevel(path, 'uk'));
        expect(US_ONLY).not.toContain(getLevel(path, 'uk'));
        expect(UK_ONLY).not.toContain(getLevel(path, 'us'));
        expect(levelsFor('us')).toContain(getLevel(path, 'us'));
      }
    }));
  });

  it('keeps the US taxonomy unchanged when no country is given', () => {
    expect(getLevel('gov.irs.credits.ctc.amount')).toBe('federal');
    expect(getLevel('gov.states.ca.tax.income.rates')).toBe('state');
    expect(getSubGroup('gov.states.ca.tax.income.rates')).toBe('CA');
    expect(levelsFor()).toEqual(['federal', 'state', 'local', 'territory', 'reform', 'household']);
    expect(levelConfig('household', 'us')).toEqual({
      label: 'Household inputs', description: 'Demographics, income, expenses, and geographic inputs', color: '#475569', order: 5,
    });
    expect(levelConfig('reform', 'us')).toEqual({
      label: 'Reforms', description: 'Contributed reform proposals and policy experiments', color: '#2C7A7B', order: 4,
    });
    expect(getSubGroupLabel('income', 'household', 'us')).toBe('Income');
    expect(getSubGroupDescription('income', 'household', 'us')).toBe('Employment, self-employment, investment, and other income sources');
    expect(getSubGroup('gov.gov_tax', 'us')).toBe('gov_tax');
    expect(getSubGroupLabel('gov_tax', 'federal', 'us')).toBe('GOV_TAX');
    expect(getLevel(null, 'us')).toBe('household');
    expect(getLevel('misc.unknown', 'us')).toBe('household');
  });

  it('describes UK levels without US agencies', () => {
    for (const level of levelsFor('uk')) {
      const { label, description } = levelConfig(level, 'uk');
      expect(`${label} ${description}`).not.toMatch(/IRS|HHS|USDA|SSA|HUD|federal|state|county|city/i);
    }
    expect(Object.keys(LEVEL_CONFIG).sort()).toEqual([...US_ONLY, ...UK_ONLY, 'reform', 'household'].sort());
  });
});

describe('fillModuleNames', () => {
  const v = (name: string, moduleName: string | null = ''): Variable =>
    ({ name, moduleName } as unknown as Variable);

  it('maps a variable to the one file named after it', () => {
    const out = fillModuleNames(
      { income_tax: v('income_tax'), pip: v('pip'), kept: v('kept', 'gov.dwp.kept') },
      ['gov/hmrc/income_tax/income_tax.py', 'gov/dwp/pip/pip.py', 'gov/dwp/other/kept.py'],
    );
    expect(out.income_tax.moduleName).toBe('gov.hmrc.income_tax.income_tax');
    expect(out.pip.moduleName).toBe('gov.dwp.pip.pip');
    expect(out.kept.moduleName).toBe('gov.dwp.kept');
  });

  it('leaves ambiguous and unmatched names without a module', () => {
    const out = fillModuleNames(
      { rent: v('rent'), missing: v('missing') },
      ['input/rent.py', 'household/consumption/rent.py'],
    );
    expect(out.rent.moduleName).toBe('');
    expect(out.missing.moduleName).toBe('');
  });

  it('never invents a module that is not a file in the tree', () => {
    const name = fc.stringMatching(/^[a-z][a-z_]{0,10}$/);
    fc.assert(fc.property(fc.uniqueArray(name, { maxLength: 8 }), fc.array(name, { maxLength: 8 }), (vars, files) => {
      const paths = files.map((f, i) => `gov/d${i % 3}/${f}.py`);
      const out = fillModuleNames(Object.fromEntries(vars.map((n) => [n, v(n)])), paths);
      for (const [n, variable] of Object.entries(out)) {
        if (!variable.moduleName) continue;
        expect(paths).toContain(`${variable.moduleName.replace(/\./g, '/')}.py`);
        expect(variable.moduleName.endsWith(`.${n}`)).toBe(true);
      }
    }));
  });
});

describe('UK coverage links', () => {
  it('links only to parameter folders and variable files that the pinned snapshot has', async () => {
    const segment = fc.stringMatching(/^[a-z][a-z_]{0,8}$/);
    fc.assert(fc.property(
      fc.array(fc.array(segment, { minLength: 1, maxLength: 4 }), { maxLength: 6 }),
      fc.array(segment, { minLength: 1, maxLength: 4 }),
      segment,
      (paramDirs, prefixParts, variable) => {
        const parameterPaths = new Set(paramDirs.map((d) => `${d.join('/')}.yaml`));
        const variablePaths = new Map<string, string | null>([[variable, `gov/x/${variable}.py`]]);
        const prefix = prefixParts.join('.');
        const links = verifiedLinks(
          { id: 'p', name: 'P', fullName: 'P', status: 'complete', variable, githubLinks: {} },
          prefix, { parameterPaths, variablePaths }, 'abc123',
        );
        const dir = prefixParts.join('/');
        const exists = parameterPaths.has(`${dir}.yaml`) || [...parameterPaths].some((p) => p.startsWith(`${dir}/`));
        expect(Boolean(links.parameters)).toBe(exists);
        expect(links.source).toBe(`https://github.com/PolicyEngine/policyengine-uk/blob/abc123/policyengine_uk/variables/gov/x/${variable}.py`);
        if (links.parameters) expect(links.parameters).toContain('/abc123/policyengine_uk/parameters/');
      },
    ));
  });

  it('gives no links before the snapshot trees load, and none for ambiguous variable names', async () => {
    const program = { id: 'p', name: 'P', fullName: 'P', status: 'complete' as const, variable: 'rent', githubLinks: {} };
    expect(verifiedLinks(program, 'gov.dwp', null, 'main')).toEqual({});
    expect(verifiedLinks(program, undefined, { parameterPaths: new Set(), variablePaths: new Map([['rent', null]]) }, 'main')).toEqual({});
  });
});
