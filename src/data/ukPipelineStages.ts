import type { PipelineStage } from './pipelineStages';
import { ukRelease as uk, ukFacts as f, fmtInt, fmtPct, fmtMillions } from './ukDataRelease';

/*
 * The UK build as policyengine-uk-data runs it for the release policyengine.py
 * pins (datasets/create_datasets.py at the release tag, with the publish run's
 * settings). Mechanisms cite that code; counts and fit come from
 * ukDataRelease.json, which scripts/extract_uk_release.py extracts from the
 * release's own files and calibration logs.
 */

const c = uk.enhanced.composition;
const g = uk.enhanced.geography;
const cal = uk.calibration;
const stacked = c.frs + c.spiCopies;
const donorBands = c.cgtBandDonors / 30;

export const ukPipelineIntro =
  `PolicyEngine UK runs on the enhanced Family Resources Survey that ${f.pin} pins: ` +
  `${f.data}, built on ${f.builtOn}. The build starts from ${f.baseHouseholds} households in the ` +
  `Family Resources Survey 2024-25, imputes wealth, spending, top incomes and capital gains from other ` +
  `surveys, places each household in Great Britain in an Output Area, and fits household weights to ` +
  `official statistics for every constituency and for the UK as a whole.`;

export const ukBranchLabels = { national: 'UK and constituencies', local: 'Local authorities' };

