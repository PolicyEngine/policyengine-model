import {
  describeLevels,
  formatPercent,
  targetCountsByFamily,
  usCalibration,
} from './calibrationTargets';
import { usLocalAreaFile, usLocalAreaTargets } from './usLocalAreaFile';

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
  /** 'shared' = linear portion, 'national' or 'local' = branched, 'local-sub-N' / 'national-sub-N' = rows below local / national */
  branch: 'shared' | 'national' | 'local' | 'local-sub-1' | 'local-sub-2' | 'local-sub-3' | 'local-sub-4' | 'national-sub-1' | 'national-sub-2' | 'national-sub-3' | 'national-sub-4';
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

const local = usLocalAreaFile;
const localTargets = usLocalAreaTargets;
const percent = (share: number) => `${Math.round(share * 100)}%`;
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const numberWord = (x: number) => NUMBER_WORDS[x] ?? n(x);

const localCalibrationDomains: CalibrationTarget[] = local.targetGroups.map(group => ({
  variable: group.variable,
  target: `${n(group.count)} target${group.count === 1 ? '' : 's'}`,
  source: group.source,
}));

// US pipeline: the Microcosm builds of the two US files that policyengine.py's
// bundle loads. The shared stages build the national file's households. The
// national branch calibrates them to national and state targets; the
// local-area branch adds ACS households and calibrates both sets of records to
// state and congressional district targets. National target counts and fit
// come from calibrationTargets.json, local-area figures from
// usLocalAreaFile.ts. Other national figures come from the national release's
// manifests (source_enrichment.json and the parent build's
// build_manifest.json) and the released file itself. The mechanism
// descriptions follow the build code at the calibrating commits:
// PolicyEngine/microcosm cae8640 for the national file and 766b7c7 for the
// local-area file.
export const pipelineStages: PipelineStage[] = [
  {
    id: 'asec-pool',
    branch: 'shared',
    title: 'CPS ASEC pool',
    subtitle: 'Base microdata',
    description: 'The Current Population Survey Annual Social and Economic Supplement (CPS ASEC) provides the base microdata. Microcosm pools three survey files — March 2023, 2024, and 2025, covering income years 2022 through 2024 — each at one third of the weighted population, which widens the pool of distinct households. After household selection, it scales the starting weights to the builder’s 334.2 million person benchmark, an approximation of Census Vintage 2023 age-band totals.',
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
    description: 'The IRS Public Use File for tax year 2015, uprated to 2024, supplies tax-return detail the CPS lacks: itemized deductions, business income, capital gains, and other Form 1040 items. Every ASEC household enters the pool twice. One copy keeps its survey-reported income. The other keeps the same people, demographics, and survey state, but a quantile regression forest trained on the PUF draws its tax-return detail, conditioning on the household’s own survey values. Each copy starts with half the household’s weight.',
    icon: 'building-bank',
    dataSources: ['IRS SOI Public Use File 2015 (uprated to 2024)'],
    details: [
      'Tax detail drawn onto the second copy: itemized deductions, partnership and S corporation income, capital gains, and other Form 1040 items',
      'Models trained on the ASEC then impute survey-only variables such as child support, childcare, and retirement distributions onto the second copy',
      'The released file records each household’s channel: ‘asec’ for the survey copy and ‘puf_tax_detail’ for the copy with PUF tax detail',
    ],
  },
  {
    id: 'imputation',
    branch: 'shared',
    title: 'Survey imputations',
    subtitle: 'Variables the CPS lacks',
    description: 'Microcosm imputes variables the CPS does not measure from other surveys and published rates. Each of the build’s 37 source stages declares its inputs, method, and outputs in a source-stage manifest. Nineteen of them use a weighted quantile regression forest, which draws each imputed value from a predicted conditional distribution rather than filling in an average.',
    icon: 'building-community',
    dataSources: ['Census ACS', 'Census SIPP', 'Fed SCF', 'CPS ORG', 'CMS', 'CDC'],
    details: [
      'Survey weights enter each forest through weighted resampling of its training rows',
      'Within a stage, the forests draw variables in sequence, each conditioning on the ones drawn before it',
    ],
    imputations: [
      { name: 'Rent', source: 'Census ACS 2022', method: 'Quantile regression forest' },
      { name: 'Net worth and auto loans', source: 'Fed SCF 2022', method: 'Quantile regression forest' },
      { name: 'Bank, stock, and bond assets', source: 'Fed SCF 2022 + Census SIPP 2023', method: 'Quantile regression forests on each source; one chosen per household by seeded draw' },
      { name: 'Vehicles owned and their value', source: 'Census SIPP 2023', method: 'Random forest classifier (count) and quantile regression forest (value)' },
      { name: 'Tip income', source: 'Census SIPP 2023', method: 'Quantile regression forest' },
      { name: 'Hourly wage and paid-hourly status', source: 'CPS Outgoing Rotation Group 2024', method: 'Quantile regression forest' },
      { name: 'SSI disability criteria, Head Start enrollment, voluntary tax filing', source: 'Census SIPP 2023', method: 'Quantile regression forests' },
      { name: 'Prior-year income', source: 'CPS ASEC (adjacent pooled years)', method: 'Same person linked across adjacent survey years where possible, with fallbacks; quantile regression forest trained on the ASEC for copies carrying PUF tax detail' },
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
    description: 'The released file stores take-up as data the engine reads: an eligible unit receives a benefit only if its take-up flag is true. The file carries flags for nine programs plus WIC claiming, and the build assigns each its own way. For SNAP, Medicaid, SSI, and subsidized marketplace coverage, people the CPS reports as recipients keep their flags, and the build draws other eligible units toward administrative counts.',
    icon: 'checkbox',
    dataSources: ['USDA FNS', 'CMS', 'SSA', 'HHS', 'IRS', 'Census SIPP'],
    details: [
      'SNAP, Medicaid, SSI, and ACA marketplace: reported recipients keep their flags; the build draws the rest toward USDA, CMS, and SSA figures',
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
    description: 'Every household keeps its survey state. Within that state the build draws a congressional district for it, with probability proportional to the IRS count of tax returns in each district, and then a 2020 census block within that district, in proportion to block population. Tract and county follow from the block, and place, state legislative districts, and metro area come from block-level crosswalks. The build seeds the draws, so an assignment is reproducible. A household’s two copies keep the same survey state but receive separate district and block draws.',
    icon: 'map',
    dataSources: ['IRS SOI returns by congressional district', 'Census block-to-district equivalency file', 'Census 2020 block populations'],
    details: [
      'The released file has household records in all 436 congressional districts (435 voting districts plus the DC delegate): 34 to 1,068 each, median 114',
      'Columns follow the PolicyEngine US input names: state_fips, congressional_district_geoid, county_fips, tract_geoid, block_geoid, place_fips, sldu, sldl, cbsa_code',
    ],
  },
  {
    id: 'selection',
    branch: 'shared',
    title: 'Support selection',
    subtitle: 'Fixed household set',
    description: 'From a candidate pool of 337,704 households, the calibrating build recovered a fixed set of 57,240 by matching each household’s source identifiers. The set comes from earlier builds, including an earlier nine-for-nine swap that brought in households with Keogh plan distributions so the set represents that income.',
    icon: 'stack-2',
    inputSize: '337,704 households',
    outputSize: `${n(cal.households)} households`,
    details: [
      'The calibrating build refit these households’ weights from their starting weights, without warm-starting from an earlier build; the current default carries those weights unchanged',
      'The build manifest’s selection_source block records the selection, its parent, and the swap rule',
    ],
  },
  {
    id: 'calibration',
    branch: 'national',
    title: 'National calibration',
    subtitle: `Weights fit to ${n(cal.totalTargets)} targets`,
    description: `Microcosm fits household weights by gradient descent (Adam, 6,000 epochs, on log weights) so weighted totals match ${describeLevels(levels)} derived from statistics published by the IRS, Census Bureau, CMS, USDA, SSA, HHS, CBO, JCT, BEA, and Federal Reserve, plus ${levels.other === 1 ? 'one build-internal constraint' : `${n(levels.other)} build-internal constraints`}. The calibration holds the sum of household weights fixed, and no household’s weight may grow beyond five times its starting value. In the national file ${formatPercent(cal.withinTenPctShare)} of the ${n(cal.totalTargets)} targets land within 10% of their target value.`,
    icon: 'scale',
    inputSize: `${n(cal.households)} households`,
    outputSize: `${n(cal.totalTargets)} targets`,
    dataSources: ['IRS SOI', 'Census Bureau', 'CMS', 'USDA FNS', 'SSA', 'HHS/ACF', 'CBO', 'JCT', 'BEA', 'Federal Reserve'],
    details: [
      'The objective averages each target’s relative error, capped at 100%; dollar-amount and count targets each get half the total weight, and larger targets get more weight by a square-root rule',
      'The build ages IRS dollar amounts published for tax year 2022 to 2024 with growth factors based on CBO’s income projections, and uses counts as published',
      'One target surface: a state target is a row of the same matrix that counts only that state’s households, not a separate calibration',
      'The national file calibrates national and state rows only; congressional district targets belong to the local-area file',
      'The release publishes the fit for every target in calibration_diagnostics.json',
    ],
    calibrationTargets: calibrationDomains,
    link: { label: 'View calibration targets', path: '/data/calibration' },
  },
  {
    id: 'release',
    branch: 'national',
    isFinalDataset: true,
    title: 'National file',
    subtitle: 'National analyses',
    description: 'The build records a battery of release gates. In the build whose weights this release carries, all twelve pass-or-fail gates passed, among them calibration fit, target-profile coverage, population scale, and checks that inputs such as hours worked, SNAP take-up, eligibility, pregnancy, immigration status, and health coverage vary plausibly. Microcosm publishes the release to Hugging Face with its manifests and diagnostics, and the policyengine Python package pins it by release id and file hash as the default US dataset, which national analyses run on. The current default adds one person-level column to that build’s file and changes no other value or weight: each person’s role in their SPM unit, which lets 15- to 17-year-olds who head their SPM unit or family, or are the head’s spouse, count as adults, and reproduces the Census adult and child counts for every SPM unit in the file.',
    icon: 'map-pin',
    inputSize: `${n(cal.households)} households`,
    outputSize: '1 national file',
    dataSources: ['Hugging Face'],
    details: [
      `${n(cal.households)} households and 166,321 people`,
      'policyengine.py runs national analyses on this file, and state and congressional district analyses on the local-area file',
      'Published with the release: calibration_diagnostics.json, source coverage, the build manifests, and a latest.json pointer to the current release',
      'The default release carries its weights unchanged from the build that fit them',
    ],
  },
  {
    id: 'acs-households',
    branch: 'local',
    title: 'ACS households',
    subtitle: `${local.acsHouseholdsRounded} survey households`,
    description: `The local-area file adds ${n(local.acsHouseholds)} households from the Census Bureau’s ${local.acsSurvey} public use microdata to the national file’s ${n(local.nationalHouseholds)}. The ACS reports where each household lives and much of what the model needs, but not every input. For each missing input, Microcosm fits weighted quantile regression forests on the national file’s households, conditioning on the variables an ACS household reports, and draws the household’s value from the predicted distribution. The transfer keeps every value the ACS reports and fills only missing inputs.`,
    icon: 'grid-dots',
    inputSize: `${n(local.acsHouseholds)} ACS households`,
    outputSize: `${n(local.households)} households`,
    dataSources: ['Census Bureau ACS 2024 1-year PUMS', 'The national file'],
    details: [
      'Microcosm fits one forest for each pattern of reported predictors, on the national-file households that report the same predictors',
      'The national file’s households enter with their own values and geography',
      `The file holds ${n(local.households)} households and ${n(local.people)} people`,
    ],
  },
  {
    id: 'acs-geography',
    branch: 'local',
    title: 'PUMA geography',
    subtitle: 'District and county',
    description: 'The ACS identifies where a household lives only by state and 2020 Public Use Microdata Area (PUMA), and a PUMA can straddle several congressional districts and counties. Each ACS household keeps its PUMA and receives a congressional district (119th Congress boundaries) and a county, each drawn within its PUMA in proportion to the 2020 census population the PUMA shares with each district or county. The build seeds the draws, so an assignment is reproducible. The national file’s households keep the district and county they carry there.',
    icon: 'map',
    dataSources: ['Census 2020 PUMA, district, and county population overlaps'],
    details: [
      'ACS households carry state, PUMA, congressional district, and county; only the national file’s households carry block, tract, place, and state legislative district columns',
      'Columns follow the PolicyEngine US input names: state_fips, congressional_district_geoid, county_fips',
    ],
  },
  {
    id: 'local-calibration',
    branch: 'local-sub-1',
    title: 'Local calibration',
    subtitle: `Weights fit to ${n(localTargets.total)} targets`,
    description: `Microcosm fits the household weights of all ${n(local.households)} records together by gradient descent (Adam) so weighted totals match ${n(localTargets.total)} targets: ${n(localTargets.state)} for states and ${n(localTargets.district)} for congressional districts. State targets come from the IRS, USDA, CMS, and the Census Bureau; each congressional district has a 2020 Census population target. The calibration holds the sum of household weights fixed, and no household’s weight may grow beyond ${numberWord(local.maxWeightRatio)} times its starting value. ${formatPercent(localTargets.withinTenPct / localTargets.total)} of the targets land within 10% of their target value: ${formatPercent(localTargets.stateWithinTenPct / localTargets.state)} of the state targets and ${n(localTargets.districtWithinTenPct)} of the ${n(localTargets.district)} district targets.`,
    icon: 'scale',
    inputSize: `${n(local.households)} households`,
    outputSize: `${n(localTargets.total)} targets`,
    dataSources: ['IRS SOI', 'USDA FNS', 'CMS', 'Census Bureau'],
    details: [
      'Each target’s loss uses the national file’s weighting rule: dollar-amount and count targets each get half the total weight',
      'District population targets use 2020 Census counts on 119th Congress boundaries',
    ],
    calibrationTargets: localCalibrationDomains,
  },
  {
    id: 'local-area-file',
    branch: 'local-sub-3',
    isFinalDataset: true,
    title: 'Local-area file',
    subtitle: 'State and district analyses',
    description: `All ${local.passFailGates} pass-or-fail gates recorded for the release passed, among them calibration fit, input coverage, the PUMA geography, a check that hours worked vary plausibly on both sets of households, and a check that the model defines every input the file stores. policyengine.py’s US region registry runs state and congressional district analyses on this file, selecting a region’s households by their state_fips or congressional_district_geoid column. The ACS households carry ${percent(local.acsWeightShare)} of the file’s total household weight and the national file’s households ${percent(local.nationalWeightShare)}. Calibration concentrates the weights: the file’s effective sample size is about ${n(Math.round(local.effectiveSampleSize / 100) * 100)} households.`,
    icon: 'map-pin',
    inputSize: `${n(local.households)} households`,
    outputSize: '1 local-area file',
    dataSources: ['Hugging Face'],
    details: [
      `${n(local.households)} households and ${n(local.people)} people: ${n(local.acsHouseholds)} from the ACS and the national file’s ${n(local.nationalHouseholds)}`,
      'Published with the release: calibration_diagnostics.json for every target, a gate summary that lists the release’s reviewed limitations, and source coverage',
    ],
  },
];
