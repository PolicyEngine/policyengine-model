import {
  describeLevels,
  formatPercent,
  targetCountsByFamily,
  usCalibration,
} from './calibrationTargets';

export interface ImputationVariable {
  name: string;
  source: string;
  method: string;
}

export interface CalibrationTarget {
  variable: string;
  target: string;
  source: string;
}

export interface PipelineStage {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  inputSize?: string;
  outputSize?: string;
  details: string[];
  imputations?: ImputationVariable[];
  calibrationTargets?: CalibrationTarget[];
  dataSources?: string[];
  /** 'shared' = linear portion, 'national' or 'local' = branched, 'local-sub-N' = rows below local */
  branch: 'shared' | 'national' | 'local' | 'local-sub-1' | 'local-sub-2' | 'local-sub-3' | 'local-sub-4';
  /** True if this is a final output dataset */
  isFinalDataset?: boolean;
  /** Optional legacy note shown as a banner on the stage detail */
  legacyNote?: string;
  /** If true, stage is planned but not yet implemented */
  comingSoon?: boolean;
  /** Optional link to another page, rendered as a button */
  link?: { label: string; path: string };
}

const cal = usCalibration;
const levels = cal.levelCounts;
const n = (x: number) => x.toLocaleString();

// What each source family's targets measure, for the calibration stage's
// domain table. Counts come from the release diagnostics (see
// calibrationTargets.json); only the descriptions are written here.
const FAMILY_DOMAINS: Record<string, { variable: string; source: string }> = {
  irs_soi: {
    variable: 'Income, deductions, credits, and return counts: national tables and state totals, some by AGI band',
    source: 'IRS SOI',
  },
  census_pep: { variable: 'Population by five-year age group, national and by state', source: 'Census population estimates' },
  cms_medicaid: { variable: 'Medicaid and CHIP enrollment, national and by state', source: 'CMS' },
  ssa: { variable: 'Social Security benefits; SSI recipients and payments', source: 'SSA' },
  usda_snap: { variable: 'SNAP households and benefits, national and by state', source: 'USDA FNS' },
  cms_aca: { variable: 'Marketplace enrollment and APTC recipients by state', source: 'CMS' },
  census_stc: { variable: 'State individual income tax collections', source: 'Census state tax collections' },
  hhs_acf_tanf: { variable: 'TANF basic assistance spending, national and by state', source: 'HHS/ACF' },
  jct: { variable: 'Federal tax expenditures', source: 'JCT' },
  cbo: { variable: 'Projected income by source', source: 'CBO' },
  bea: { variable: 'Wages and salaries; proprietors’ income', source: 'BEA NIPA' },
  federal_reserve: { variable: 'Household and nonprofit net worth', source: 'Federal Reserve Z.1' },
  cms_medicare: { variable: 'Medicare Part B premiums from enrollees', source: 'CMS Medicare Trustees Report' },
  hhs_acf_liheap: { variable: 'LIHEAP households served', source: 'HHS/ACF' },
  policyengine_build: { variable: 'Keogh distributions, held at their pre-calibration total', source: 'Build-internal' },
};

const calibrationDomains: CalibrationTarget[] = targetCountsByFamily(cal).map(([family, count]) => ({
  variable: FAMILY_DOMAINS[family]?.variable ?? family,
  target: `${n(count)} target${count === 1 ? '' : 's'}`,
  source: FAMILY_DOMAINS[family]?.source ?? family,
}));

