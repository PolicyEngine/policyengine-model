import type { PipelineStage } from './pipelineStages';
import { ukRelease as uk, ukFacts as f, fmtInt, fmtPct, fmtMillions } from './ukDataRelease';

/*
 * The UK build as policyengine-uk-data runs it for the release policyengine.py
 * pins (datasets/create_datasets.py at the release tag, with the publish run's
 * settings). Mechanisms cite that code; counts and fit come from
 * ukDataRelease.json, which scripts/extract_uk_release.py extracts from the
 * release's own files and calibration logs.
 */

/**
 * The policyengine-uk-data release whose code the stage copy below was checked
 * against. Counts update from the release file; mechanisms don't, so a test
 * fails until someone rereads the copy against a newly pinned release.
 */
export const UK_DATA_VERSION_DESCRIBED = '1.58.1';

const c = uk.enhanced.composition;
const g = uk.enhanced.geography;
const cal = uk.calibration;
const v = uk.validation;
const stacked = c.frs + c.spiCopies;
const donorBands = c.cgtBandDonors / 30;
// Household weight at calibration (the saved 2024 weights times the build's
// year factor), against the weight policyengine-uk gives the same year.
export const calibratedHouseholds = uk.enhanced.weightedHouseholds * uk.weightMatrices.columnSumPerSavedWeight;
export const runtimeShortfall = 1 - v.households / calibratedHouseholds;
const laFitted = cal.localAuthority.cellsWithTarget - cal.localAuthority.heldOut.cells;

