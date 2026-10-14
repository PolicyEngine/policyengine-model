/**
 * PolicyEngine UK's behavioural responses, as policyengine-uk 2.126.12 (the
 * version policyengine.py 6.3.4 pins) defines them. Values mirror:
 * - parameters/gov/simulation/labour_supply_responses/*.yaml
 * - parameters/gov/simulation/capital_gains_responses/*.yaml
 * - dynamics/progression.py: calculate_labour_substitution_elasticities and
 *   calculate_labour_net_income_elasticities
 * src/test/ukBehavioural.test.ts compares them with that source when
 * UK_MODEL_SOURCE points at a policyengine-uk checkout.
 */

export const UK_MODEL_VERSION = '2.126.12';

const REPO = 'https://github.com/PolicyEngine/policyengine-uk';
export const ukSourceLinks = {
  parameters: `${REPO}/tree/${UK_MODEL_VERSION}/policyengine_uk/parameters/gov/simulation`,
  dynamics: `${REPO}/blob/${UK_MODEL_VERSION}/policyengine_uk/dynamics/progression.py`,
  obrNote: 'https://obr.uk/docs/dlm_uploads/NICS-Cut-Impact-on-Labour-Supply-Note.pdf',
  obrCgt: 'https://obr.uk/docs/dlm_uploads/CGT-supplementary-release-Jan-2025.pdf',
};

export interface ParameterRow {
  path: string;
  label: string;
  value: string;
}

/** Simulation parameters: elasticities applied inside a reform simulation. */
export const labourSupplyParameters: ParameterRow[] = [
  { path: 'gov.simulation.labour_supply_responses.income_elasticity', label: 'Income elasticity', value: '0' },
  { path: 'gov.simulation.labour_supply_responses.substitution_elasticity', label: 'Substitution elasticity', value: '0' },
  { path: 'gov.simulation.labour_supply_responses.bounds.income_change', label: 'Cap on the relative change in net income', value: '1 (100%)' },
  { path: 'gov.simulation.labour_supply_responses.bounds.effective_wage_rate_change', label: 'Cap on the relative change in the marginal wage', value: '1 (100%)' },
];

export const capitalGainsParameters: ParameterRow[] = [
  { path: 'gov.simulation.capital_gains_responses.elasticity', label: 'Retention-rate elasticity of realisations', value: '0' },
  { path: 'gov.simulation.capital_gains_responses.separate_badr_elasticity', label: 'Separate elasticity for Business Asset Disposal Relief gains', value: 'Off' },
  { path: 'gov.simulation.capital_gains_responses.badr_elasticity', label: 'Elasticity for those gains, when on', value: '1.4' },
  { path: 'gov.simulation.capital_gains_responses.mtr_elasticity', label: 'Tax-rate elasticity (alternative convention)', value: '0' },
];

export interface ElasticityRow {
  group: string;
  youngestChild: string;
  substitution: number;
  income: number;
}

/**
 * The OBR-method module's elasticities by group. "Married" is the model's
 * is_married: married or in a civil partnership. Children are benefit-unit
 * members under 18. Unmarried men with children get no elasticity.
 */
export const obrElasticities: ElasticityRow[] = [
  { group: 'Married women', youngestChild: 'No children', substitution: 0.14, income: 0 },
  { group: 'Married women', youngestChild: '0–2', substitution: 0.301, income: -0.185 },
  { group: 'Married women', youngestChild: '3–4', substitution: 0.439, income: -0.173 },
  { group: 'Married women', youngestChild: '5–10', substitution: 0.173, income: -0.102 },
  { group: 'Married women', youngestChild: '11–17', substitution: 0.16, income: -0.063 },
  { group: 'Unmarried women with children', youngestChild: '0–4', substitution: 0.094, income: -0.037 },
  { group: 'Unmarried women with children', youngestChild: '5–10', substitution: 0.128, income: -0.075 },
  { group: 'Unmarried women with children', youngestChild: '11–17', substitution: 0.136, income: -0.054 },
  { group: 'Unmarried women without children', youngestChild: '–', substitution: 0.15, income: -0.05 },
  { group: 'Men, except unmarried men with children', youngestChild: '–', substitution: 0.15, income: -0.05 },
  { group: 'Unmarried men with children', youngestChild: '–', substitution: 0, income: 0 },
];
