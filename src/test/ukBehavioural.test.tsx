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
    const covered = new Set<Cell>();
    for (const row of obrElasticities) {
      for (const c of row.covers) {
        const cells = grid.filter(
          (g) =>
            g.gender === c.gender &&
            g.married === c.married &&
            (c.youngest === 'none' ? g.youngest === null : g.youngest !== null && g.youngest >= c.youngest[0] && g.youngest <= c.youngest[1]),
        );
        expect(cells.length).toBeGreaterThan(0);
        for (const g of cells) {
          expect([row.group, row.youngestChild, g.substitution, g.income]).toEqual([row.group, row.youngestChild, row.substitution, row.income]);
          covered.add(g);
        }
      }
    }
    // Every family type the module distinguishes appears on the page exactly once.
    expect(covered.size).toBe(grid.length);
    expect(obrElasticities.flatMap((r) => r.covers).length).toBe(new Set(obrElasticities.flatMap((r) => r.covers.map((c) => JSON.stringify(c)))).size);
  });

  it('describes the pay channels as policyengine-uk computes them', () => {
    const employer = read('variables/contrib/policyengine/employer_ni/employer_ni_fixed_employer_cost_change.py');
    expect(employer).toMatch(/if employee_incidence == 0:\s*\n\s*return 0/);
    expect(employer).toMatch(/c_b = ni_class_1_income \+ baseline_employer_ni/); // the employer's baseline cost
    expect(employer).toMatch(/new_ni_class_1_income = \(c_b \+ r_r \* \(pen_con_subtracted_r \+ t_r\)\) \/ \(1 \+ r_r\)/); // above-threshold algebra
    expect(employer).toMatch(/below_threshold = previous_employment_income < t_b/); // the baseline threshold
    const haircut = read('variables/gov/hmrc/national_insurance/salary_sacrifice_broad_base_haircut.py');
    expect(haircut).toMatch(/return -employment_income \* haircut_rate/);
    expect(haircut).toMatch(/if np\.isinf\(cap\):\s*\n\s*return 0/);
    const returned = read('variables/gov/hmrc/pensions/salary_sacrifice_returned_to_income.py');
    expect(returned).toMatch(/excess = max_\(intended_ss - cap, 0\)/);
  });
});