export const ukPipelineIntro =
  `PolicyEngine UK runs on the enhanced Family Resources Survey that ${f.pin} pins: ` +
  `${f.data}, built on ${f.builtOn}. The build starts from ${f.baseHouseholds} households in the ` +
  `Family Resources Survey 2024-25, imputes wealth, spending, top incomes and capital gains from other ` +
  `surveys and statistics, places each household in Great Britain in an Output Area, and fits household ` +
  `weights towards statistics for every constituency and for the UK, its nations and its regions.`;

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
      `UK’s inputs, keeps DWP’s grossing weights, and sets each family’s flags for claiming benefits.`,
    icon: 'chart-bar',
    outputSize: `${f.baseHouseholds} households`,
    dataSources: ['DWP Family Resources Survey 2024-25'],
    details: [
      `The FRS grossing weights sum to ${fmtMillions(uk.base.weightedHouseholds)} households`,
      'A family that reports Child Benefit, Pension Credit or Universal Credit is flagged to claim it, with exceptions such as Child Benefit opt-outs; other families are flagged at random, so that in expectation the share of all families flagged, eligible or not, matches a take-up rate set in the data package',
      'A family whose adults have all reached State Pension age is never flagged to claim Universal Credit',
      'The build draws Marriage Allowance, Tax-Free Childcare, free childcare entitlements and Scottish Child Payment at random, at rates set in the data package',
      'Households with a missing or negative council tax report get the mean positive report for their region, band, and whether they have one adult; a group with no reports gets zero. The build nets Scottish water and sewerage charges out',
      'The build draws a broad rental market area for each family at random, in proportion to privately renting households in its region with its bedroom entitlement, and gives the household one family’s draw',
    ],
    imputations: [
      { name: 'Council tax (missing reports)', source: 'FRS 2024-25 reported bills', method: 'Mean by region, band and one adult or more' },
      { name: 'Benefit claim flags', source: 'Reported receipt and data package take-up rates', method: 'Reporters flagged; others drawn at random' },
      { name: 'Broad rental market area', source: 'Privately renting households by area and bedrooms', method: 'Seeded random draw' },
      { name: 'Property purchase', source: 'Probability set in the build', method: '3.85% chance per household, seeded random draw' },
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
      'imputes property, corporate and financial wealth, savings, vehicles and student loan balances; corporate ' +
      'wealth includes pensions other than defined benefit pensions. The build then rescales owners’ main ' +
      'residence values, and their property wealth, so each region’s unweighted mean matches an average house ' +
      'price the build stores and attributes to the UK House Price Index.',
    icon: 'coin',
    inputSize: `${f.baseHouseholds} households`,
    outputSize: `${f.baseHouseholds} households`,
    dataSources: ['Wealth and Assets Survey Round 8', 'Regional house prices the build stores (attributed to the UK HPI)'],
    details: [
      '11 predictors: household net income; adults; children; employment, self-employment, private pension and capital income; bedrooms; council tax; renting; region',
      'The forest’s regions stop at Great Britain, so it treats Northern Ireland households as if they lived in Wales',
      'The stored house prices cover the regions of Great Britain only',
      'This stage runs before the spending stage, which uses the imputed number of vehicles',
    ],
    imputations: [
      { name: 'Main residence value', source: 'WAS Round 8, stored regional house prices', method: 'Quantile random forest, rescaled to regional means' },
      { name: 'Property and corporate wealth; gross and net financial wealth', source: 'WAS Round 8', method: 'Quantile random forest' },
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
      'depend on whether a household runs a fuel-burning car: the build gives each household with a vehicle from ' +
      'the wealth stage a 90% chance of that flag, a share its code attributes to the National Travel Survey 2024.',
    icon: 'shopping-cart',
    inputSize: `${f.baseHouseholds} households`,
    outputSize: `${f.baseHouseholds} households`,
    dataSources: ['Living Costs and Food Survey 2023-24', 'Energy use targets set in the build (attributed to NEED 2023)', 'Car fuel share set in the build (attributed to the NTS 2024)'],
    details: [
      '10 predictors: adults, children, region, employment income, self-employment income, private pension income, household net income, tenure, accommodation type, and fuel-burning car',
      '18 outputs: the 12 COICOP spending categories, petrol, diesel, bus fares, domestic energy, electricity and gas',
      'For the survey households it trains on, a forest trained on the Wealth and Assets Survey supplies the same fuel-burning car flag',
      'The build rakes electricity and gas to average use by income band, tenure, accommodation type and region that its code attributes to NEED 2023, priced at 24.67p per kWh for electricity and 5.74p for gas, with no standing charge',
    ],
    imputations: [
      { name: '12 COICOP spending categories', source: 'LCFS 2023-24', method: 'Quantile random forest' },
      { name: 'Petrol and diesel spending', source: 'LCFS 2023-24, assumed car fuel share', method: 'Quantile random forest, given a fuel-burning car' },
      { name: 'Bus fares', source: 'LCFS 2023-24', method: 'Quantile random forest' },
      { name: 'Electricity and gas', source: 'LCFS 2023-24, energy targets set in the build', method: 'Quantile random forest, raked to the build’s energy targets' },
    ],
  },
  {
    id: 'vat-services',
    branch: 'shared',
    title: 'VAT and public services',
    subtitle: 'ETB + NHS data',
    description:
      'Forests trained on the Effects of Taxes and Benefits survey impute the share of spending taxed at the ' +
      'full VAT rate and the education, rail and bus subsidies each household receives. The build gives each ' +
      'person NHS visits and spending for their age and sex, scaled so the cost table sums to £202bn, the figure ' +
      'its code labels the 2025-26 NHS budget.',
    icon: 'heart-pulse',
    inputSize: `${f.baseHouseholds} households`,
    outputSize: `${f.baseHouseholds} households`,
    dataSources: ['Effects of Taxes and Benefits 1977-2024', 'NHS activity and cost by age and sex'],
    details: [
      'VAT: a forest on adults, children, pension age (the survey’s retirement flag in training) and household net income predicts the share of spending taxed at the full rate',
      'Public services: a forest on age groups, pupils by school stage, DLA and PIP amounts, and household net income predicts education, rail and bus subsidy spending',
      'NHS: A&E, admitted patient and outpatient visits and spending, by age and sex. The FRS records adult ages up to 80; the build drops the cost table’s rows for ages 85 and over before scaling, so spending on people aged 80 and over is understated (policyengine-uk-data#586)',
      'After calibration, the build scales rail subsidy to £21.6bn and bus subsidy to £3.55bn, England’s £3.0bn uplifted to the UK by population',
    ],
    imputations: [
      { name: 'Full-rate VAT spending share', source: 'ETB, survey year 2023', method: 'Quantile random forest' },
      { name: 'Education, rail and bus subsidy', source: 'ETB, latest year', method: 'Quantile random forest' },
      { name: 'NHS visits and spending', source: 'NHS activity and cost data', method: 'Average by age and sex, one scaling factor' },
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
      `weight each copy gets: in the released file, these households and the capital gains copies and donors ` +
      `later made from them hold ${fmtPct(c.spiWeightShare)} of household weight.`,
    icon: 'building-bank',
    inputSize: `${f.baseHouseholds} households`,
    outputSize: `${fmtInt(stacked)} households`,
    dataSources: ['HMRC Survey of Personal Incomes 2022-23'],
    details: [
      'One quantile random forest per earnings group (none, employee, self-employed, both) predicts incomes from age, sex and region; they train on a nominal 100,000 SPI records drawn by weight with replacement, shared across the groups by weight with at least 10,000 per group, so the floors can take the total above 100,000',
      'Copies get all six income types plus Gift Aid and charitable gifts of investments; the original FRS households get only dividend income. Children keep their own values in this step',
      'A second forest re-imputes each copy’s pension contributions, tax-free savings income and benefit reports from its new incomes',
      'The build then zeroes 14 of each copy’s benefit reports, among them the means-tested benefits, contributory ESA and JSA, and Child Benefit; restores its industrial injuries, armed forces compensation and bereavement support reports; and redraws its Universal Credit and Pension Credit claim flags',
    ],
    imputations: [
      { name: 'Employment, self-employment, pension, property and savings income', source: 'SPI 2022-23', method: 'Forest per earnings group (copies only)' },
      { name: 'Dividend income', source: 'SPI 2022-23', method: 'Forest per earnings group (all households)' },
      { name: 'Gift Aid and charitable gifts of investments', source: 'SPI 2022-23', method: 'Forest per earnings group (copies only)' },
      { name: 'Pension contributions, tax-free savings income and benefit reports', source: 'FRS 2024-25', method: 'Second forest, then rules (copies only)' },
    ],
  },
  {
    id: 'capital-gains',
    branch: 'shared',
    title: 'Capital gains',
    subtitle: 'Advani-Summers + HMRC',
    description:
      'The build duplicates every household and gives capital gains to the first adult in each copy. An ' +
      'optimiser splits each household’s weight between its two versions, aiming for the share with gains in ' +
      'each income band in Advani and Summers’ estimates; the split it returns gives the copies more weight than ' +
      `the one it fitted (policyengine-uk-data#585). ${fmtInt(c.cgtBandDonors)} donor households then carry HMRC’s average gain for each ` +
      'size-of-gain band from £12,300 up, so calibration can fit HMRC’s taxpayers and gains in each band.',
    icon: 'trending-up',
    inputSize: `${fmtInt(stacked)} households`,
    outputSize: `${f.households} households`,
    dataSources: ['Advani & Summers capital gains distributions', 'HMRC Capital Gains Tax statistics, table 2.1a'],
    details: [
      'Weight split: an Adam optimiser takes up to 100 steps, with each household’s share passed through a sigmoid',
      'Gain amounts: a random draw from a piecewise-linear line through the 5th to 95th percentiles of gains in the recipient’s own income band, extended in straight lines beyond them',
      `Donors: 30 for each of HMRC’s ${fmtInt(donorBands)} size-of-gain bands from £12,300, each starting at the weight that reproduces its band’s taxpayers`,
    ],
  },
  {
    id: 'misc-imputations',
    branch: 'shared',
    title: 'Other imputations',
    subtitle: 'Salary sacrifice, student loans, Pension Credit',
    description:
      'The build then sets pension contributions through salary sacrifice, student loan plans and Pension ' +
      'Credit claim flags. Pension Credit comes last because entitlement depends on the capital imputed earlier.',
    icon: 'school',
    inputSize: `${f.households} households`,
    outputSize: `${f.households} households`,
    dataSources: ['FRS 2024-25', 'Student loan borrower counts the build stores', 'Pension Credit take-up rate set in the data package'],
    details: [
      'Salary sacrifice: a forest on age and employment income, trained on FRS respondents with pay, fills in people the FRS did not ask about salary sacrifice, and every amount is held to the person’s pay. The build then switches employed pension contributors to salary sacrifice at random, aiming for about 5.4 million users for calibration to fit; each moves their employee pension contribution, up to half their pay, out of pay',
      'Student loans: people repaying through PAYE get Plan 1, 2 or 5 from their estimated university start year, in every nation; in England, the build then gives Plan 2 or Plan 5 at random to people with tertiary education in the matching age band who do not repay, so the expected number at survey weights matches the stored count of borrowers liable to repay, which the build takes from the student loan forecasts for England',
      'Pension Credit: the build solves the claim probability for entitled families so that, in expectation at survey weights, take-up in Great Britain equals the data package’s caseload take-up rate, which it cites to DWP; FRS families that report Pension Credit keep claiming (top-income copies’ predicted reports do not count), and entitled families in Northern Ireland draw at the same probability',
    ],
    imputations: [
      { name: 'Salary sacrifice pension contributions', source: 'FRS 2024-25', method: 'Quantile random forest, then random switching' },
      { name: 'Student loan plan', source: 'Stored borrower counts for England', method: 'Rules, then random assignment in England' },
      { name: 'Pension Credit claim flags', source: 'Take-up rate in the data package', method: 'Probability solved over entitled families in Great Britain' },
    ],
  },
  {
    id: 'geography',
    branch: 'shared',
    title: 'Small-area geography',
    subtitle: 'Output Areas',
    description:
      'The build gives each household in Great Britain one Output Area, drawn at random within its survey ' +
      'region: in proportion to population in England and Wales, and with equal chances in Scotland, where the ' +
      'lookup gives every Output Area the same population in this release (policyengine-uk-data#587). The Output ' +
      'Area fixes the household’s ' +
      'local authority and constituency. The build then uprates the file to 2025, the year the calibration ' +
      'targets describe, with the year-on-year growth its model applies when it loads a file; household weights ' +
      'and fuel spending keep the build’s own indices.',
    icon: 'map-pin',
    inputSize: `${f.households} households`,
    outputSize: `${f.households} households`,
    dataSources: ['ONS and NRS Output Area lookups', 'Census 2021 populations (England and Wales)'],
    details: [
      `${fmtInt(g.householdsWithArea)} households have an Output Area; each of the ${f.gbConstituencies} constituencies in Great Britain has ${g.householdsPerConstituency.min} to ${g.householdsPerConstituency.max} of them`,
      `Northern Ireland’s ${f.niHouseholds} households have none in this release: the build skips Northern Ireland while its small-area lookup is unavailable (policyengine-uk-data#580)`,
      'The lookup has no Output Areas for Cumberland, Westmorland and Furness, North Yorkshire or Somerset, four of the local authorities the build calibrates; households there carry 17 older district codes instead (policyengine-uk-data#587)',
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
      `its nation, and fits them all together: each constituency’s weights towards its local targets, and their ` +
      `sum over constituencies towards ${f.nationalTargets} targets for the UK, its nations and its regions. ` +
      `That sum becomes each household’s national weight.`,
    icon: 'checkbox',
    inputSize: `${f.households} households`,
    outputSize: `${f.constituencies} × ${f.households} weights`,
    dataSources: ['ONS', 'HMRC', 'DWP', 'OBR', 'VOA', 'Student Loans Company', 'and others'],
    details: [
      'An Adam optimiser fits log weights at learning rate 0.1 for 512 epochs; at each step it replaces a random 5% of the log weights with the mean of the rest',
      'The loss adds the mean squared relative error over local targets to the same over national targets, measured symmetrically between target and estimate',
      'Starting weights: the positive weights are halved, the zero-weight households (the top-income copies and their capital gains copies) share the other half equally, and each household’s starting weight is divided by the number of constituencies in its nation',
      'The build treats the constituency targets as figures for the 2010 boundaries and maps them to the 2024 boundaries',
      `The build saves the weights, and logs the fit, every tenth epoch, so the release’s weights are from epoch ${cal.epoch}. There, ${fmtPct(cal.nationalWithin10)} of national and regional targets and ${fmtPct(cal.constituency.trainingWithin10)} of constituency targets lie within 10%`,
      'In this release the build assigns Universal Credit household counts to the wrong constituencies (policyengine-uk-data#468)',
    ],
    calibrationTargets: [
      ...cal.constituency.families.map((fam) => ({
        variable: fam.heldOut ? `${fam.label} (logged, not fitted)` : fam.label,
        target: `${fmtInt(fam.cells)} area targets`,
        source: fam.source,
      })),
      { variable: 'National and regional targets', target: f.nationalTargets, source: 'See calibration targets' },
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
      `The build scales the national weights back to 2024, the file’s year. It then scales rail and bus subsidy, ` +
      `bus fares, and petrol and diesel spending to totals it sets, and saves the file as ` +
      `${uk.release.defaultDataset}, the dataset ${f.pin} runs for the UK.`,
    icon: 'stack-2',
    inputSize: `${f.constituencies} × ${f.households} weights`,
    outputSize: `${f.households} households`,
    dataSources: [f.data],
    details: [
      `${f.households} households and ${f.people} people, weighted to ${fmtMillions(uk.enhanced.weightedHouseholds)} households in 2024`,
      `${fmtInt(c.frs)} FRS households, ${fmtInt(c.spiCopies)} top-income copies, ${fmtInt(c.capitalGainsCopies)} capital gains copies and ${fmtInt(c.cgtBandDonors)} capital gains donors`,
      `policyengine-uk ${v.modelVersion} uprates the weights when it loads the file, by population growth rather than the build’s factor, so a ${v.year} run has ${fmtMillions(v.households)} households against the ${fmtMillions(calibratedHouseholds)} calibration fitted, ${fmtPct(runtimeShortfall)} fewer (policyengine-uk-data#538)`,
      'Bus fares: England’s fare receipts uplifted to the UK by population, split between London and the rest of England, and spread across income groups using trip rates stored in the build, which its code attributes to the National Travel Survey. Petrol and diesel spending: one factor, so the litres they imply match the 2024 road fuel volume the build uses',
      'policyengine.py analyses a constituency or local authority with the households whose Output Area lies in it, at their national weights, not with the constituency or local authority weights',
      'Northern Ireland’s constituencies and local authorities, and Cumberland, Westmorland and Furness, North Yorkshire and Somerset, have no households with an Output Area in this release, so policyengine.py stops with an error for them (policyengine-uk-data#580, #587)',
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
      `housing costs, tenure, private rents, and council tax bands and bills. A target with no figure after the ` +
      `build’s preprocessing stays out of the loss. The release ships these weights as ` +
      `local_authority_weights.h5; the default dataset’s weights come from the constituency fit.`,
    icon: 'building-community',
    inputSize: `${f.households} households`,
    outputSize: `${f.localAuthorities} × ${f.households} weights`,
    dataSources: ['ONS', 'HMRC', 'DWP', 'VOA', 'MHCLG', 'Welsh Government'],
    details: [
      `${fmtInt(laFitted)} fitted local targets and ${fmtInt(cal.localAuthority.heldOut.cells)} logged but not fitted, across ${cal.localAuthority.metrics} measures; ${fmtInt(cal.localAuthority.cellsWithoutSource)} area and measure pairs have no figure`,
      `At epoch ${cal.epoch}, ${fmtPct(cal.localAuthority.trainingWithin10)} of local authority targets lie within 10%`,
      'In this release the build assigns Universal Credit household counts to the wrong local authorities (policyengine-uk-data#468)',
    ],
    calibrationTargets: [
      ...cal.localAuthority.families.map((fam) => ({
        variable: fam.heldOut ? `${fam.label} (logged, not fitted)` : fam.label,
        target: `${fmtInt(fam.cells)} area targets`,
        source: fam.source,
      })),
      { variable: 'National and regional targets', target: f.nationalTargets, source: 'See calibration targets' },
    ],
  },
];
