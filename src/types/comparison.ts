/**
 * Schema for the open microsimulation reference.
 *
 * Source-of-truth data lives in `data/comparisons/*.yaml`. This file defines
 * the TypeScript shape the loader produces.
 *
 * Design principles:
 *  - Every fact is a typed row, not free prose.
 *  - Unknown values are explicit (`'unknown'`) rather than omitted.
 *  - Every claim links to at least one citation `Source`.
 *  - Cost data is intentionally excluded from this public schema.
 */

export type Tristate = 'yes' | 'no' | 'partial' | 'unknown';

export interface Source {
  /** Free-text label shown in the UI. */
  label: string;
  /** Optional URL. Omit if the cite is offline (e.g. interview, internal doc). */
  url?: string;
  /** ISO date the source was checked. */
  checked?: string;
}

/* -------------------------------------------------------------------------- */
/*                                 MODELS                                     */
/* -------------------------------------------------------------------------- */

export type ModelType =
  | 'microsimulation'
  | 'tax-calculator'
  | 'rules-engine'
  | 'reduced-form';

export interface Model {
  id: string;
  name: string;
  organization: string;
  organizationUrl?: string;
  /** Sibling/sister models that share infrastructure with this one. */
  siblings?: string[];
  type: ModelType;
  /** Jurisdictions covered, e.g. ['us-federal', 'us-states']. */
  jurisdictions: string[];
  inceptionYear: number | 'unknown';
  /** SPDX-style license identifier or 'proprietary'. */
  license: string;
  codePublic: boolean;
  codeUrl?: string;
  /** Primary implementation language(s). */
  languages: string[];
  /** Primary microdata source (or 'multiple'). */
  primaryDataset: string;
  documentationUrl?: string;
  /** People typically associated with the model. */
  leads?: string[];
  summary: string;
  sources: Source[];
}

/* -------------------------------------------------------------------------- */
/*                                PROGRAMS                                    */
/* -------------------------------------------------------------------------- */

export type ProgramType =
  | 'income-tax'
  | 'payroll-tax'
  | 'refundable-tax-credit'
  | 'nonrefundable-tax-credit'
  | 'cash-transfer'
  | 'in-kind-benefit'
  | 'health-coverage'
  | 'housing-assistance'
  | 'child-care'
  | 'energy-assistance'
  | 'wealth-tax'
  | 'tariff'
  | 'other';

export interface Program {
  id: string;
  name: string;
  fullName?: string;
  /** e.g. 'us-federal', 'us-ca', 'uk-england'. */
  jurisdiction: string;
  agency?: string;
  type: ProgramType;
  /** Statutory citation. */
  statute?: string;
  /** Annual outlays/expenditures in USD, point-in-time best estimate. */
  annualOutlaysUsd?: number;
  /** Approximate number of households/units affected. */
  affectedUnits?: string;
  /** Year of latest major reform reflected. */
  asOfYear?: number;
}

/* -------------------------------------------------------------------------- */
/*                         COVERAGE (MODEL × PROGRAM)                         */
/* -------------------------------------------------------------------------- */

export type CoverageStatus =
  | 'implemented'
  | 'partial'
  | 'not-implemented'
  | 'out-of-scope'
  | 'unknown';

export interface Coverage {
  model: string;
  program: string;
  status: CoverageStatus;
  /** Approximate count of parameters explicitly modeled. */
  parametersModeled?: number | 'unknown';
  /** Are parameters traceable to specific statutory cites in source? */
  statuteTraceable: Tristate;
  /** Public test cases / unit tests for this program. */
  testCoverage: 'high' | 'medium' | 'low' | 'none' | 'unknown';
  /** Public URL to model documentation for this program. */
  docsUrl?: string;
  /** Last verified or maintained year. */
  asOfYear?: number | 'unknown';
  notes?: string;
  sources: Source[];
}

/* -------------------------------------------------------------------------- */
/*                              TRANSPARENCY                                  */
/* -------------------------------------------------------------------------- */

export interface Transparency {
  model: string;
  codePublic: Tristate;
  codeLicense: string;
  codeUrl?: string;
  /** Count of distinct contributors to the public code repo. */
  contributorCount?: number | 'unknown';
  issueTrackerPublic: Tristate;
  documentationPublic: Tristate;
  documentationUrl?: string;
  /** Are parameters annotated with statutory references? */
  parameterSourcing: 'inline-cite' | 'separate-doc' | 'none' | 'unknown';
  testSuitePublic: Tristate;
  testCount?: number | 'unknown';
  /** Is the underlying microdataset publicly available? */
  datasetPublic: Tristate;
  datasetUrl?: string;
  /** Is reproducible build/release process documented? */
  reproducibleBuilds: Tristate;
  notes?: string;
  sources: Source[];
}

