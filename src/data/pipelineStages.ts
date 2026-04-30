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

export const pipelineStages: PipelineStage[] = [
  {
    id: 'cps',
    branch: 'shared',
    title: 'Census CPS ASEC',
    subtitle: 'Base microdata',
    description: 'The Current Population Survey Annual Social and Economic Supplement (CPS ASEC) provides the baseline microdata. The March 2025 supplement covers tax year 2024 with ~200,000 individuals across ~60,000 households.',
    icon: 'chart-bar',
    inputSize: '~150,000 persons',
    outputSize: '~150,000 persons',
    dataSources: ['Census Bureau CPS ASEC (March supplement)'],
    details: [
      '93+ person-level columns: demographics, income, employment, disability',
      '10 tax unit columns: AGI, federal/state taxes, credits (EITC, CTC, ACTC)',
      '35 SPM unit columns: income, benefits, taxes, poverty thresholds',
      'Geographic identifiers: state FIPS, county FIPS, NYC flag',
    ],
    imputations: [
      { name: 'Prior-year income', source: 'CPS longitudinal match', method: 'PERIDNUM matching across consecutive CPS years' },
      { name: 'SSN card type (undocumented status)', source: 'ASEC algorithm', method: 'Probabilistic assignment targeting 13M undocumented, 8.3M workers' },
    ],
  },
  {
    id: 'cps-processing',
    branch: 'shared',
    title: 'CPS processing',
    subtitle: 'Income splitting',
    description: 'Raw Census variables are mapped to PolicyEngine\'s variable system. Income is split into detailed components using IRS ratios.',
    icon: 'arrows-split-2',
    inputSize: '~150,000 persons',
    outputSize: '~150,000 persons',
    dataSources: ['IRS Statistics of Income'],
    details: [
      'Interest income split: 68% taxable (SOI 2020)',
      'Dividends: 44.8% qualified (SOI 2018)',
      'Pensions: 59% taxable (SOI 2015)',
      'Capital gains: 88% long-term, 12% short-term (SOI 2012)',
      'Social Security classified by CPS self-reported reason codes (RESNSS1/RESNSS2); aggregate totals calibrated to SSA targets: retirement $1,060B (73%), disability $148B (10.2%), survivors $160B (11%), dependents $84B (5.8%)',
      'Retirement contributions allocated: traditional 401k → Roth 401k → IRA → Roth IRA (IRS limits)',
    ],
  },
  {
    id: 'puf',
    branch: 'shared',
    title: 'IRS PUF',
    subtitle: 'Tax return data',
    description: 'The IRS Public Use File (PUF) from 2015 provides detailed tax return information not available in the CPS: itemized deductions, business income, capital gains, and credits. Records are uprated to 2024 using SOI growth factors.',
    icon: 'building-bank',
    inputSize: '~150,000 tax returns',
    outputSize: '~150,000 tax returns (uprated)',
    dataSources: ['IRS Public Use File 2015', 'IRS Demographics File 2015', 'CBO uprating factors'],
    details: [
      '~60 e-file variables mapped to PolicyEngine names',
      'Employment, self-employment, farm, rental, interest, dividend income',
      'Itemized deductions: SALT, medical, charitable (cash/non-cash), mortgage interest',
      'Partnership/S-corp income, qualified business income (QBI)',
      'Capital gains split: 88% long-term / 12% short-term',
      'Demographics imputed via Quantile Random Forest (QRF) for records missing age/gender data',
      'Pension contributions imputed from CPS 2021',
    ],
    imputations: [
      { name: 'QBI qualification', source: 'Assumptions', method: 'Self-employment 80%, farm 95%, partnership/S-corp 85% probability' },
      { name: 'SSTB classification', source: 'Assumptions', method: 'Self-employment 20%, partnership 15% probability' },
      { name: 'REIT/PTP income', source: 'Assumptions', method: '7% probability, lognormal(μ=8.04, σ=1.20), mean ~$3,103' },
      { name: 'Demographics (age, gender)', source: 'PUF records with demographics', method: 'QRF imputation from income/filing status' },
      { name: 'Pension contributions', source: 'CPS 2021', method: 'QRF from employment income, age, gender' },
      { name: 'Uprating 2015→2024', source: 'CBO/SOI', method: 'Variable-specific growth factors (population-adjusted)' },
    ],
  },
  {
    id: 'extended',
    branch: 'shared',
    title: 'Extended CPS',
    subtitle: 'PUF → CPS imputation',
    description: 'The CPS is doubled by stacking: (1) original CPS records keeping their income, and (2) a copy with PUF-imputed income variables. This creates a rich dataset with both CPS demographics and PUF tax detail. Quantile random forests transfer 66 tax variables from PUF to CPS, then 51 CPS-only variables are reverse-imputed onto the PUF half.',
    icon: 'stack-2',
    inputSize: '~150,000 persons + ~150,000 PUF returns',
    outputSize: '~300,000 persons (stacked)',
    dataSources: ['CPS 2024', 'PUF 2024 (uprated)'],
    details: [
      '66 PUF variables imputed to CPS via quantile regression forest (QRF): income, deductions, credits, capital gains, business income',
      '51 CPS-only variables reverse-imputed onto the PUF half: retirement distributions, transfers, SPM components, hours worked, medical expenses',
      'PUF copy starts with weight=0 (L0 optimization decides which records to activate)',
    ],
  },
  {
    id: 'stratified-cps',
    branch: 'shared',
    title: 'Stratified CPS',
    subtitle: 'Stratified sample',
    description: 'The extended CPS is stratified into a balanced sample for calibration. Records are grouped by key demographic and economic characteristics, then sampled to ensure proportional representation across strata while keeping the dataset manageable for downstream calibration.',
    icon: 'stack-2',
    inputSize: '~300,000 persons (extended)',
    outputSize: '~12,000 households',
    details: [
      'Keeps every household in the top 1% of AGI, ensuring high-income diversity for tax modeling',
      'Uniformly random-samples remaining households, preserving the income distribution',
      'Optional 1.5× oversampling of bottom 25% for poverty analysis',
      'Prepares a tractable sample for the 430-clone expansion and calibration stages that follow',
    ],
  },
  {
    id: 'supplemental-imputation',
    branch: 'shared',
    title: 'ACS, SIPP, SCF, ORG',
    subtitle: 'Supplemental imputation',
    description: 'Additional variables imputed from external surveys to increase coverage. The American Community Survey (ACS), Survey of Income and Program Participation (SIPP), Survey of Consumer Finances (SCF), and CPS Outgoing Rotation Group (ORG) each contribute variables not available in the CPS or PUF. The ORG provides detailed labor market data from workers in their 4th and 8th CPS interview months, enabling imputation of hourly wages, pay structure, and union coverage.',
    icon: 'building-community',
    inputSize: '~12,000 households',
    outputSize: '~12,000 households',
    dataSources: ['ACS 2022', 'SIPP 2023', 'SCF 2022', 'CPS ORG 2024'],
    details: [
      'ACS: rent, real estate taxes used to improve housing cost estimates',
      'SIPP: tip income from TJB*_TXAMT columns, program participation spells',
      'SCF: bank/stock/bond assets, auto loans, net worth',
      'ORG: hourly wage, hourly/salaried pay classification, union membership or coverage',
    ],
    imputations: [
      { name: 'Rent and real estate taxes', source: 'ACS 2022', method: 'Quantile random forest (10,000 ACS household heads)' },
      { name: 'Tip income', source: 'SIPP 2023', method: 'Quantile random forest from TJB*_TXAMT columns' },
      { name: 'Bank/stock/bond assets', source: 'SCF 2022', method: 'Quantile random forest from Survey of Consumer Finances' },
      { name: 'Auto loans, net worth', source: 'SCF 2022', method: 'Quantile random forest from Survey of Consumer Finances' },
      { name: 'Hourly wage', source: 'CPS ORG 2024', method: 'Quantile random forest from 12 monthly CPS basic files (7 predictors: employment income, hours, age, sex, race, Hispanic status, state)' },
      { name: 'Hourly/salaried pay classification', source: 'CPS ORG 2024', method: 'Quantile random forest from ORG earnings recodes' },
      { name: 'Union membership or coverage', source: 'BLS 2024', method: 'Deterministic assignment calibrated to BLS state and demographic union representation rates' },
    ],
  },
  {
    id: 'enhanced',
    branch: 'national',
    isFinalDataset: true,
    legacyNote: 'This stage reflects the legacy single-national-calibration pipeline. The current approach replaces it with the unified multi-geography pipeline that calibrates national, state, and congressional district levels simultaneously.',
    title: 'Enhanced CPS',
    subtitle: 'National L0 calibration',
    description: 'Household weights are optimized using L0-regularized gradient descent so that weighted aggregates match ~2900 national and state administrative targets from IRS, CBO, SSA, CMS, and other agencies. The L0 penalty drives many weights to exactly zero, selecting the most informative records.',
    icon: 'scale',
    inputSize: '~300,000 persons (extended)',
    outputSize: '~50,000 persons (reweighted, sparse)',
    dataSources: ['CBO Budget Projections (Jan 2025)', 'IRS Statistics of Income', 'SSA', 'CMS/HHS', 'JCT Tax Expenditures', 'USDA FNS', 'Census Bureau', 'Federal Reserve SCF'],
    details: [
      'L0-regularized optimization with HardConcrete gates: λ₀=2.6e-7, lr=0.2, β=0.25',
      'Relative loss function: minimizes percentage errors from targets',
      '500 training epochs per calibration run',
      'Sparsity: many household weights driven to exactly zero, yielding ~50K active records',
      'Quality metric: percentage of targets within 10% of administrative value',
    ],
    calibrationTargets: [
      // CBO projections
      { variable: 'Federal income tax (positive)', target: 'CBO projection', source: 'CBO Budget Projections' },
      { variable: 'Social Security', target: 'CBO projection', source: 'CBO Budget Projections' },
      { variable: 'SNAP', target: 'CBO projection', source: 'CBO Budget Projections' },
      { variable: 'SSI', target: 'CBO projection', source: 'CBO Budget Projections' },
      { variable: 'Unemployment compensation', target: 'CBO projection', source: 'CBO Budget Projections' },
      // Social Security subcomponents
      { variable: 'SS retirement', target: '$1,060B', source: 'SSA 2024 (73% of OASDI)' },
      { variable: 'SS disability', target: '$148B', source: 'SSA 2024 (10.2%)' },
      { variable: 'SS survivors', target: '$160B', source: 'SSA 2024 (11%)' },
      { variable: 'SS dependents', target: '$84B', source: 'SSA 2024 (5.8%)' },
      // Healthcare
      { variable: 'Health insurance premiums', target: '$385B', source: '2024 estimate' },
      { variable: 'Other medical expenses', target: '$278B', source: '2024 estimate' },
      { variable: 'Medicare Part B premiums', target: '$112B', source: '2024 estimate' },
      { variable: 'OTC health expenses', target: '$72B', source: '2024 estimate' },
      { variable: 'Healthcare spending by age', target: 'By 10-year age band', source: 'healthcare_spending.csv' },
      // Housing and transfers
      { variable: 'Rent', target: '$735B', source: 'ACS total uprated by CPI' },
      { variable: 'Real estate taxes', target: '$500B', source: 'Property tax estimate' },
      { variable: 'Real estate taxes by state', target: 'By state', source: 'ACS' },
      { variable: 'TANF', target: '$9B', source: 'HHS/ACF' },
      { variable: 'Housing subsidy (capped)', target: '$35B', source: '2024 estimate' },
      { variable: 'Childcare expenses (capped)', target: '$348B', source: '2024 estimate' },
      { variable: 'SPM thresholds', target: '$3,945B', source: 'SPM estimate' },
      { variable: 'Child support', target: '$33B', source: '2024 estimate' },
      // Medicaid and ACA
      { variable: 'Medicaid spending', target: '$900B', source: 'HHS 2024' },
      { variable: 'Medicaid enrollment', target: '72.4M', source: 'CMS/HHS' },
      { variable: 'Medicaid enrollment by state', target: 'By state', source: 'CMS/HHS' },
      { variable: 'ACA PTC spending', target: '$98B', source: 'CMS 2024' },
      { variable: 'ACA PTC enrollment', target: '19.7M', source: 'CMS Marketplace' },
      { variable: 'ACA spending by state', target: 'By state', source: 'CMS' },
      { variable: 'ACA enrollment by state', target: 'By state', source: 'CMS' },
      // EITC
      { variable: 'EITC spending', target: 'Tax expenditure', source: 'Treasury/JCT' },
      { variable: 'EITC returns by child count', target: 'By 0, 1, 2+ children', source: 'IRS EITC stats' },
      { variable: 'EITC spending by child count', target: 'By 0, 1, 2+ children', source: 'IRS EITC stats' },
      // Tax expenditures (deductions)
      { variable: 'SALT deduction', target: '$21.2B', source: 'JCT 2024' },
      { variable: 'Medical expense deduction', target: '$11.4B', source: 'JCT 2024' },
      { variable: 'Charitable deduction', target: '$65.3B', source: 'JCT 2024' },
      { variable: 'Mortgage interest deduction', target: '$24.8B', source: 'JCT 2024' },
      { variable: 'QBI deduction', target: '$63.1B', source: 'JCT 2024' },
      // IRS SOI by AGI band
      { variable: 'AGI by AGI band', target: 'By 7 AGI ranges', source: 'IRS SOI' },
      { variable: 'Employment income by AGI band', target: 'By 7 AGI ranges', source: 'IRS SOI' },
      { variable: 'Capital gains by AGI band', target: 'By 7 AGI ranges', source: 'IRS SOI' },
      { variable: 'Dividends by AGI band', target: 'By 7 AGI ranges', source: 'IRS SOI' },
      { variable: 'Partnership/S-corp income by AGI band', target: 'By 7 AGI ranges', source: 'IRS SOI' },
      { variable: 'Interest income by AGI band', target: 'By 7 AGI ranges', source: 'IRS SOI' },
      { variable: 'Pension income by AGI band', target: 'By 7 AGI ranges', source: 'IRS SOI' },
      { variable: 'Social Security by AGI band', target: 'By 7 AGI ranges', source: 'IRS SOI' },
      { variable: 'Tax filer counts by AGI band', target: 'By 7 AGI ranges', source: 'IRS SOI Table 1.1' },
      // IRS SOI aggregate
      { variable: 'Business net losses', target: 'National total', source: 'IRS SOI' },
      { variable: 'Estate income/losses', target: 'National total', source: 'IRS SOI' },
      { variable: 'Rent/royalty net income/losses', target: 'National total', source: 'IRS SOI' },
      { variable: 'IRA distributions', target: 'National total', source: 'IRS SOI' },
      { variable: 'Mortgage interest deductions', target: 'National total', source: 'IRS SOI' },
      // Demographics
      { variable: 'Population by single-year age (0–85)', target: '86 age groups', source: 'Census projections' },
      { variable: 'Population by state', target: 'By state', source: 'Census Bureau' },
      { variable: 'Population under 5 by state', target: 'By state', source: 'Census Bureau' },
      { variable: 'Infants', target: '~3.54M', source: 'ACS 2023 grown' },
      { variable: 'Age distribution by state', target: 'By 10-year bands × state', source: 'Census age_state.csv' },
      { variable: 'Undocumented population', target: '13M', source: 'Reuters synthesis' },
      // Wealth and income
      { variable: 'Net worth', target: '$160T', source: 'Federal Reserve Q4 2024' },
      { variable: 'Negative market income', target: '-$138B (3M HH)', source: 'IRS SOI PUF estimate' },
      { variable: 'AGI by SPM threshold decile', target: 'By decile', source: 'Census SPM' },
      { variable: 'Tip income', target: '~$53.2B', source: 'IRS SOI 2018 scaled to 2024' },
      { variable: 'Alimony income/expense', target: '$13B each', source: 'Rough estimate' },
      // Retirement contributions
      { variable: 'Traditional IRA contributions', target: '$13.8B', source: 'IRS SOI Table 1.4 (TY 2023)' },
      { variable: 'Roth IRA contributions', target: '$35.0B', source: 'IRS SOI Accumulation Table 6 (TY 2022)' },
      { variable: 'Traditional 401k contributions', target: '$482.7B', source: 'BEA/FRED (85% traditional split)' },
      { variable: 'Roth 401k contributions', target: '$85.2B', source: 'BEA/FRED (15% Roth split)' },
      { variable: 'Self-employed pension (Keogh)', target: '$30.1B', source: 'IRS SOI Table 1.4 (TY 2023)' },
      // State-level
      { variable: 'AGI by state', target: 'By state', source: 'IRS SOI' },
      { variable: 'SNAP by state', target: 'By state', source: 'USDA FNS' },
      { variable: 'LIHEAP by state', target: 'By state', source: 'HHS' },
    ],
  },
  {
    id: 'clone',
    branch: 'local',
    title: 'Cloning & geography',
    subtitle: 'Increased local representation',
    description: 'Each household gets 430 clones, and each clone is assigned a random census block sampled from a population-weighted national distribution. The block determines the congressional district, county, and state. A single household can end up "living" in 430 different congressional districts, with more populated districts receiving more clones.',
    icon: 'map',
    inputSize: '~12,000 households',
    outputSize: '~5.2M household-clones',
    dataSources: ['Census Bureau population-weighted block file'],
    details: [
      '430 clones per household: clone 0 draws an unrestricted census block; remaining clones each draw from a distinct congressional district to ensure geographic diversity',
      'Population-weighted sampling ensures clones are distributed proportionally to where people actually live',
      'AGI-weighted sampling ensures high-income households are more likely to be cloned into high-income areas, improving representation of wealthy taxpayers in areas with higher income concentrations',
    ],
  },
  {
    id: 'puf-reimputation',
    branch: 'local',
    isFinalDataset: false,
    comingSoon: true,
    title: 'PUF re-imputation',
    subtitle: 'Geography-aware tax detail',
    description: 'The PUF imputation from the shared pipeline is re-run after geography assignment. Because each clone now has a specific state, the quantile random forest can condition on state-level income distributions, producing tax-return variables (itemized deductions, business income, capital gains) that better reflect each clone\'s assigned geography rather than national averages.',
    icon: 'refresh',
    inputSize: '~5.2M household-clones',
    outputSize: '~5.2M household-clones (state-aware)',
    dataSources: ['IRS PUF 2015 (uprated)', 'IRS SOI state-level distributions'],
    details: [
      'Re-runs the QRF imputation from Extended CPS, now conditioned on the clone\'s assigned state',
      'State-level income distributions ensure deductions and business income reflect local patterns',
      'Same 66 PUF variables re-imputed: employment income, partnership/S-corp, capital gains, itemized deductions, etc.',
      'Clones in high-income states (e.g. NY, CA) receive higher imputed SALT and mortgage interest deductions',
      'Prevents calibration from fighting against nationally-averaged income profiles in local areas',
    ],
  },
  {
    id: 'simulation',
    branch: 'local-sub-1',
    title: 'Simulation',
    subtitle: 'PolicyEngine simulation with take-up',
    description: 'For each clone\'s assigned state, simulate taxes and benefits via PolicyEngine US. Program take-up rates are applied stochastically using federal agency estimates, and the full set of calculated variables needed for calibration targets is produced.',
    icon: 'settings',
    inputSize: '~5.2M household-clones',
    outputSize: '~5.2M household-clones with simulated benefits',
    dataSources: ['PolicyEngine US tax-benefit rules', 'ACA marketplace data', 'USDA', 'KFF', 'Urban Institute', 'CMS/HHS'],
    details: [
      'Each household clone is assigned to its target state',
      'Full PolicyEngine US simulation: federal and state income tax, payroll taxes, credits (EITC, CTC), deductions',
      'Benefit programs simulated: SNAP, SSI, TANF, Medicaid, WIC, school meals, and more',
      'ACA marketplace: premium calculation, PTC eligibility, and subsidy amounts',
      'Take-up rates applied stochastically to determine which eligible households actually receive each program',
      'Output includes all variables needed to match calibration targets downstream',
    ],
    imputations: [
      { name: 'SNAP take-up', source: 'USDA', method: '82% stochastic assignment' },
      { name: 'EITC take-up (0 children)', source: 'IRS National Taxpayer Advocate', method: '65% stochastic assignment' },
      { name: 'EITC take-up (1 child)', source: 'IRS National Taxpayer Advocate', method: '86% stochastic assignment' },
      { name: 'EITC take-up (2+ children)', source: 'IRS National Taxpayer Advocate', method: '85% stochastic assignment' },
      { name: 'SSI take-up', source: 'Urban Institute', method: '50% stochastic assignment' },
      { name: 'ACA take-up', source: 'KFF', method: '67.2% stochastic assignment' },
      { name: 'Medicaid take-up', source: 'KFF/MACPAC', method: 'State-specific rates (53%–99%)' },
      { name: 'WIC take-up', source: 'USDA', method: 'Category-specific: pregnant 44–53%, infant 78–98%, child 41–46%' },
      { name: 'TANF take-up', source: 'HHS/ACF', method: '22% stochastic assignment' },
      { name: 'Head Start take-up', source: 'HHS/ACF', method: '30–40% stochastic assignment' },
      { name: 'Early Head Start take-up', source: 'HHS/ACF', method: '9% stochastic assignment' },
    ],
  },
  {
    id: 'matrix-building',
    branch: 'local-sub-2',
    title: 'Matrix building',
    subtitle: 'Unified sparse matrix',
    description: 'Builds a unified sparse matrix from the calibration database. Up to 37,758 targets across national, state, and congressional district levels are assembled into a single matrix served as a reusable package before any target filtering.',
    icon: 'grid-dots',
    inputSize: '~5.2M household-clones + 37,758 targets',
    outputSize: 'Sparse calibration matrix',
    dataSources: ['IRS SOI', 'ACS', 'SSA', 'CBO/Census', 'USDA', 'CMS/HHS'],
    details: [
      '37,758 targets in calibration database: 106 national, ~4,080 state, ~33,572 congressional district',
      '54 distinct target variables: income, taxes, credits, deductions, benefits, demographics, wealth',
      'Multi-level row bands: national rows cover all clones, state rows cover state clones, CD rows cover CD clones',
      'Sparse matrix format for efficient GPU-based optimization',
    ],
  },
  {
    id: 'target-config',
    branch: 'local-sub-2',
    title: 'Target config',
    subtitle: 'Configurable target selection',
    description: 'Filters the 37,758-target matrix down to the active subset via YAML include/exclude rules. The default configuration selects ~21,000 targets; different configs support national-only, state-level, or full geographic calibration runs.',
    icon: 'checkbox',
    inputSize: '37,758 targets (full matrix)',
    outputSize: '~21,000 active targets',
    details: [
      'YAML config with ~67 include/exclude rules selects which targets are active',
      'Same underlying matrix supports national, state, and CD calibration with different target sets',
      'Target variables span: IRS filing counts by AGI band, SNAP participation, Medicaid enrollment, income tax, EITC, population by age, and more',
      'Allows rapid iteration on calibration strategy without re-running simulation',
    ],
  },
  {
    id: 'l0-calibration',
    branch: 'local-sub-3',
    title: 'L0 calibration',
    subtitle: 'Multi-level weight optimization',
    description: 'Household-clone weights are optimized using L0-regularized gradient descent so that weighted aggregates simultaneously match ~21,000 administrative targets at the national, state, and congressional district levels. The L0 penalty uses HardConcrete gates to drive many clone weights to exactly zero, selecting the most informative clones for each geographic area.',
    icon: 'scale',
    inputSize: '~21,000 active targets + ~5.2M clones',
    outputSize: 'Calibrated weight vector',
    dataSources: ['CBO Budget Projections', 'IRS SOI', 'SSA', 'CMS/HHS', 'USDA FNS', 'Census Bureau'],
    details: [
      'L0-regularized optimization with HardConcrete gates: β=0.65, Γ=-0.1, ζ=1.1, lr=0.15, λ₂=1e-12',
      'Simultaneous calibration across all geographic levels: national, state, and CD targets in one solve',
      'Relative loss function minimizes percentage errors from ~21,000 administrative targets',
      'GPU-accelerated sparse matrix operations for tractable optimization at scale',
      'Local calibration uses λ₀ ≈ 1e-8, yielding ~3–4M non-zero clone weights; national calibration uses λ₀ ≈ 1e-4, yielding ~50K non-zero weights',
      '~1500 training epochs for local area datasets and ~4000 for national dataset',
      'Output is a weight vector reproducing targets at the national and sub-national levels',
    ],
  },
  {
    id: 'geo-datasets',
    branch: 'local-sub-4',
    isFinalDataset: true,
    title: 'Geography-specific datasets',
    subtitle: 'Calibrated local area microdata',
    description: 'The calibrated weight vector is applied to the clone matrix to produce final geography-specific datasets. Each state and congressional district gets a weighted subset of household clones that reproduces administrative targets for that area.',
    icon: 'map-pin',
    inputSize: 'Calibrated weights + clone matrix',
    outputSize: 'national, state & CD datasets',
    dataSources: ['L0 calibration output'],
    link: { label: 'View calibration targets', path: '/data/calibration' },
    details: [
      'Calibrated datasets: 1 national H5 file, 51 state equivalents (50 states + DC), and 436 congressional districts (435 CDs + DC at-large), and cities (eg, NYC)',
      'Weighted aggregates match IRS filing counts, SNAP participation, Medicaid enrollment, and other targets at every geographic level',
      'Datasets are ready for PolicyEngine simulations: any reform can be scored at national, state, or CD level',
    ],
  },
];
