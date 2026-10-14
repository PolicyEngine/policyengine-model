import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import {
  capitalGainsParameters,
  labourSupplyParameters,
  obrElasticities,
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
    expect(text).not.toMatch(/CBO|\blabor\b|behavioral|taxable income|decile|\$/);
    expect(text).toContain('statically by default');
    for (const row of [...labourSupplyParameters, ...capitalGainsParameters]) expect(text).toContain(row.path);
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

  it('matches the OBR-method elasticities in dynamics/progression.py', () => {
    const code = read('dynamics/progression.py');
    const body = (name: string) => {
      const start = code.indexOf(`def ${name}`);
      return code.slice(start, code.indexOf('return elasticities', start));
    };
    // Non-zero literals assigned in each function, as a sorted multiset.
    const literals = (text: string) =>
      [...text.matchAll(/(?<![\w.%])-?\d+\.\d+(?![\w.%])/g)].map((m) => Number(m[0])).filter((x) => x !== 0).sort((a, b) => a - b);
    const shown = (key: 'substitution' | 'income') =>
      obrElasticities.map((r) => r[key]).filter((x) => x !== 0).sort((a, b) => a - b);
    expect(literals(body('calculate_labour_substitution_elasticities'))).toEqual(shown('substitution'));
    expect(literals(body('calculate_labour_net_income_elasticities'))).toEqual(shown('income'));
  });
});
