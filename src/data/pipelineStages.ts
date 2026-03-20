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
    description: 'The IRS Public Use File (PUF) from 2015 provides detailed tax return information not available in the CPS: itemized deductions, business income, capital gains, and credits. Records are uprated to 2024 using SOI growth factors, and the four IRS disclosure-protection aggregate rows are reconstructed as synthetic extreme-tail donor records before downstream use.',
    icon: 'building-bank',
    inputSize: '~150,000 tax returns',
    outputSize: '~150,000 tax returns (uprated)',
    dataSources: ['IRS Public Use File 2015', 'IRS Demographics File 2015', 'CBO uprating factors'],
    details: [
      '~60 e-file variables mapped to PolicyEngine names',
      'Four disclosure-protection aggregate rows are replaced by synthetic extreme-tail donor records calibrated to published IRS bucket totals',
      'Employment, self-employment, farm, rental, interest, dividend income',
      'Itemized deductions: SALT, medical, charitable (cash/non-cash), mortgage interest',
      'Partnership/S-corp income, qualified business income (QBI)',
      'Capital gains split: 88% long-term / 12% short-term',
      'Demographics imputed via Quantile Random Forest (QRF) where needed; aggregate-row replacements inherit donor household structure',
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
    description: 'The CPS is doubled by stacking: (1) original CPS records keeping their income, and (2) a copy with PUF-imputed income variables. This creates a rich dataset with both CPS demographics and PUF tax detail. Sequential quantile random forests transfer tax-return variables from the PUF to the CPS while preserving cross-variable dependence.',
    icon: 'stack-2',
    inputSize: '~150,000 persons + ~150,000 PUF returns',
    outputSize: '~300,000 persons (stacked)',
    dataSources: ['CPS 2024', 'PUF 2024 (uprated)'],
    details: [
      'Sequential quantile random forest (QRF) imputes 66 PUF-only variables and overrides 49 CPS income variables',
      'Top 7 variables (75% of total): employment income, partnership/S-corp income, Social Security, taxable pension, interest deduction, tax-exempt pension, long-term capital gains',
      '49 CPS-reported income variables are replaced with PUF-imputed values',
      '7 predictors: age, sex, joint filing, dependents count, head/spouse/dependent status',
      'Training sample: 20,000 stratified PUF records, force-including the top 0.5% by AGI',
      'PUF copy starts with weight=0 (L0 optimization decides which records to activate)',
      'CPS copy keeps original weights; weeks_unemployed reverse-imputed for PUF copy',
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
    outputSize: '~31,000 persons stratified sample',
    details: [
      'Stratification ensures representation across income bands, family types, and geographic areas',
      'Keeps every household above the 99.5th percentile of AGI and uniformly random-samples the rest down preserving the income tail',
      'Balances computational efficiency with fidelity to population distribution',
      'Prepares a tractable sample for the calibration stages that follow',
    ],
  },
  {
    id: 'supplemental-imputation',
    branch: 'shared',
    title: 'ACS, SIPP, SCF',
    subtitle: 'Supplemental imputation',
    description: 'Additional variables imputed from external surveys to increase coverage. The American Community Survey (ACS), Survey of Income and Program Participation (SIPP), and Survey of Consumer Finances (SCF) each contribute variables not available in the CPS or PUF.',
    icon: 'building-community',
    inputSize: '~31,000 persons',
    outputSize: '~31,000 persons',
    dataSources: ['ACS 2022', 'SIPP 2023', 'SCF 2022'],
    details: [
      'ACS: rent, real estate taxes used to improve housing cost estimates',
      'SIPP: tip income from TJB*_TXAMT columns, program participation spells',
      'SCF: bank/stock/bond assets, auto loans, net worth',
    ],
    imputations: [
      { name: 'Rent and real estate taxes', source: 'ACS 2022', method: 'Quantile random forest (10,000 ACS household heads)' },
      { name: 'Tip income', source: 'SIPP 2023', method: 'Quantile random forest from TJB*_TXAMT columns' },
      { name: 'Bank/stock/bond assets', source: 'SCF 2022', method: 'Quantile random forest from Survey of Consumer Finances' },
      { name: 'Auto loans, net worth', source: 'SCF 2022', method: 'Quantile random forest from Survey of Consumer Finances' },
    ],
  },
  {
    id: 'enhanced',
    branch: 'national',
    isFinalDataset: true,
    legacyNote: 'This stage reflects the legacy single-national-calibration pipeline. The current approach replaces it with a 14-step process that calibrates all geographic areas (including the nation) through a unified pipeline.',
    title: 'Enhanced CPS',
    subtitle: 'National L0 calibration',
    description: 'Household weights are optimized using L0-regularized gradient descent so that weighted aggregates match 100+ administrative targets from IRS, CBO, SSA, CMS, and other agencies. The L0 penalty drives many weights to exactly zero, selecting the most informative records.',
    icon: 'scale',
    inputSize: '~300,000 persons (extended)',
    outputSize: '~300,000 persons (reweighted)',
    dataSources: ['CBO Budget Projections (Jan 2025)', 'IRS Statistics of Income', 'SSA', 'CMS/HHS', 'JCT Tax Expenditures', 'USDA FNS', 'Census Bureau', 'Federal Reserve SCF'],
    details: [
      'L0-regularized optimization (l0-python): λ₀=1e-6, λ₂=1e-12, lr=0.15',
      'Relative loss function: minimizes percentage errors from targets',
      '500 training epochs per calibration run',
      'Sparsity: many household weights driven to exactly zero',
      'Quality metric: percentage of targets within 10% of administrative value',
      'Also available: small EnhancedCPS (1,000 household subsample) and L0-sparse version',
    ],
    calibrationTargets: [
      { variable: 'Federal income tax (positive)', target: '$2.43T', source: 'CBO Revenue Projections Jan 2025' },
      { variable: 'Social Security benefits', target: '$1.45T', source: 'SSA/CBO' },
      { variable: 'Medicaid spending', target: '$871.7B', source: 'CMS 2023 Highlights' },
      { variable: 'SNAP benefits', target: '$93.7B', source: 'USDA/CBO' },
      { variable: 'EITC', target: '$67.3B', source: 'Treasury Tax Expenditures' },
      { variable: 'SSI', target: '$57B', source: 'CBO' },
      { variable: 'Unemployment compensation', target: '$34.7B', source: 'CBO' },
      { variable: 'Population', target: '346.6M', source: 'CBO Demographic Outlook' },
      { variable: 'Net worth', target: '$160T', source: 'Federal Reserve SCF' },
      { variable: 'Health insurance premiums', target: '$385B', source: 'MEPS/NHEA' },
      { variable: 'Rent', target: '$735B', source: 'Census/BLS' },
      { variable: 'Real estate taxes', target: '$500B', source: 'Census Bureau' },
      { variable: 'TANF', target: '$9B', source: 'HHS/ACF' },
      { variable: 'SALT deduction', target: '$21.2B', source: 'JCT' },
      { variable: 'Charitable deduction', target: '$65.3B', source: 'JCT' },
      { variable: 'QBI deduction', target: '$63.1B', source: 'JCT' },
      { variable: 'Mortgage interest deduction', target: '$24.8B', source: 'JCT' },
      { variable: 'Medical expense deduction', target: '$11.4B', source: 'JCT' },
      { variable: 'Medicaid enrollment', target: '72.4M', source: 'CMS/HHS' },
      { variable: 'ACA PTC recipients', target: '19.7M', source: 'CMS Marketplace' },
      { variable: 'Undocumented population', target: '13M', source: 'Reuters synthesis' },
      { variable: 'Tip income', target: '$53.2B', source: 'IRS W-2 Box 7 + 40% underreporting adj.' },
      { variable: 'IRS SOI filing counts', target: 'By AGI band × state × CD', source: 'IRS Statistics of Income' },
      { variable: 'State SNAP participation', target: 'By state and CD', source: 'USDA FNS' },
      { variable: 'State income tax revenue', target: 'By state', source: 'Census Bureau' },
      { variable: 'Medicaid enrollment by state', target: 'By state', source: 'CMS/HHS' },
    ],
  },
  {
    id: 'clone',
    branch: 'local',
    title: 'Cloning & geography',
    subtitle: 'Increased local representation',
    description: 'Each household gets 10 clones, and each clone is assigned a random census block sampled from a population-weighted national distribution. The block determines the congressional district, county, and state. A single household can end up "living" in 10 different congressional districts.',
    icon: 'map',
    inputSize: '~31,000 persons (~12,000 households)',
    outputSize: '~120,000 household-clones',
    dataSources: ['Census Bureau population-weighted block file'],
    details: [
      '10 clones per household: clone 0 draws an unrestricted census block; clones 1\u20139 each draw from a distinct state',
      'Population-weighted sampling ensures clones are distributed proportionally to where people actually live',
      'Geographic spread guarantee: each household is represented in up to 10 different states',
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
    inputSize: '~120,000 household-clones',
    outputSize: '~120,000 household-clones (state-aware)',
    dataSources: ['IRS PUF 2015 (uprated)', 'IRS SOI state-level distributions'],
    details: [
      'Re-runs the QRF imputation from Extended CPS, now conditioned on the clone\'s assigned state',
      'State-level income distributions ensure deductions and business income reflect local patterns',
      'Re-imputes the same PUF tax and income variables used in the shared sequential-QRF stage',
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
    inputSize: '~120,000 geo-representative households',
    outputSize: '~120,000 households with geo-representative benefits',
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
    description: 'Builds a unified sparse matrix from the calibration database. Targets sourced from the calibration database are assembled into a single matrix served as a reusable package before any target filtering.',
    icon: 'grid-dots',
    inputSize: 'Calibration targets + simulated values',
    outputSize: 'Sparse calibration matrix',
    details: [
      'Multi-level row bands: national rows cover all clones, state rows cover state clones, CD rows cover CD clones',
      'Sparse matrix format for efficient GPU-based optimization',
      'Supports simultaneous calibration across all geographic levels in a single solve',
    ],
  },
  {
    id: 'target-config',
    branch: 'local-sub-2',
    title: 'Target config',
    subtitle: 'Configurable target selection',
    description: 'Filters the matrix to include only desired target variables. The same matrix supports different target selections for different calibration runs, allowing the selection between national, state, or congressional district levels.',
    icon: 'checkbox',
    inputSize: 'Simulated household-clones',
    outputSize: 'Filtered target matrix',
    details: [
      'Configurable include/exclude rules select which simulated variables become calibration targets',
      'Same underlying data supports national, state, and CD calibration with different target sets',
      'Target variables drawn from simulation output: tax liabilities, benefit amounts, program enrollment counts',
      'Allows rapid iteration on calibration strategy without re-running simulation',
    ],
  },
  {
    id: 'l0-calibration',
    branch: 'local-sub-3',
    title: 'L0 calibration',
    subtitle: 'Multi-level weight optimization',
    description: 'Household-clone weights are optimized using L0-regularized gradient descent so that weighted aggregates simultaneously match administrative targets at the national, state, and congressional district levels. The L0 penalty drives many clone weights to exactly zero, selecting the most informative clones for each geographic area.',
    icon: 'scale',
    inputSize: 'Sparse calibration matrix',
    outputSize: 'Calibrated weight vector',
    dataSources: ['CBO Budget Projections', 'IRS SOI', 'SSA', 'CMS/HHS', 'USDA FNS', 'Census Bureau'],
    details: [
      'L0-regularized optimization (l0-python): sparsity penalty drives uninformative clone weights to zero',
      'Simultaneous calibration across all geographic levels: national, state, and CD targets in one solve',
      'Relative loss function minimizes percentage errors from administrative targets',
      'GPU-accelerated sparse matrix operations for tractable optimization at scale',
      'Local calibration uses λ₀ ≈ 1e-8, yielding ~1–3M non-zero clone weights; national calibration uses λ₀ ≈ 1e-4, yielding ~50k non-zero weights',
      'Output: a single weight vector that, when applied to the clone matrix, reproduces targets at every level',
    ],
  },
  {
    id: 'geo-datasets',
    branch: 'local-sub-4',
    isFinalDataset: true,
    title: 'Geography-specific datasets',
    subtitle: 'Calibrated state & CD microdata',
    description: 'The calibrated weight vector is applied to the clone matrix to produce final geography-specific datasets. Each state and congressional district gets a weighted subset of household clones that reproduces administrative targets for that area.',
    icon: 'map-pin',
    inputSize: 'Calibrated weights + clone matrix',
    outputSize: 'national, state & CD datasets',
    dataSources: ['L0 calibration output'],
    details: [
      '488 calibrated datasets: 1 national H5 file, 51 state equivalents (50 states + DC), and 436 congressional districts (435 CDs + DC at-large)',
      'Weighted aggregates match IRS filing counts, SNAP participation, Medicaid enrollment, and other targets at every geographic level',
      'Datasets are ready for PolicyEngine simulations: any reform can be scored at national, state, or CD level',
    ],
  },
];