/* -------------------------------------------------------------------------- */
/*                                   USAGE                                    */
/* -------------------------------------------------------------------------- */

export interface UsageMetric {
  model: string;
  /** Tracked academic citations or peer-reviewed uses. */
  academicCitations?: number | 'unknown';
  /** Government / quasi-government reports using the model in the past year. */
  governmentReports?: number | 'unknown';
  /** Press mentions in major outlets (NYT, WaPo, WSJ, etc.) in the past year. */
  pressMentions?: number | 'unknown';
  /** Active monthly users of any UI, calculator, or API. */
  monthlyActiveUsers?: number | 'unknown';
  /** Monthly API or simulation calls. */
  monthlyComputations?: number | 'unknown';
  /** Number of distinct organizations known to use the model. */
  organizationUsers?: number | 'unknown';
  notes?: string;
  sources: Source[];
}

/* -------------------------------------------------------------------------- */
/*                                  ACCURACY                                  */
/* -------------------------------------------------------------------------- */

export interface AccuracyCheck {
  model: string;
  /** What is being validated, e.g. 'snap-caseload-2023'. */
  metric: string;
  /** Program this metric belongs to. */
  program: string;
  year: number;
  /** Administrative target value. */
  targetValue: number;
  /** Model-predicted value. */
  predictedValue?: number | 'unknown';
  /** Units, e.g. 'households', 'usd', 'persons'. */
  units: string;
  /** Source for the administrative target. */
  targetSource: Source;
  /** Source for the predicted value. */
  predictedSource?: Source;
  notes?: string;
}

/* -------------------------------------------------------------------------- */
/*                              IMPUTATIONS                                   */
/* -------------------------------------------------------------------------- */

export type ImputationMethod =
  | 'logistic-regression'
  | 'caseload-driven'
  | 'l0-calibration'
  | 'gradient-reweighting'
  | 'statistical-matching'
  | 'rule-based'
  | 'machine-learning'
  | 'other'
  | 'unknown';

export interface Imputation {
  model: string;
  /** Variable being imputed/calibrated. */
  targetVariable: string;
  method: ImputationMethod;
  /** Free-text description of the method. */
  description: string;
  baseDataset: string;
  /** Calibration targets, e.g. ['snap-caseload-state', 'snap-outlay-total']. */
  calibrationTargets?: string[];
  documentationUrl?: string;
  /** Is the imputation code publicly available and reproducible? */
  reproducible: Tristate;
  sources: Source[];
}

/* -------------------------------------------------------------------------- */
/*                                 ARTIFACTS                                  */
/* -------------------------------------------------------------------------- */

export type ArtifactType =
  | 'dataset'
  | 'parameter-database'
  | 'codebase'
  | 'web-application'
  | 'api'
  | 'documentation-site'
  | 'paper'
  | 'cli';

export interface Artifact {
  model: string;
  type: ArtifactType;
  name: string;
  /** Is this artifact publicly accessible? */
  public: Tristate;
  /** SPDX or 'proprietary'. */
  license: string;
  /** Public URL. */
  url?: string;
  description?: string;
  sources: Source[];
}

/* -------------------------------------------------------------------------- */
/*                                FRESHNESS                                   */
/* -------------------------------------------------------------------------- */

export type UpdateCadence =
  | 'continuous'
  | 'quarterly'
  | 'annual'
  | 'as-funded'
  | 'unknown';

export interface Freshness {
  model: string;
  /** Most recent policy year fully implemented in the model. */
  latestImplementedYear: number | 'unknown';
  /** Latest year through which scheduled future-dated changes are tracked. */
  forwardYearsThrough?: number | 'unknown';
  /** Does the model implement legislation enacted but not yet effective? */
  handlesFutureDatedLegislation: Tristate;
  /** Typical update cadence for parameters. */
  updateCadence: UpdateCadence;
  /** Typical lag between legislative enactment and model implementation. */
  updateLag?: string;
  /** ISO date of last major refresh / release. */
  lastMajorRefresh?: string;
  /** Free-text on policy regimes specifically tracked (e.g. OBBBA, TCJA extension). */
  notableRegimes?: string;
  notes?: string;
  sources: Source[];
}

/* -------------------------------------------------------------------------- */
/*                            BUNDLE / LOADER                                 */
/* -------------------------------------------------------------------------- */

export interface ComparisonData {
  models: Model[];
  programs: Program[];
  coverage: Coverage[];
  transparency: Transparency[];
  usage: UsageMetric[];
  accuracy: AccuracyCheck[];
  imputations: Imputation[];
  artifacts: Artifact[];
  freshness: Freshness[];
}
