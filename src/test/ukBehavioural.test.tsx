import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import {
  capitalGainsParameters,
  labourSupplyParameters,
  obrElasticities,
  payParameters,
  type ElasticityCase,
} from '../data/ukBehaviouralResponses';

vi.mock('next/navigation', () => ({
  usePathname: () => '/uk/model/behavioral',
  useSearchParams: () => new URLSearchParams(),
}));

import BehavioralPage from '../views/BehavioralPage';

describe('UK behavioural responses page', () => {
  it('shows PolicyEngine UK’s own responses, not the CBO’s US presets', () => {
    const { container } = render(<BehavioralPage country="uk" />);
    const text = container.textContent ?? '';
    expect(container.querySelector('h1')).toHaveTextContent('Behavioural responses');
    // Parameter paths are identifiers, some spelled the US way; the prose is not.
    const prose = [...payParameters, ...labourSupplyParameters, ...capitalGainsParameters].reduce(
      (t, row) => t.split(row.path).join(''),
      text,
    );
    expect(prose).not.toMatch(/CBO|\blabor\b|behavioral|taxable income|decile|\$/);
    expect(text).not.toMatch(/statically by default|without feeding it back|full-time students/);
    expect(text).toContain('off by default');
    expect(text).toContain('writes the change in earnings into the reform simulation');
    for (const row of [...payParameters, ...labourSupplyParameters, ...capitalGainsParameters]) expect(text).toContain(row.path);
    // Each elasticity row renders its group and age band in one table row.
    const rendered = [...container.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));
    for (const row of obrElasticities) {
      expect(rendered.some((cells) => cells[0] === row.group && cells[1] === row.youngestChild)).toBe(true);
    }
    const link = container.querySelector('a[href*="NICS-Cut-Impact-on-Labour-Supply"]');
    expect(link).not.toBeNull();
  });

  it('keeps the US page on the CBO presets', () => {
    const { container } = render(<BehavioralPage country="us" />);
    expect(container.textContent).toContain('CBO preset elasticity parameters');
  });

  it('gives every group a substitution elasticity of at least zero and an income elasticity of at most zero', () => {
    for (const row of obrElasticities) {
      expect(row.substitution).toBeGreaterThanOrEqual(0);
      expect(row.income).toBeLessThanOrEqual(0);
    }
  });
});


type Case = { gender: string; married: boolean; youngest: number | null };
const AGES = Array.from({ length: 18 }, (_, i) => i);

/** Expand row.covers into one case per youngest-child age. */
function expandCovers(covers: ElasticityCase[]): Case[] {
  return covers.flatMap((c) =>
    c.youngest === 'none'
      ? [{ gender: c.gender, married: c.married, youngest: null }]
      : AGES.filter((a) => a >= (c.youngest as [number, number])[0] && a <= (c.youngest as [number, number])[1]).map((a) => ({
          gender: c.gender,
          married: c.married,
          youngest: a,
        })),
  );
}

/** The cases a row's displayed labels describe, from a fixed vocabulary. */
function casesFromLabels(group: string, youngestChild: string): Case[] {
  const ages = (label: string): (number | null)[] => {
    if (label === 'No children') return [null];
    const m = label.match(/^(\d+)–(\d+)$/);
    if (!m) throw new Error(`unknown youngest-child label: ${label}`);
    return AGES.filter((a) => a >= Number(m[1]) && a <= Number(m[2]));
  };
  const make = (gender: string, married: boolean, youngest: (number | null)[]) => youngest.map((y) => ({ gender, married, youngest: y }));
  switch (group) {
    case 'Married women':
      return make('FEMALE', true, ages(youngestChild));
    case 'Unmarried women with children':
      return make('FEMALE', false, ages(youngestChild).filter((a) => a !== null));
    case 'Unmarried women without children':
      if (youngestChild !== '–') throw new Error('unexpected age band');
      return make('FEMALE', false, [null]);
    case 'Men, except unmarried men with children':
      if (youngestChild !== '–') throw new Error('unexpected age band');
      return [...make('MALE', true, [null, ...AGES]), ...make('MALE', false, [null])];
    case 'Unmarried men with children':
      if (youngestChild !== '–') throw new Error('unexpected age band');
      return make('MALE', false, AGES);
    default:
      throw new Error(`unknown group label: ${group}`);
  }
}