// US pipeline: the Microcosm build of the one national file
// (populace_us_2024.h5 on huggingface.co/datasets/policyengine/populace-us).
// Target counts and fit come from calibrationTargets.json. Other figures come
// from the default release's manifests (source_enrichment.json and the
// parent build's build_manifest.json) and the released file itself; the
// mechanism descriptions follow the build code at the calibrating commit
// (PolicyEngine/microcosm cae8640).
export const pipelineStages: PipelineStage[] = [
  {
    id: 'asec-pool',
    branch: 'shared',
    title: 'CPS ASEC pool',
    subtitle: 'Base microdata',
    description: 'The Current Population Survey Annual Social and Economic Supplement (CPS ASEC) provides the base microdata. Three survey files — March 2023, 2024, and 2025, covering income years 2022 through 2024 — are pooled, each at one third of the weighted population, which widens the pool of distinct households. Before calibration the pooled weights are scaled to the Census Bureau’s 2024 population estimate.',
    icon: 'chart-bar',
    dataSources: ['Census Bureau CPS ASEC (three pooled years)'],
    details: [
      'Person, household, family, marital unit, tax unit, and SPM unit tables matching the PolicyEngine US entity structure',
      'Each household keeps its survey state',
      'Demographics, income, employment, program receipt, and disability variables mapped to PolicyEngine names',
    ],
  },
  {
    id: 'puf-tax-detail',
    branch: 'shared',
    title: 'IRS PUF tax detail',
    subtitle: 'Tax return records',
    description: 'The IRS Public Use File for tax year 2015, uprated to 2024, supplies tax-return detail the CPS lacks: itemized deductions, business income, capital gains, and other Form 1040 items. Every ASEC household enters the pool twice. One copy keeps its survey-reported income. The other keeps the same people, demographics, and geography, but its tax-return detail is drawn from a quantile regression forest trained on the PUF, conditioned on the household’s own survey values. Each copy starts with half the household’s weight.',
    icon: 'building-bank',
    dataSources: ['IRS SOI Public Use File 2015 (uprated to 2024)'],
    details: [
      'Tax detail drawn onto the second copy: itemized deductions, partnership and S corporation income, capital gains, and other Form 1040 items',
      'Survey-only variables such as child support, childcare, and retirement distributions are then imputed onto the second copy from models trained on the ASEC',
      'The released file records each household’s channel: ‘asec’ for the survey copy and ‘puf_tax_detail’ for the copy with PUF tax detail',
    ],
  },
  {
    id: 'imputation',
    branch: 'shared',
    title: 'Survey imputations',
    subtitle: 'Variables the CPS lacks',
    description: 'Variables the CPS does not measure are imputed from other surveys and published rates. Each of the build’s 37 source stages declares its inputs, method, and outputs in a source-stage manifest. Nineteen of them use a weighted quantile regression forest, which draws each imputed value from a predicted conditional distribution rather than filling in an average.',
    icon: 'building-community',
    dataSources: ['Census ACS', 'Census SIPP', 'Fed SCF', 'CPS ORG', 'CMS', 'CDC'],
    details: [
      'Survey weights enter each forest through weighted resampling of its training rows',
      'Within a stage, variables are drawn in sequence, each conditioning on the ones drawn before it',
    ],
    imputations: [
      { name: 'Rent', source: 'Census ACS 2022', method: 'Quantile regression forest' },
      { name: 'Net worth and auto loans', source: 'Fed SCF 2022', method: 'Quantile regression forest' },
      { name: 'Bank, stock, and bond assets', source: 'Fed SCF 2022 + Census SIPP 2023', method: 'Quantile regression forests on each source; one chosen per household by seeded draw' },
      { name: 'Vehicles owned and their value', source: 'Census SIPP 2023', method: 'Random forest classifier (count) and quantile regression forest (value)' },
      { name: 'Tip income', source: 'Census SIPP 2023', method: 'Quantile regression forest' },
      { name: 'Hourly wage and paid-hourly status', source: 'CPS Outgoing Rotation Group 2024', method: 'Quantile regression forest' },
      { name: 'SSI disability criteria, Head Start enrollment, voluntary tax filing', source: 'Census SIPP 2023', method: 'Quantile regression forests' },
      { name: 'Prior-year income', source: 'CPS ASEC (adjacent pooled years)', method: 'Same person linked across survey years' },
      { name: 'Immigration status', source: 'CPS ASEC + published counts of undocumented workers and students', method: 'Survey citizenship and legal-status indicators, then ranked assignment to the published counts' },
      { name: 'ACA marketplace enrollment', source: 'CPS ASEC + CMS open-enrollment files', method: 'Reported coverage, then seeded draws matched to CMS state counts' },
      { name: 'Pregnancy', source: 'CPS ASEC + CDC natality-derived rate', method: 'Seeded draw at a national rate' },
    ],
  },
  {
    id: 'take-up',
    branch: 'shared',
    title: 'Program take-up',
    subtitle: 'Participation flags',
    description: 'Take-up is stored as data the engine reads: an eligible unit receives a benefit only if its take-up flag is set. The released file carries flags for nine programs plus WIC claiming, and each is assigned its own way. For SNAP, Medicaid, SSI, and subsidized marketplace coverage, people the CPS reports as recipients keep their flags, and other eligible units are drawn toward administrative counts.',
    icon: 'checkbox',
    dataSources: ['USDA FNS', 'CMS', 'SSA', 'HHS', 'IRS', 'Census SIPP'],
    details: [
      'SNAP, Medicaid, SSI, and ACA marketplace: reported recipients keep their flags; the rest are drawn toward USDA, CMS, and SSA figures',
      'Medicare: reported coverage in the CPS',
      'Housing assistance: reported subsidies for survey households, imputed receipt for their copies carrying PUF tax detail',
      'Head Start: a quantile regression forest trained on the SIPP',
      'TANF, the EITC, and WIC claiming: draws at published participation rates (EITC rates vary by number of children)',
      'CHIP, the Basic Health Program, Early Head Start, and the DC property tax credit have no flag in this release, so policyengine-us treats every eligible unit as taking them up',
    ],
  },
  {
    id: 'geography',
    branch: 'shared',
    title: 'Geography assignment',
    subtitle: 'State → district → block',
    description: 'Every household keeps its survey state. Within that state it is assigned a congressional district, with probability proportional to the IRS count of tax returns in each district, and then a 2020 census block within that district, in proportion to block population. Tract and county follow from the block, and place, state legislative districts, and metro area come from block-level crosswalks. The draws are seeded, so an assignment is reproducible, and a household’s copy carrying PUF tax detail shares its geography.',
    icon: 'map',
    dataSources: ['IRS SOI returns by congressional district', 'Census block-to-district equivalency file', 'Census 2020 block populations'],
    details: [
      'All 436 congressional districts (435 voting districts plus the DC delegate) are populated in the released file, with 34 to 1,068 household records each (median 114)',
      'Columns follow the PolicyEngine US input names: state_fips, congressional_district_geoid, county_fips, tract_geoid, block_geoid, place_fips, sldu, sldl, cbsa_code',
    ],
  },
  {
    id: 'selection',
    branch: 'shared',
    title: 'Support selection',
    subtitle: 'Fixed household set',
    description: 'From a candidate pool of 337,704 households, the build keeps a fixed set of 57,240. The set was chosen in an earlier build and is carried forward by matching each household’s source identifiers. This release swapped nine households for nine that have Keogh plan distributions, so that income is represented; the swap rule is recorded in the build manifest.',
    icon: 'stack-2',
    inputSize: '337,704 households',
    outputSize: `${n(cal.households)} households`,
    details: [
      'Calibration refits these households’ weights from their starting weights; it does not reuse an earlier build’s weights',
      'The selection, its parent, and the swap rule are recorded in the build manifest’s selection_source block',
    ],
  },
  {
    id: 'calibration',
    branch: 'shared',
    title: 'Calibration',
    subtitle: `Weights fit to ${n(cal.totalTargets)} targets`,
    description: `Household weights are fit by gradient descent (Adam, 6,000 epochs, on log weights) so weighted totals match ${describeLevels(levels)} published by the IRS, Census Bureau, CMS, USDA, SSA, HHS, CBO, JCT, BEA, and Federal Reserve, plus ${levels.other === 1 ? 'one build-internal constraint' : `${n(levels.other)} build-internal constraints`}. Total population is held fixed, and no household’s weight may grow beyond five times its starting value. In the default release ${formatPercent(cal.withinTenPctShare)} of the ${n(cal.totalTargets)} targets land within 10% of their target value.`,
    icon: 'scale',
    inputSize: `${n(cal.households)} households`,
    outputSize: `${n(cal.totalTargets)} targets`,
    dataSources: ['IRS SOI', 'Census Bureau', 'CMS', 'USDA FNS', 'SSA', 'HHS/ACF', 'CBO', 'JCT', 'BEA', 'Federal Reserve'],
    details: [
      'The objective averages each target’s relative error, capped at 100%; dollar-amount and count targets each get half the total weight, and larger targets get more weight by a square-root rule',
      'IRS dollar amounts published for tax year 2022 are aged to 2024 with growth factors based on CBO’s income projections; counts are used as published',
      'One target surface: a state target is a row of the same matrix that counts only that state’s households, not a separate calibration',
      'The default release calibrates national and state rows; congressional districts are a filter on the file, not calibrated rows',
      'Fit for every target is published in calibration_diagnostics.json and on the Microcosm dashboard',
    ],
    calibrationTargets: calibrationDomains,
    link: { label: 'View calibration targets', path: '/data/calibration' },
  },
  {
    id: 'release',
    branch: 'shared',
    isFinalDataset: true,
    title: 'Gates and release',
    subtitle: 'One national file',
    description: 'The build records a battery of release gates. In the build whose weights this release carries, all twelve pass-or-fail gates passed: calibration fit, target-profile coverage, population scale, input coverage against the previous US dataset, and checks that inputs such as hours worked, SNAP take-up, eligibility, pregnancy, immigration status, and health coverage vary plausibly. The release is published to Hugging Face with its manifests and diagnostics, and the policyengine Python package pins it by release id and file hash as the US default. The current default adds one person-level column to that build’s file and changes no other value or weight: each person’s role in their SPM unit, which lets 15- to 17-year-olds who head their SPM unit or family, or are the head’s spouse, count as adults, and reproduces the Census adult and child counts for every SPM unit in the file.',
    icon: 'map-pin',
    inputSize: `${n(cal.households)} households`,
    outputSize: '1 national file',
    dataSources: ['huggingface.co/datasets/policyengine/populace-us'],
    details: [
      `One national file: populace_us_2024.h5, with ${n(cal.households)} households and 166,321 people`,
      'State, congressional district, and county analyses filter the same file by its geography columns — there are no per-area datasets',
      'Published with the release: calibration_diagnostics.json, source coverage, the build manifests, and a latest.json pointer to the current release',
      `The default release is ${cal.releaseId}; its weights come unchanged from ${cal.calibrationReleaseId}`,
      'A separate local-area build, loaded by name as populace_us_2024_acs_local, has about 1.59 million household records, most from the 2024 American Community Survey, and calibrates a 2020 Census population target for each of the 436 districts',
    ],
  },
];
