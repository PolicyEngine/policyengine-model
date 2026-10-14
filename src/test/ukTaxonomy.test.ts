import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  getLevel, getSubGroup, getSubGroupLabel, levelsFor, levelConfig, LEVEL_CONFIG, type Level,
} from '../components/shared/categoryUtils';
import { fillModuleNames } from '../data/fetchMetadata';
import type { Variable } from '../types/Variable';

const US_ONLY: Level[] = ['federal', 'state', 'local', 'territory'];
const UK_ONLY: Level[] = ['uk_government', 'devolved', 'local_authority', 'assumptions'];

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
    ['gov.contrib.policyengine.disable_simulated_benefits', 'reform', 'policyengine', 'Policyengine'],
    ['household.income.employment_income', 'household', 'income', 'Income'],
    ['input.vehicle.num_vehicles', 'household', 'vehicle', 'Vehicles'],
    ['input.rent', 'household', 'input', 'Other inputs'],
  ])('%s is %s / %s', (path, level, group, label) => {
    expect(getLevel(path, 'uk')).toBe(level);
    expect(getSubGroup(path, 'uk')).toBe(group);
    expect(getSubGroupLabel(group, level as Level, 'uk')).toBe(label);
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
