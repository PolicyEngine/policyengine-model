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
}

export const pipelineStages: PipelineStage[] = [
  {
    id: 'cps',
    title: 'Census CPS ASEC',
    subtitle: 'Base microdata',
    description: 'The Current Population Survey Annual Social and Economic Supplement (CPS ASEC) provides the baseline microdata. The March 2025 supplement covers tax year 2024 with ~200,000 individuals across ~60,000 households.',
    icon: '📊',
    inputSize: '~200,000 persons',
    outputSize: '~200,000 persons',
    dataSources: ['Census Bureau CPS ASEC (March supplement)'],
    details: [
      '93+ person-level columns: demographics, income, employment, disability',
      '10 tax unit columns: AGI, federal/state taxes, credits (EITC, CTC, ACTC)',
      '35 SPM unit columns: income, benefits, taxes, poverty thresholds',
      'Geographic identifiers: state FIPS, county FIPS, NYC flag',
    ],
    imputations: [
      { name: 'Rent and real estate taxes', source: 'ACS 2022', method: 'Quantile random forest (10,000 ACS household heads)' },
      { name: 'Tip income', source: 'SIPP 2023', method: 'Quantile random forest from TJB*_TXAMT columns' },
      { name: 'Bank/stock/bond assets', source: 'SIPP 2023', method: 'Quantile random forest' },
      { name: 'Auto loans, net worth', source: 'SCF 2022', method: 'Quantile random forest from Survey of Consumer Finances' },
      { name: 'Prior-year income', source: 'CPS longitudinal match', method: 'PERIDNUM matching across consecutive CPS years' },
      { name: 'SSN card type (undocumented status)', source: 'ASEC algorithm', method: 'Probabilistic assignment targeting 13M undocumented, 8.3M workers' },
    ],
  },
  {
    id: 'cps-processing',
    title: 'CPS processing',
    subtitle: 'Income splitting and take-up',
    description: 'Raw Census variables are mapped to PolicyEngine\'s variable system. Income is split into detailed components using IRS ratios, and program participation is calibrated using take-up rates from federal agencies.',
    icon: '⚙️',
    inputSize: '~200,000 persons',
    outputSize: '~200,000 persons',
    dataSources: ['IRS Statistics of Income', 'USDA', 'KFF', 'Urban Institute', 'CMS/HHS'],
    details: [
      'Interest income split: 68% taxable (SOI 2020)',
      'Dividends: 44.8% qualified (SOI 2018)',
      'Pensions: 59% taxable (SOI 2015)',
      'Capital gains: 88% long-term, 12% short-term (SOI 2012)',
      'Social Security split into retirement (73%), disability (10.2%), survivors (11%), dependents (5.8%)',
      'Retirement contributions allocated: traditional 401k → Roth 401k → IRA → Roth IRA (IRS limits)',
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
    ],
  },
  {
    id: 'puf',
    title: 'IRS PUF',
    subtitle: 'Tax return data',
    description: 'The IRS Public Use File (PUF) from 2015 provides detailed tax return information not available in the CPS: itemized deductions, business income, capital gains, and credits. Records are uprated to 2024 using SOI growth factors.',
    icon: '🏛️',
    inputSize: '~150,000 tax returns',
    outputSize: '~150,000 tax returns (uprated)',
    dataSources: ['IRS Public Use File 2015', 'IRS Demographics File 2015', 'CBO uprating factors'],
    details: [
      '~60 e-file variables mapped to PolicyEngine names',
      'Employment, self-employment, farm, rental, interest, dividend income',
      'Itemized deductions: SALT, medical, charitable (cash/non-cash), mortgage interest',
      'Partnership/S-corp income, qualified business income (QBI)',
      'Capital gains split: 88% long-term / 12% short-term',
      'Demographics imputed via QRF for records missing age/gender data',
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
    title: 'Extended CPS',
    subtitle: 'PUF → CPS imputation',
    description: 'The CPS is doubled by stacking: (1) original CPS records keeping their income, and (2) a copy with PUF-imputed income variables. This creates a rich dataset with both CPS demographics and PUF tax detail. Quantile random forests transfer 84 variables from PUF to CPS.',
    icon: '🔗',
    inputSize: '~200,000 persons + ~150,000 PUF returns',
    outputSize: '~400,000 persons (stacked)',
    dataSources: ['CPS 2024', 'PUF 2024 (uprated)'],
    details: [
      '84 variables imputed via quantile random forest (QRF)',
      'Top 7 variables (75% of total): employment income, partnership/S-corp income, Social Security, taxable pension, interest deduction, tax-exempt pension, long-term capital gains',
      '47 variables fully overridden from PUF (CPS has no equivalent)',
      '7 predictors: age, sex, joint filing, dependents count, head/spouse/dependent status',
      'Training sample: 5,000 PUF records, batched 10 variables at a time',
      'PUF copy starts with weight=0 (L0 optimization decides which records to activate)',
      'CPS copy keeps original weights; weeks_unemployed reverse-imputed for PUF copy',
    ],
  },
  {
    id: 'enhanced',
    title: 'Enhanced CPS',
    subtitle: 'L0 calibration',
    description: 'Household weights are optimized using L0-regularized gradient descent so that weighted aggregates match 100+ administrative targets from IRS, CBO, SSA, CMS, and other agencies. The L0 penalty drives many weights to exactly zero, selecting the most informative records.',
    icon: '⚖️',
    inputSize: '~400,000 persons (extended)',
    outputSize: '~400,000 persons (reweighted)',
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
      { variable: 'Medicaid spending', target: '$872B', source: 'CMS 2023 Highlights' },
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
    id: 'stratified',
    title: 'Stratified CPS',
    subtitle: 'Geographic cloning',
    description: 'For state and congressional district analysis, the Enhanced CPS is cloned to 12,000 copies — one per geographic area — and pre-filtered so each clone starts with plausible households for that region.',
    icon: '🗺️',
    inputSize: '~400,000 persons (enhanced)',
    outputSize: '12,000 clones',
    dataSources: ['IRS SOI by state/CD', 'USDA FNS by state/CD', 'CMS by state'],
    details: [
      '12,000 clones of the enhanced dataset (one per state × CD combination)',
      'Top 99.5th percentile filtering to remove extreme outliers per clone',
      'Each clone contains all ~400K records but with initial weights reflecting national calibration',
      'Geographic targets attached: IRS filing counts, SNAP participation, Medicaid enrollment by area',
    ],
  },
  {
    id: 'local-l0',
    title: 'L0-pruned local',
    subtitle: 'Local-area calibration',
    description: 'Each geographic clone is independently recalibrated using L0-regularized optimization to match state-level and congressional district-level administrative targets. The L0 penalty drives most household weights to zero, selecting only the records most representative of each local area.',
    icon: '📍',
    inputSize: '12,000 clones',
    outputSize: '12,000 calibrated local datasets',
    dataSources: ['IRS SOI by state/CD', 'USDA FNS by state/CD', 'CMS by state', 'Census Bureau by state'],
    details: [
      'Same L0-regularized gradient descent as Enhanced CPS, applied per geographic area',
      'Sparsity is key: most national records get zero weight in each local dataset',
      'Targets include IRS filing counts by AGI band, SNAP recipients, Medicaid enrollees, state income tax revenue',
      'Congressional district targets from IRS SOI CD-level data',
      'Enables local policy impact analysis: "How does reform X affect households in NY-17?"',
      'Quality validated by comparing weighted aggregates to administrative totals per area',
    ],
    calibrationTargets: [
      { variable: 'IRS filing counts by AGI band', target: 'Per state and CD', source: 'IRS Statistics of Income' },
      { variable: 'SNAP participation', target: 'Per state and CD', source: 'USDA FNS' },
      { variable: 'Medicaid enrollment', target: 'Per state', source: 'CMS/HHS' },
      { variable: 'State income tax revenue', target: 'Per state', source: 'Census Bureau' },
      { variable: 'Population counts', target: 'Per state and CD', source: 'Census Bureau ACS' },
    ],
  },
];
