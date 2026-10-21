/**
 * PolicyEngine UK's behavioural responses, as policyengine-uk 2.130.1 (the
 * version policyengine.py 6.9.0 pins) defines them. Values mirror:
 * - parameters/gov/simulation/labour_supply_responses/*.yaml
 * - parameters/gov/simulation/capital_gains_responses/*.yaml
 * - parameters/gov/contrib/policyengine/employer_ni/employee_incidence.yaml,
 *   parameters/gov/hmrc/national_insurance/salary_sacrifice_pension_cap.yaml and
 *   parameters/gov/contrib/behavioral_responses/salary_sacrifice_broad_base_haircut_rate.yaml
 * - dynamics/progression.py: calculate_labour_substitution_elasticities and
 *   calculate_labour_net_income_elasticities
 * src/test/ukBehavioural.test.ts compares them with that source when
 * UK_MODEL_SOURCE points at a policyengine-uk checkout.
 */

export const UK_MODEL_VERSION = '2.130.1';

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

/**
 * Pay that changes under particular reforms by default: employment_income adds
 * employer_ni_fixed_employer_cost_change, salary_sacrifice_returned_to_income
 * and salary_sacrifice_broad_base_haircut.
 */
export const payParameters: ParameterRow[] = [
  { path: 'gov.contrib.policyengine.employer_ni.employee_incidence', label: 'Share of a change in employer National Insurance passed to pay', value: '1 (100%)' },
  { path: 'gov.hmrc.national_insurance.salary_sacrifice_pension_cap', label: 'Cap on salary-sacrificed pension contributions free of National Insurance', value: 'None until 5 April 2029, then £2,000' },
  { path: 'gov.contrib.behavioral_responses.salary_sacrifice_broad_base_haircut_rate', label: 'Haircut on every worker’s employment income while that cap applies', value: '0.0016 (0.16%)' },
];

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

/** Who a row covers: gender, marital status, and the youngest child's age (none, or an inclusive range). */
export interface ElasticityCase {
  gender: 'FEMALE' | 'MALE';
  married: boolean;
  youngest: 'none' | [number, number];
}

export interface ElasticityRow {
  group: string;
  youngestChild: string;
  substitution: number;
  income: number;
  covers: ElasticityCase[];
}

/**
 * The OBR-method module's elasticities by group. "Married" is the model's
 * is_married: married or in a civil partnership, from the survey, and every
 * couple when no input says otherwise. Children are benefit-unit members
 * under 18. Unmarried men with children get no elasticity.
 */
const W = (married: boolean, youngest: ElasticityCase['youngest']): ElasticityCase => ({ gender: 'FEMALE', married, youngest });
const M = (married: boolean, youngest: ElasticityCase['youngest']): ElasticityCase => ({ gender: 'MALE', married, youngest });
const ANY_CHILD: [number, number] = [0, 17];

export const obrElasticities: ElasticityRow[] = [
  { group: 'Married women', youngestChild: 'No children', substitution: 0.14, income: 0, covers: [W(true, 'none')] },
  { group: 'Married women', youngestChild: '0–2', substitution: 0.301, income: -0.185, covers: [W(true, [0, 2])] },
  { group: 'Married women', youngestChild: '3–4', substitution: 0.439, income: -0.173, covers: [W(true, [3, 4])] },
  { group: 'Married women', youngestChild: '5–10', substitution: 0.173, income: -0.102, covers: [W(true, [5, 10])] },
  { group: 'Married women', youngestChild: '11–17', substitution: 0.16, income: -0.063, covers: [W(true, [11, 17])] },
  { group: 'Unmarried women with children', youngestChild: '0–4', substitution: 0.094, income: -0.037, covers: [W(false, [0, 4])] },
  { group: 'Unmarried women with children', youngestChild: '5–10', substitution: 0.128, income: -0.075, covers: [W(false, [5, 10])] },
  { group: 'Unmarried women with children', youngestChild: '11–17', substitution: 0.136, income: -0.054, covers: [W(false, [11, 17])] },
  { group: 'Unmarried women without children', youngestChild: '–', substitution: 0.15, income: -0.05, covers: [W(false, 'none')] },
  {
    group: 'Men, except unmarried men with children',
    youngestChild: '–',
    substitution: 0.15,
    income: -0.05,
    covers: [M(true, 'none'), M(true, ANY_CHILD), M(false, 'none')],
  },
  { group: 'Unmarried men with children', youngestChild: '–', substitution: 0, income: 0, covers: [M(false, ANY_CHILD)] },
];
