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

  // -------------------------------------------------------------------------
  // Optional capabilities — added incrementally. Models that haven't been
  // audited for these fields leave them undefined (meaning "not asserted").
  // The UI renders missing values as "—".
  // -------------------------------------------------------------------------

  /**
   * Dynamic / lifecycle simulation: ages individuals forward through life
   * events (aging, marriage, retirement, mortality) rather than running an
   * annual cross-sectional simulation. DYNASIM3, CBOLT are dynamic; most
   * tax microsims are not.
   */
  dynamic?: Tristate;
  /**
   * Long-term projection: forward simulation horizon beyond the standard
   * CBO 10-year window (typically 30-75 years for Social Security
   * solvency, long-term budget outlook, generational accounting).
   */
  longTermProjection?: Tristate;
  /**
   * Health insurance market simulation: models plan choice, enrollment
   * dynamics, premiums, and market response — not just program
   * eligibility. HIPSM (Urban) and HISIM2 (CBO) are designed for this;
   * tax microsims that compute PTC eligibility from inputs are typically
   * `partial` at most.
   */
  healthInsuranceMarket?: Tristate;
  /**
   * Macro feedback / CGE-style modeling: captures economy-wide effects
   * of policy changes (GDP, employment, capital formation) via a
   * general-equilibrium or behavioral-response framework. PWBM, Tax
   * Foundation TAG, and CBO dynamic-scoring runs do this; static tax
   * microsims do not.
   */
  macroFeedback?: Tristate;
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
  /**
   * Whether the model's source code is publicly readable.
   * Tristate (not boolean) so we can distinguish "fully open" from
   * "source-available without an open licence" (e.g. Budget Lab).
   */
  codePublic: Tristate;
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
  | 'property-tax'
  | 'consumption-tax'
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
  | 'baseline-import-and-logit'
  | 'caseload-driven'
  | 'l0-calibration'
  | 'gradient-reweighting'
  | 'statistical-matching'
  | 'parameterized-take-up'
  | 'rule-based'
  | 'survey-reported'
  | 'census-research-file'
  | 'machine-learning'
  | 'not-modeled'
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
/*                       BEHAVIORAL / ELASTICITY ASSUMPTIONS                  */
/* -------------------------------------------------------------------------- */

export type BehavioralParameterDomain =
  | 'labor-supply'
  | 'taxable-income'
  | 'capital-gains'
  | 'take-up'
  | 'health-insurance'
  | 'retirement'
  | 'saving'
  | 'tax-incidence'
  | 'macro'
  | 'tariff'
  | 'financial-transactions'
  | 'other';

export type BehavioralParameterKind =
  | 'elasticity'
  | 'semi-elasticity'
  | 'participation-elasticity'
  | 'incidence-assumption'
  | 'choice-model'
  | 'take-up-model'
  | 'functional-form'
  | 'calibration-target'
  | 'other';

export type BehavioralParameterStatus =
  | 'numeric'
  | 'qualitative'
  | 'documented-undisclosed'
  | 'not-modeled'
  | 'unknown';

/**
 * Structured behavioral parameters and reverse-engineering assumptions:
 * elasticities, choice models, pass-through/incidence assumptions, and explicit
 * "not modeled" or "undisclosed" rows where public documentation supports that
 * conclusion. Numeric fields are intentionally optional because many models
 * document a response margin without publishing the parameter value.
 */
export interface BehavioralParameter {
  model: string;
  domain: BehavioralParameterDomain;
  kind: BehavioralParameterKind;
  /** Stable parameter id within the model/domain, e.g. "labor_income_effect". */
  parameter: string;
  /** Human-readable label shown in tables. */
  label: string;
  status: BehavioralParameterStatus;
  /** Single value when public and scalar. */
  value?: number | 'varies' | 'unknown';
  /** Range or scenario values where public. */
  lower?: number;
  central?: number;
  upper?: number;
  unit?: string;
  /** Population, income group, asset class, or entity this parameter applies to. */
  population?: string;
  /** Policy area or model scope. */
  policyScope?: string;
  /** Extensive, intensive, realization, pass-through, enrollment, etc. */
  margin?: string;
  /** Short-run, long-run, budget-window, static, etc. */
  horizon?: string;
  /** Formula, model class, or implementation detail when public. */
  functionalForm?: string;
  notes?: string;
  sources: Source[];
}

/* -------------------------------------------------------------------------- */
/*                            MODELING MECHANICS                              */
/* -------------------------------------------------------------------------- */

export type ModelingMechanicCategory =
  | 'architecture'
  | 'simulation-unit'
  | 'base-data'
  | 'data-enhancement'
  | 'aging-uprating'
  | 'calibration'
  | 'take-up'
  | 'tax-modeling'
  | 'benefit-modeling'
  | 'behavioral-response'
  | 'macro-feedback'
  | 'health-insurance'
  | 'dynamic-lifecycle'
  | 'geography'
  | 'time-horizon'
  | 'validation'
  | 'output'
  | 'access'
  | 'other';

/**
 * Atomic public facts about a model's mechanics. This is deliberately more
 * granular than `models.summary`: rows are meant to accumulate every modeling
 * detail we can substantiate from methodology documents.
 */
export interface ModelingMechanic {
  model: string;
  category: ModelingMechanicCategory;
  /** Short name for this modeling detail. */
  label: string;
  /** Exact methodological detail, written neutrally and with caveats. */
  detail: string;
  /** Optional program/domain scope, e.g. "federal tax", "SNAP", "health". */
  scope?: string;
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
  behavioralParameters: BehavioralParameter[];
  modeling: ModelingMechanic[];
  artifacts: Artifact[];
  freshness: Freshness[];
}