/**
 * Differential check against the policyengine-uk source the page describes:
 * UK_MODEL_SOURCE=/path/to/policyengine-uk (checked out at UK_MODEL_VERSION).
 */
const source = process.env.UK_MODEL_SOURCE;

describe.skipIf(!source)('UK behavioural values match policyengine-uk', () => {
  const read = (path: string) => readFileSync(join(source!, 'policyengine_uk', path), 'utf8');
  const yamlValue = (path: string) => {
    const match = read(path).match(/values:\s*\n\s*[\d-]+:\s*([^\s#]+)/);
    return match?.[1];
  };

  it('matches the parameter defaults', () => {
    const files: Record<string, string> = {
      'gov.simulation.labour_supply_responses.income_elasticity': 'parameters/gov/simulation/labour_supply_responses/income_elasticity.yaml',
      'gov.simulation.labour_supply_responses.substitution_elasticity': 'parameters/gov/simulation/labour_supply_responses/substitution_elasticity.yaml',
      'gov.simulation.labour_supply_responses.bounds.income_change': 'parameters/gov/simulation/labour_supply_responses/bounds/income_change.yaml',
      'gov.simulation.labour_supply_responses.bounds.effective_wage_rate_change': 'parameters/gov/simulation/labour_supply_responses/bounds/effective_wage_rate_change.yaml',
      'gov.simulation.capital_gains_responses.elasticity': 'parameters/gov/simulation/capital_gains_responses/elasticity.yaml',
      'gov.simulation.capital_gains_responses.separate_badr_elasticity': 'parameters/gov/simulation/capital_gains_responses/separate_badr_elasticity.yaml',
      'gov.simulation.capital_gains_responses.badr_elasticity': 'parameters/gov/simulation/capital_gains_responses/badr_elasticity.yaml',
      'gov.simulation.capital_gains_responses.mtr_elasticity': 'parameters/gov/simulation/capital_gains_responses/mtr_elasticity.yaml',
    };
    for (const row of [...labourSupplyParameters, ...capitalGainsParameters]) {
      expect(existsSync(join(source!, 'policyengine_uk', files[row.path]))).toBe(true);
      const raw = yamlValue(files[row.path]);
      const shown = row.value.split(' ')[0];
      expect(raw === 'false' ? 'Off' : raw === 'true' ? 'On' : raw).toBe(shown);
    }
  });

  it('matches the defaults behind pay changes under employer NI and salary sacrifice reforms', () => {
    const values = (path: string) => [...read(path).matchAll(/^\s+([\d-]+):\s*([^\s#]+)/gm)].map((m) => [m[1], m[2]]);
    expect(values('parameters/gov/contrib/policyengine/employer_ni/employee_incidence.yaml')).toEqual([['2010-01-01', '1']]);
    expect(values('parameters/gov/contrib/behavioral_responses/salary_sacrifice_broad_base_haircut_rate.yaml')).toEqual([
      ['2010-01-01', '0.0016'],
    ]);
    expect(values('parameters/gov/hmrc/national_insurance/salary_sacrifice_pension_cap.yaml')).toEqual([
      ['2010-01-01', '.inf'],
      ['2029-04-06', '2000'],
    ]);
    const shown = Object.fromEntries(payParameters.map((r) => [r.path, r.value]));
    expect(shown['gov.contrib.policyengine.employer_ni.employee_incidence']).toMatch(/^1 /);
    expect(shown['gov.contrib.behavioral_responses.salary_sacrifice_broad_base_haircut_rate']).toMatch(/^0\.0016 /);
    expect(shown['gov.hmrc.national_insurance.salary_sacrifice_pension_cap']).toMatch(/until 5 April 2029, then £2,000/);
    const income = read('variables/input/employment_income.py');
    for (const v of ['employer_ni_fixed_employer_cost_change', 'salary_sacrifice_returned_to_income', 'salary_sacrifice_broad_base_haircut']) {
      expect(income).toContain(`"${v}"`);
    }
  });

  it('matches the OBR-method elasticities policyengine-uk assigns to every family type', () => {
    // scripts/uk_obr_elasticity_grid.py runs dynamics/progression.py's own
    // functions on made-up people of every gender, marital status and youngest
    // child age.
    type Cell = { gender: string; married: boolean; youngest: number | null; substitution: number; income: number };
    const grid: Cell[] = JSON.parse(
      execFileSync('uv', ['run', '--no-project', '--with', 'numpy', '--with', 'pandas', 'python', '-I', 'scripts/uk_obr_elasticity_grid.py', source!], {
        encoding: 'utf8',
      }),
    );
    const key = (g: Pick<Cell, 'gender' | 'married' | 'youngest'>) => `${g.gender}|${g.married}|${g.youngest}`;
    const byKey = new Map(grid.map((g) => [key(g), g]));
    const seen = new Map<string, number>();
    for (const row of obrElasticities) {
      // Cells from the row's displayed labels, read independently of row.covers.
      const cells = casesFromLabels(row.group, row.youngestChild);
      expect(new Set(cells.map(key))).toEqual(new Set(expandCovers(row.covers).map(key)));
      for (const cell of cells) {
        const g = byKey.get(key(cell));
        expect(g, key(cell)).toBeDefined();
        expect([row.group, row.youngestChild, g!.substitution, g!.income]).toEqual([row.group, row.youngestChild, row.substitution, row.income]);
        seen.set(key(cell), (seen.get(key(cell)) ?? 0) + 1);
      }
    }
    // Every family type the module distinguishes appears on the page exactly once.
    for (const g of grid) expect([key(g), seen.get(key(g))]).toEqual([key(g), 1]);
  });

  it('describes the pay channels as policyengine-uk computes them', () => {
    // scripts/uk_pay_channel_cases.py runs the three variables' own formulas.
    type Case = { kind: string; label: string; pay?: number; sacrificed?: number; change: number; baselineCost?: number; reformCost?: number };
    const cases: Case[] = JSON.parse(
      execFileSync('uv', ['run', '--no-project', '--with', 'numpy', 'python', '-I', 'scripts/uk_pay_channel_cases.py', source!], { encoding: 'utf8' }),
    );
    const get = (kind: string, label: string) => cases.find((c) => c.kind === kind && c.label === label)!;
    // "a formula meant to keep what each employer pays … the same … passes the whole change through to pay"
    const passed = get('employer_ni', 'rate rise, pay above both thresholds');
    expect(passed.change).toBeLessThan(0);
    expect(passed.reformCost!).toBeCloseTo(passed.baselineCost!, 6);
    expect(get('employer_ni', 'rate rise, incidence 0').change).toBe(0);
    expect(get('employer_ni', 'no change').change).toBe(0);
    // "Pay below the baseline employer threshold stays as it was."
    expect(get('employer_ni', 'rate rise, pay below the baseline threshold').change).toBe(0);
    // "a reform that lifts the threshold past someone's pay can raise what their employer pays"
    const lifted = get('employer_ni', 'threshold lifted past pay');
    expect(lifted.reformCost!).toBeGreaterThan(lifted.baselineCost!);
    // "A separate haircut takes 0.16% off every worker's employment income" while the cap applies.
    expect(get('haircut', 'cap off').change).toBe(0);
    expect(get('haircut', 'cap £2,000').change).toBeCloseTo(-0.0016 * get('haircut', 'cap £2,000').pay!, 6);
    // "contributions above the cap return to pay"
    expect(get('returned', 'cap off').change).toBe(0);
    expect(get('returned', 'cap £2,000, below it').change).toBe(0);
    expect(get('returned', 'cap £2,000, above it').change).toBe(get('returned', 'cap £2,000, above it').sacrificed! - 2000);
  });
});