export const ukPipelineStages: PipelineStage[] = [
  {
    id: 'frs',
    branch: 'shared',
    title: 'Family Resources Survey',
    subtitle: 'FRS 2024-25',
    description:
      `The build starts from the Family Resources Survey 2024-25 (UK Data Service study 9563): ` +
      `${f.baseHouseholds} households and ${f.basePeople} people. It maps the survey’s answers to PolicyEngine ` +
      `UK’s inputs, keeps DWP’s grossing weights, and decides who takes up each benefit.`,
    icon: 'chart-bar',
    outputSize: `${f.baseHouseholds} households`,
    dataSources: ['DWP Family Resources Survey 2024-25'],
    details: [
      `The FRS grossing weights sum to ${fmtMillions(uk.base.weightedHouseholds)} households`,
      'Families that report Child Benefit, Pension Credit or Universal Credit claim it; the build draws other families at random, at take-up rates set in the data package',
      'A family whose adults have all reached State Pension age never claims Universal Credit',
      'The build draws Marriage Allowance, Tax-Free Childcare, free childcare entitlements and Scottish Child Payment at random, at rates set in the data package',
      'Households without a reported council tax bill get the mean reported bill for their region, band and number of adults (one or more); the build nets Scottish water and sewerage charges out',
      'The build places each family in a broad rental market area at random, in proportion to privately renting households of its size in its region',
    ],
    imputations: [
      { name: 'Council tax (unreported bills)', source: 'FRS 2024-25 reported bills', method: 'Mean by region, band and single-adult household' },
      { name: 'Benefit take-up', source: 'Reported receipt and data package take-up rates', method: 'Reporters claim; others drawn at random' },
      { name: 'Broad rental market area', source: 'Privately renting households by area', method: 'Seeded random draw' },
      { name: 'Property purchase', source: 'HMRC transactions ÷ ONS households', method: '3.85% of households, seeded random draw' },
      { name: 'TV ownership, licence evasion, first-time buyers', source: 'Rates set in the data package', method: 'Seeded random draws' },
    ],
  },
  {
    id: 'wealth',
    branch: 'shared',
    title: 'Wealth imputation',
    subtitle: 'WAS → FRS',
    description:
      'A quantile random forest trained on the Wealth and Assets Survey (Round 8, UK Data Service study 7215) ' +
      'imputes property, financial and pension wealth, vehicles and student loan balances. The build then ' +
      'rescales main residence values so each region’s mean matches the UK House Price Index.',
    icon: 'coin',
    inputSize: `${f.baseHouseholds} households`,
    outputSize: `${f.baseHouseholds} households`,
    dataSources: ['Wealth and Assets Survey Round 8', 'UK House Price Index'],
    details: [
      '11 predictors: household net income; adults; children; employment, self-employment, private pension and capital income; bedrooms; council tax; renting; region',
      'The Wealth and Assets Survey does not cover Northern Ireland, so the forest treats Northern Ireland households as if they lived in Wales',
      'This stage runs before the spending stage, which uses the imputed number of vehicles',
    ],
    imputations: [
      { name: 'Main residence value', source: 'WAS Round 8, UK HPI', method: 'Quantile random forest, rescaled to regional means' },
      { name: 'Property, corporate and financial wealth (gross and net)', source: 'WAS Round 8', method: 'Quantile random forest' },
      { name: 'Other residential and non-residential property, land', source: 'WAS Round 8', method: 'Quantile random forest' },
      { name: 'Savings', source: 'WAS Round 8', method: 'Quantile random forest' },
      { name: 'Number of vehicles', source: 'WAS Round 8', method: 'Quantile random forest' },
      { name: 'Student loan balance', source: 'WAS Round 8', method: 'Quantile random forest, allocated to people in the household' },
    ],
  },
  {
    id: 'consumption',
    branch: 'shared',
    title: 'Spending imputation',
    subtitle: 'LCFS → FRS',
    description:
      'A quantile random forest trained on the Living Costs and Food Survey 2023-24 (UK Data Service study 9468) ' +
      'imputes spending, so PolicyEngine UK can model VAT, duties and energy policy. Petrol and diesel spending ' +
      'depend on whether a household runs a fuel-burning car: the build gives one to 90% of households with a ' +
      'vehicle from the wealth stage, at random, the share in the National Travel Survey 2024.',
    icon: 'shopping-cart',
    inputSize: `${f.baseHouseholds} households`,
    outputSize: `${f.baseHouseholds} households`,
    dataSources: ['Living Costs and Food Survey 2023-24', 'NEED 2023', 'National Travel Survey 2024'],
    details: [
      '10 predictors: adults, children, region, employment income, self-employment income, private pension income, household net income, tenure, accommodation type, and fuel-burning car',
      '18 outputs: the 12 COICOP spending categories, petrol, diesel, bus fares, domestic energy, electricity and gas',
      'The build rakes electricity and gas to NEED 2023 average use by income band, tenure, accommodation type and region, priced at Ofgem’s April 2026 price cap',
    ],
    imputations: [
      { name: '12 COICOP spending categories', source: 'LCFS 2023-24', method: 'Quantile random forest' },
      { name: 'Petrol and diesel spending', source: 'LCFS 2023-24, NTS 2024', method: 'Quantile random forest, given a fuel-burning car' },
      { name: 'Bus fares', source: 'LCFS 2023-24', method: 'Quantile random forest' },
      { name: 'Electricity and gas', source: 'LCFS 2023-24, NEED 2023, Ofgem', method: 'Quantile random forest, raked to NEED' },
    ],
  },
  {
    id: 'vat-services',
    branch: 'shared',
    title: 'VAT and public services',
    subtitle: 'ETB + NHS data',
    description:
      'Forests trained on the Effects of Taxes and Benefits survey impute the share of spending taxed at the ' +
      'full VAT rate and the education, rail and bus subsidies each household receives. The build assigns NHS ' +
      'visits and spending by age and sex, scaled to a £202bn 2025-26 NHS budget.',
    icon: 'heart-pulse',
    inputSize: `${f.baseHouseholds} households`,
    outputSize: `${f.baseHouseholds} households`,
    dataSources: ['Effects of Taxes and Benefits 1977-2024', 'NHS activity and cost by age and sex'],
    details: [
      'VAT: a forest on adults, children, State Pension age and household net income predicts the share of spending taxed at the full rate',
      'Public services: a forest on age groups, pupils by school stage, DLA and PIP receipt, and household net income predicts education, rail and bus subsidy spending',
      'NHS: A&E, admitted patient and outpatient visits and spending, by age and sex',
      'After calibration, the build scales rail subsidy to £21.6bn and bus subsidy to £3.0bn, uplifted from England to the UK by population',
    ],
    imputations: [
      { name: 'Full-rate VAT spending share', source: 'ETB, financial year ending 2024', method: 'Quantile random forest' },
      { name: 'Education, rail and bus subsidy', source: 'ETB, latest year', method: 'Quantile random forest' },
      { name: 'NHS visits and spending', source: 'NHS activity and cost data', method: 'Average by age and sex, scaled to £202bn' },
    ],
  },
  {
    id: 'spi-income',
    branch: 'shared',
    title: 'Top incomes',
    subtitle: 'SPI → FRS (stacked)',
    description:
      `To represent high incomes, the build adds ${fmtInt(c.spiCopies)} copies of FRS households with zero ` +
      `weight and incomes drawn from HMRC’s Survey of Personal Incomes 2022-23. Calibration then sets how much ` +
      `weight each copy gets: in the released file, these households hold ${fmtPct(c.spiWeightShare)} of ` +
      `household weight.`,
    icon: 'building-bank',
    inputSize: `${f.baseHouseholds} households`,
    outputSize: `${fmtInt(stacked)} households`,
    dataSources: ['HMRC Survey of Personal Incomes 2022-23'],
    details: [
      'One quantile random forest per earnings group (none, employee, self-employed, both) predicts incomes from age, sex and region; each trains on 100,000 SPI records drawn by weight',
      'Copies get all six income types plus Gift Aid and charitable gifts of investments; the original FRS households get only dividend income',
      'A second forest re-imputes each copy’s pension contributions and reported benefits from its new incomes, and the build redraws its Universal Credit and Pension Credit take-up',
      'Children keep their own values',
    ],
    imputations: [
      { name: 'Employment, self-employment, pension, property and savings income', source: 'SPI 2022-23', method: 'Forest per earnings group (copies only)' },
      { name: 'Dividend income', source: 'SPI 2022-23', method: 'Forest per earnings group (all households)' },
      { name: 'Gift Aid and charitable gifts of investments', source: 'SPI 2022-23', method: 'Forest per earnings group (copies only)' },
      { name: 'Pension contributions and reported benefits', source: 'FRS 2024-25', method: 'Second forest, given the new incomes (copies only)' },
    ],
  },
  {
    id: 'capital-gains',
    branch: 'shared',
    title: 'Capital gains',
    subtitle: 'Advani-Summers + HMRC',
    description:
      'The build duplicates every household and gives capital gains to the first adult in each copy. An ' +
      'optimiser splits each household’s weight between its two versions so the share with gains in each income ' +
      `band matches Advani and Summers’ estimates. ${fmtInt(c.cgtBandDonors)} donor households then carry ` +
      `HMRC’s average gain for each size-of-gain band from £12,300 up, covering gains beyond the 95th ` +
      'percentiles where the income-band distributions stop.',
    icon: 'trending-up',
    inputSize: `${fmtInt(stacked)} households`,
    outputSize: `${f.households} households`,
    dataSources: ['Advani & Summers capital gains distributions', 'HMRC Capital Gains Tax statistics, table 2.1a'],
    details: [
      'Weight split: an Adam optimiser takes up to 100 steps, with each household’s share passed through a sigmoid',
      'Gain amounts: a random draw from a piecewise-linear fit to the 5th–95th percentiles of gains in the household’s income band',
      `Donors: 30 for each of HMRC’s ${fmtInt(donorBands)} size-of-gain bands from £12,300 (2023-24), each starting at the weight that reproduces its band’s taxpayers`,
    ],
  },
  {
    id: 'misc-imputations',
    branch: 'shared',
    title: 'Other imputations',
    subtitle: 'Salary sacrifice, student loans, Pension Credit',
    description:
      'The build sets pension contributions through salary sacrifice, student loan plans and Pension Credit ' +
      'take-up last, because each depends on incomes or wealth imputed earlier.',
    icon: 'school',
    inputSize: `${f.households} households`,
    outputSize: `${f.households} households`,
    dataSources: ['FRS 2024-25', 'Student Loans Company', 'DWP take-up statistics'],
    details: [
      'Salary sacrifice: a forest on age and employment income fills in jobs whose holders the FRS did not ask, then the build switches pension contributors to salary sacrifice at random, aiming for about 5.4 million users for calibration to fit',
      'Student loans: people repaying get Plan 1, 2 or 5 from their estimated university start year; in England, the build adds Plan 2 and Plan 5 holders below the repayment threshold to match Student Loans Company totals',
      'Pension Credit: the build solves the take-up probability among entitled families so weighted take-up in Great Britain equals DWP’s caseload take-up rate; families that report Pension Credit keep claiming',
    ],
    imputations: [
      { name: 'Salary sacrifice pension contributions', source: 'FRS 2024-25', method: 'Quantile random forest, then random switching' },
      { name: 'Student loan plan', source: 'Student Loans Company totals', method: 'Rules, then random assignment in England' },
      { name: 'Pension Credit take-up', source: 'DWP take-up rate', method: 'Probability solved over entitled families' },
    ],
  },
  {
    id: 'geography',
    branch: 'shared',
    title: 'Small-area geography',
    subtitle: 'Output Areas',
    description:
      'The build gives each household in Great Britain one Output Area, drawn at random in proportion to ' +
      'population within its survey region, which fixes its local authority and constituency. It then uprates ' +
      'the file to 2025, the year the calibration targets describe.',
    icon: 'map-pin',
    inputSize: `${f.households} households`,
    outputSize: `${f.households} households`,
    dataSources: ['ONS and NRS Output Area lookups', 'Census 2021 and 2022 populations'],
    details: [
      `${fmtInt(g.householdsWithArea)} households have an Output Area; each of the ${f.gbConstituencies} constituencies in Great Britain has ${g.householdsPerConstituency.min} to ${g.householdsPerConstituency.max} of them`,
      `Northern Ireland’s ${f.niHouseholds} households have none in this release: the build skips Northern Ireland while its small-area lookup is unavailable (policyengine-uk-data#580)`,
      `The build can draw several Output Areas per household; the publish run drew ${g.outputAreaDrawsPerHousehold}`,
    ],
  },
  {
    id: 'constituency-calibration',
    branch: 'national',
    title: 'Constituency calibration',
    subtitle: `${f.constituencies} × ${f.households} weights`,
    description:
      `Calibration gives each of the ${f.constituencies} constituencies its own weight for every household in ` +
      `its nation, and fits all of them together: each constituency’s weights match its local targets, and their ` +
      `sum over constituencies matches ${f.nationalTargets} UK-wide targets. That sum becomes each household’s ` +
      `national weight.`,
    icon: 'checkbox',
    inputSize: `${f.households} households`,
    outputSize: `${f.constituencies} × ${f.households} weights`,
    dataSources: ['ONS', 'HMRC', 'DWP', 'OBR', 'VOA', 'Student Loans Company', 'and others'],
    details: [
      'An Adam optimiser fits log weights at learning rate 0.1 for 512 epochs, replacing a random 5% of weights with their mean at each step',
      'The loss adds the mean squared relative error over local targets to the same over national targets, measured symmetrically between target and estimate',
      'Starting weights divide each FRS weight by the number of constituencies in the household’s nation; the zero-weight top-income copies share half the starting total',
      'The build maps local targets from 2010 constituency boundaries to the 2024 boundaries',
      `At the end of calibration, ${fmtPct(cal.nationalWithin10)} of national and ${fmtPct(cal.constituency.trainingWithin10)} of constituency targets lie within 10%`,
    ],
    calibrationTargets: [
      ...cal.constituency.families.map((fam) => ({
        variable: fam.heldOut ? `${fam.label} (logged, not fitted)` : fam.label,
        target: `${fmtInt(fam.cells)} area targets`,
        source: fam.source,
      })),
      { variable: 'UK-wide targets', target: f.nationalTargets, source: 'See calibration targets' },
    ],
    link: { label: 'All calibration targets', path: '/data/calibration' },
  },
  {
    id: 'final-dataset',
    branch: 'national',
    isFinalDataset: true,
    title: 'Enhanced FRS 2024-25',
    subtitle: 'Default dataset',
    description:
      `The build scales the national weights back to 2024, the file’s year, and PolicyEngine UK uprates them ` +
      `when it loads the file. It rescales rail and bus subsidies, bus fares and road fuel volumes to published ` +
      `totals and saves the file as ${uk.release.defaultDataset}, the dataset ${f.pin} runs for the UK.`,
    icon: 'stack-2',
    inputSize: `${f.constituencies} × ${f.households} weights`,
    outputSize: `${f.households} households`,
    dataSources: [f.data],
    details: [
      `${f.households} households and ${f.people} people, weighted to ${fmtMillions(uk.enhanced.weightedHouseholds)} households in 2024`,
      `${fmtInt(c.frs)} FRS households, ${fmtInt(c.spiCopies)} top-income copies, ${fmtInt(c.capitalGainsCopies)} capital gains copies and ${fmtInt(c.cgtBandDonors)} capital gains donors`,
      'policyengine.py analyses a constituency or local authority with the households whose Output Area lies in it, at their national weights',
      'Northern Ireland constituencies and local authorities have no households in this release, so policyengine.py stops with an error for them',
    ],
    link: { label: 'How the data compares with official statistics', path: '/data/validation' },
  },
  {
    id: 'la-calibration',
    branch: 'local',
    title: 'Local authority calibration',
    subtitle: `${f.localAuthorities} × ${f.households} weights`,
    description:
      `The same fit runs over ${f.localAuthorities} local authorities, with more local targets: income and ` +
      `housing costs, tenure, private rents, and council tax bands and bills. The loss leaves out any target ` +
      `with no local source. The release ships these weights as local_authority_weights.h5; the default ` +
      `dataset’s weights come from the constituency fit.`,
    icon: 'building-community',
    inputSize: `${f.households} households`,
    outputSize: `${f.localAuthorities} × ${f.households} weights`,
    dataSources: ['ONS', 'HMRC', 'DWP', 'VOA', 'MHCLG', 'Welsh Government'],
    details: [
      `${fmtInt(cal.localAuthority.cellsWithTarget)} local targets across ${cal.localAuthority.metrics} measures; ${fmtInt(cal.localAuthority.cellsWithoutSource)} area and measure pairs have no source`,
      `At the end of calibration, ${fmtPct(cal.localAuthority.trainingWithin10)} of local authority targets lie within 10%`,
    ],
    calibrationTargets: [
      ...cal.localAuthority.families.map((fam) => ({
        variable: fam.heldOut ? `${fam.label} (logged, not fitted)` : fam.label,
        target: `${fmtInt(fam.cells)} area targets`,
        source: fam.source,
      })),
      { variable: 'UK-wide targets', target: f.nationalTargets, source: 'See calibration targets' },
    ],
  },
];
