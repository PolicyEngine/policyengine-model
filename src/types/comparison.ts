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

/**
 * Source independence kind. Used to assess corroboration strength —
 * a claim backed only by `self` sources is weaker than one with
 * `government` or `academic` corroboration.
 */
export type SourceKind =
  | 'self'
  | 'government'
  | 'academic'
  | 'press'
  | 'civilsociety'
  | 'other';

export interface Source {
  /** Free-text label shown in the UI. */
  label: string;
  /** Optional URL. Omit if the cite is offline (e.g. interview, internal doc). */
  url?: string;
  /** ISO date the source was checked. */
  checked?: string;
  /**
   * Which specific fields in the parent row this source corroborates.
   * If omitted or empty, the source supports the whole row generally.
   * Field names match the row keys (e.g. ['codePublic', 'codeLicense']).
   */
  supports?: string[];
  /**
   * Source independence indicator. Defaults to 'other' when omitted.
   *   self          — published by the organization that owns the model.
   *   government    — federal/state/local government publication or contract.
   *   academic      — peer-reviewed or working-paper academic source.
   *   press         — major news outlet.
   *   civilsociety  — non-profit, foundation, or think-tank not the model's owner.
   *   other         — anything else.
   */
  kind?: SourceKind;
  /**
   * Exact quote from the source that supports the claim. Shown as a
   * tooltip on hover. Use this to make claims as precise as possible —
   * a reader can verify the quote against the linked URL without
   * re-reading the entire document.
   */
  quote?: string;
}

/**
 * Filter a row's sources to those that corroborate a specific field.
 * A source with no `supports` or empty supports applies to all fields.
 */
export function sourcesFor(sources: Source[], field: string): Source[] {
  return sources.filter(
    (s) => !s.supports || s.supports.length === 0 || s.supports.includes(field),
  );
}

/**
 * Distinct source kinds present in a list of sources — used to assess
 * corroboration diversity.
 */
export function sourceKinds(sources: Source[]): Set<SourceKind> {
  const set = new Set<SourceKind>();
  for (const s of sources) set.add(s.kind ?? 'other');
  return set;
}

/* -------------------------------------------------------------------------- */
/*                                 MODELS                                     */
/* -------------------------------------------------------------------------- */

export type ModelType =
  | 'microsimulation'
  | 'tax-calculator'
  | 'rules-engine'
  | 'reduced-form';

/**
 * Capability flags — derived from the Sheets-based comparison Max maintains
 * (see PR description). Each flag is a tristate so we can distinguish
 * 'no' from 'unknown' from 'partial'.
 */
export interface ModelCapabilities {
  /** Can simulate counterfactual policy reforms (vs. status-quo only). */
  reformImpact: Tristate;
  /** Single integrated microdataset spanning taxes and transfers. */
  integratedMicrodata: Tristate;
  /** Sub-state geographic detail (county, congressional district, etc.). */
  localAreas: Tristate;
  /** Public-facing web interface (not just internal use). */
  publicInterface: Tristate;
  /** Programmatic API access for external users. */
  apiAccess: Tristate;
}

export interface Model {
  id: string;
  name: string;
  organization: string;
  organizationUrl?: string;
  /** Sibling/sister models that share infrastructure with this one. */
  siblings?: string[];
  /** Country (e.g. 'us', 'uk'). Used for filtering in views. */
  country: string;
  /** Organizational sector: government, non-profit, for-profit, academic. */
  sector: 'government' | 'non-profit' | 'for-profit' | 'academic' | 'other';
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
  capabilities: ModelCapabilities;
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
  /**
   * Annual outlays/expenditures in USD for benefit programs. Use this
   * field only for programs that disburse money (or in-kind benefits
   * valued in dollars) — not for revenue-raising taxes.
   */
  annualOutlaysUsd?: number;
  /**
   * Annual revenue in USD for taxes/tariffs that raise money rather
   * than disburse it. Kept separate from `annualOutlaysUsd` because the
   * semantics are opposite (one is government spending, the other is
   * government receipts).
   */
  annualRevenueUsd?: number;
  /** Approximate number of households/units affected. */
  affectedUnits?: string;
  /** Year of latest major reform reflected. */
  asOfYear?: number;
  /**
   * Citations supporting the statutory, fiscal, and other claims in this
   * program row. Programs are factual claims about US/UK law and budget
   * scale; they need their own corroboration.
   */
  sources?: Source[];
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
/*                               CONCEPTS                                     */
/* -------------------------------------------------------------------------- */

/**
 * A comparable methodology concept that can be implemented differently
 * across models — e.g. "SNAP participation imputation", "capital gains
 * imputation", "state income tax aging". Concept IDs decouple the
 * comparison from any one model's internal variable names.
 */
export interface Concept {
  id: string;
  /** Human-readable name shown in the UI. */
  name: string;
  /** Short description of what the concept refers to. */
  description: string;
  /** Optional grouping for display (e.g. 'imputation', 'calibration'). */
  category?: string;
  /** Related program id, when applicable. */
  program?: string;
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
  | 'survey-reported'
  | 'census-research-file'
  | 'machine-learning'
  | 'other'
  | 'unknown';

export interface Imputation {
  model: string;
  /** Concept id (from concepts.yaml) being imputed/calibrated. */
  concept: string;
  method: ImputationMethod;
  /** Free-text description of the method. */
  description: string;
  baseDataset: string;
  /** Calibration targets, free-text labels (e.g. 'state-level SNAP caseload'). */
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
  concepts: Concept[];
  coverage: Coverage[];
  transparency: Transparency[];
  usage: UsageMetric[];
  accuracy: AccuracyCheck[];
  imputations: Imputation[];
  artifacts: Artifact[];
  freshness: Freshness[];
}
