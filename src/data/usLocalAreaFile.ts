// Microcosm's US local-area file: the dataset policyengine.py's US region
// registry gives state and congressional district analyses, which select a
// region's households by their state_fips or congressional_district_geoid
// column (policyengine.py, src/policyengine/countries/us/regions.py).
//
// The figures come from the files published with the release that the
// policyengine.py bundle names for those regions:
// - calibration_diagnostics.json: per-target fit, Kish effective sample size,
//   the calibration options;
// - the gate summary: household and weight counts by record source
//   (spine_composition), person rows, and the reviewed limitations.
// The build mechanisms follow PolicyEngine/microcosm at the building commit,
// 766b7c7: tools/_legacy/build_us_acs_multispine_base.py, which loads the ACS
// records and fills their missing inputs (us_runtime/acs_transfer.py) and
// geography (us_runtime/puma_ladder.py), and tools/build_us_acs_local_release.py,
// which calibrates, gates, and packages the file.
//
// src/test/usLocalAreaFile.test.ts checks that the counts add up.

export interface LocalTargetGroup {
  /** What the targets measure, for the calibration stage's domain table. */
  variable: string;
  source: string;
  geography: 'state' | 'congressional_district';
  count: number;
  /** Targets whose weighted estimate lands within 10% of the target value. */
  withinTenPct: number;
}

export const usLocalAreaFile = {
  acsSurvey: '2024 American Community Survey (1-year)',
  /** Household records from the 2024 ACS 1-year public use microdata. */
  acsHouseholds: 1_529_668,
  acsHouseholdsRounded: '1.53 million',
  /** The national file's households, which join the ACS records. */
  nationalHouseholds: 57_240,
  households: 1_586_908,
  people: 3_587_263,
  /** Share of total household weight on each set of records, after calibration. */
  acsWeightShare: 0.3156854425971185,
  nationalWeightShare: 0.6843145574028815,
  /** Kish effective sample size of the calibrated household weights. */
  effectiveSampleSize: 12_123.567116852142,
  /** Hard per-record bound on calibrated weight over starting weight. */
  maxWeightRatio: 5,
  /** Pass-or-fail gates in the release's gate summary, all passed. Four more
   *  gates record evidence only: cd_holdout, weight_origin, spine_composition,
   *  and spine_ssi_qa. */
  passFailGates: 8,
  targetGroups: [
    {
      variable: 'Returns, income, deductions, and credits by state, some by AGI band (tax year 2022)',
      source: 'IRS SOI Historic Table 2',
      geography: 'state',
      count: 4_125,
      withinTenPct: 3_951,
    },
    {
      variable: 'SNAP households and benefits by state (fiscal year 2024)',
      source: 'USDA FNS',
      geography: 'state',
      count: 102,
      withinTenPct: 102,
    },
    {
      variable: 'Medicaid enrollment by state (late 2024)',
      source: 'CMS',
      geography: 'state',
      count: 51,
      withinTenPct: 51,
    },
    {
      variable: 'Population by state (2020 Census)',
      source: 'Census Bureau',
      geography: 'state',
      count: 51,
      withinTenPct: 51,
    },
    {
      variable: 'Population by congressional district (2020 Census, 119th Congress boundaries)',
      source: 'Census Bureau',
      geography: 'congressional_district',
      count: 436,
      withinTenPct: 423,
    },
  ] as LocalTargetGroup[],
};

const sum = (groups: LocalTargetGroup[], key: 'count' | 'withinTenPct') =>
  groups.reduce((total, group) => total + group[key], 0);

const stateGroups = usLocalAreaFile.targetGroups.filter(g => g.geography === 'state');
const districtGroups = usLocalAreaFile.targetGroups.filter(g => g.geography === 'congressional_district');

export const usLocalAreaTargets = {
  total: sum(usLocalAreaFile.targetGroups, 'count'),
  state: sum(stateGroups, 'count'),
  district: sum(districtGroups, 'count'),
  withinTenPct: sum(usLocalAreaFile.targetGroups, 'withinTenPct'),
  stateWithinTenPct: sum(stateGroups, 'withinTenPct'),
  districtWithinTenPct: sum(districtGroups, 'withinTenPct'),
};
