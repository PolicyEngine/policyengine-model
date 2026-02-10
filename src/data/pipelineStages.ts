export interface PipelineStage {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  details: string[];
}

export const pipelineStages: PipelineStage[] = [
  {
    id: 'raw',
    title: 'Raw CPS',
    subtitle: 'Census Bureau',
    description: 'The Current Population Survey (CPS) Annual Social and Economic Supplement provides the baseline microdata, covering ~200,000 individuals across ~60,000 households.',
    icon: '📊',
    details: [
      'Demographics, employment, income sources',
      'Health insurance coverage',
      'Program participation (SNAP, Medicaid, etc.)',
      'Released annually by the Census Bureau',
    ],
  },
  {
    id: 'enhanced',
    title: 'Enhanced CPS',
    subtitle: 'Imputation',
    description: 'The CPS lacks detailed tax data. We merge information from IRS Public Use File (PUF) tax records using quantile random forests to impute missing tax variables.',
    icon: '🔗',
    details: [
      'Quantile random forests match CPS and PUF records',
      'Imputes itemized deductions, capital gains, AMT',
      'Adds retirement contributions, business income detail',
      'Preserves joint distributions across variables',
    ],
  },
  {
    id: 'calibrated',
    title: 'Calibrated',
    subtitle: 'Reweighting',
    description: 'Survey weights are adjusted so that weighted totals match administrative targets: IRS tax aggregates, program enrollment counts, and demographic benchmarks.',
    icon: '⚖️',
    details: [
      'Uses gradient-descent optimization (microcalibrate)',
      'Matches IRS Statistics of Income aggregates',
      'Matches CBO program participation totals',
      'Minimizes deviation from original survey weights',
    ],
  },
  {
    id: 'aged',
    title: 'Projected',
    subtitle: 'Aging',
    description: 'The dataset is projected forward to the policy year using growth factors from CBO economic forecasts and population projections.',
    icon: '📈',
    details: [
      'Income growth factors from CBO baseline projections',
      'Population adjustments for demographic shifts',
      'Inflation adjustments for thresholds and amounts',
      'Ensures current-year relevance of historical survey data',
    ],
  },
];
