import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type {
  Model,
  Program,
  Concept,
  Coverage,
  Transparency,
  UsageMetric,
  AccuracyCheck,
  Imputation,
  BehavioralParameter,
  ModelingMechanic,
  Artifact,
  Freshness,
  ComparisonData,
  Source,
} from '../types/comparison';

const DATA_DIR = path.join(process.cwd(), 'data', 'comparisons');
const TRISTATE_VALUES = new Set(['yes', 'no', 'partial', 'unknown']);
const SOURCE_KIND_VALUES = new Set([
  'self',
  'government',
  'academic',
  'press',
  'civilsociety',
  'other',
]);
const MODEL_TYPE_VALUES = new Set([
  'microsimulation',
  'tax-calculator',
  'rules-engine',
  'reduced-form',
]);
const MODEL_SECTOR_VALUES = new Set([
  'government',
  'non-profit',
  'for-profit',
  'academic',
  'other',
]);
const PROGRAM_TYPE_VALUES = new Set([
  'income-tax',
  'payroll-tax',
  'property-tax',
  'consumption-tax',
  'refundable-tax-credit',
  'nonrefundable-tax-credit',
  'cash-transfer',
  'in-kind-benefit',
  'health-coverage',
  'housing-assistance',
  'child-care',
  'energy-assistance',
  'wealth-tax',
  'tariff',
  'other',
]);
const COVERAGE_STATUS_VALUES = new Set([
  'implemented',
  'partial',
  'not-implemented',
  'out-of-scope',
  'unknown',
]);
const TEST_COVERAGE_VALUES = new Set([
  'high',
  'medium',
  'low',
  'none',
  'unknown',
]);
const PARAMETER_SOURCING_VALUES = new Set([
  'inline-cite',
  'separate-doc',
  'none',
  'unknown',
]);
const IMPUTATION_METHOD_VALUES = new Set([
  'logistic-regression',
  'caseload-driven',
  'l0-calibration',
  'gradient-reweighting',
  'statistical-matching',
  'rule-based',
  'survey-reported',
  'census-research-file',
  'machine-learning',
  'other',
  'unknown',
]);
const BEHAVIORAL_PARAMETER_DOMAIN_VALUES = new Set([
  'labor-supply',
  'taxable-income',
  'capital-gains',
  'take-up',
  'health-insurance',
  'retirement',
  'saving',
  'tax-incidence',
  'macro',
  'tariff',
  'financial-transactions',
  'other',
]);
const BEHAVIORAL_PARAMETER_KIND_VALUES = new Set([
  'elasticity',
  'semi-elasticity',
  'participation-elasticity',
  'incidence-assumption',
  'choice-model',
  'take-up-model',
  'functional-form',
  'calibration-target',
  'other',
]);
const BEHAVIORAL_PARAMETER_STATUS_VALUES = new Set([
  'numeric',
  'qualitative',
  'documented-undisclosed',
  'not-modeled',
  'unknown',
]);
const MODELING_MECHANIC_CATEGORY_VALUES = new Set([
  'architecture',
  'simulation-unit',
  'base-data',
  'data-enhancement',
  'aging-uprating',
  'calibration',
  'take-up',
  'tax-modeling',
  'benefit-modeling',
  'behavioral-response',
  'macro-feedback',
  'health-insurance',
  'dynamic-lifecycle',
  'geography',
  'time-horizon',
  'validation',
  'output',
  'access',
  'other',
]);
const ARTIFACT_TYPE_VALUES = new Set([
  'dataset',
  'parameter-database',
  'codebase',
  'web-application',
  'api',
  'documentation-site',
  'paper',
  'cli',
]);
const UPDATE_CADENCE_VALUES = new Set([
  'continuous',
  'quarterly',
  'annual',
  'as-funded',
  'unknown',
]);

function loadYaml<T>(filename: string, rootKey: string): T {
  const raw = readFileSync(path.join(DATA_DIR, filename), 'utf-8');
  const parsed = yaml.load(raw) as Record<string, T>;
  if (!parsed || typeof parsed !== 'object' || !(rootKey in parsed)) {
    throw new Error(
      `Failed to load ${filename}: expected root key "${rootKey}"`,
    );
  }
  return parsed[rootKey];
}

function validateEnum(
  value: unknown,
  allowed: Set<string>,
  context: string,
  errors: string[],
): void {
  if (typeof value !== 'string' || !allowed.has(value)) {
    errors.push(
      `${context}: expected one of ${Array.from(allowed).join(', ')}, got ${JSON.stringify(value)}`,
    );
  }
}

function validateOptionalEnum(
  value: unknown,
  allowed: Set<string>,
  context: string,
  errors: string[],
): void {
  if (value !== undefined) {
    validateEnum(value, allowed, context, errors);
  }
}

function validateSources(
  sources: Source[] | undefined,
  context: string,
  errors: string[],
): void {
  for (const [i, source] of (sources ?? []).entries()) {
    if (!source || typeof source !== 'object') {
      errors.push(`${context}.sources[${i}]: expected source object`);
      continue;
    }
    validateOptionalEnum(
      source.kind,
      SOURCE_KIND_VALUES,
      `${context}.sources[${i}].kind`,
      errors,
    );
  }
}

function validateRequiredSources(
  sources: Source[] | undefined,
  context: string,
  errors: string[],
): void {
  if (
    !sources ||
    sources.length === 0 ||
    sources.some((source) => !source || typeof source !== 'object')
  ) {
    errors.push(`${context}.sources: expected at least one source`);
  }
  validateSources(sources, context, errors);
}

function validateUniqueRows<T>(
  rows: T[],
  context: string,
  keyFor: (row: T) => string,
  errors: string[],
): void {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = keyFor(row);
    if (seen.has(key)) {
      errors.push(`${context}: duplicate row "${key}"`);
    }
    seen.add(key);
  }
}

/**
 * Load and validate the full comparison dataset.
 * Throws if any referential integrity check fails — e.g. coverage row
 * references a model or program that doesn't exist in the registry.
 */
export function loadComparisonData(): ComparisonData {
  const models = loadYaml<Model[]>('models.yaml', 'models');
  const programs = loadYaml<Program[]>('programs.yaml', 'programs');
  const concepts = loadYaml<Concept[]>('concepts.yaml', 'concepts');
  const coverage = loadYaml<Coverage[]>('coverage.yaml', 'coverage');
  const transparency = loadYaml<Transparency[]>(
    'transparency.yaml',
    'transparency',
  );
  const usage = loadYaml<UsageMetric[]>('usage.yaml', 'usage');
  const accuracy = loadYaml<AccuracyCheck[]>('accuracy.yaml', 'accuracy');
  const imputations = loadYaml<Imputation[]>('imputations.yaml', 'imputations');
  const behavioralParameters = loadYaml<BehavioralParameter[]>(
    'behavioral_parameters.yaml',
    'behavioralParameters',
  );
  const modeling = loadYaml<ModelingMechanic[]>('modeling.yaml', 'modeling');
  const artifacts = loadYaml<Artifact[]>('artifacts.yaml', 'artifacts');
  const freshness = loadYaml<Freshness[]>('freshness.yaml', 'freshness');

  const modelIds = new Set(models.map((m) => m.id));
  const programIds = new Set(programs.map((p) => p.id));
  const conceptIds = new Set(concepts.map((c) => c.id));

  const errors: string[] = [];

  validateUniqueRows(models, 'models.yaml', (row) => row.id, errors);
  validateUniqueRows(programs, 'programs.yaml', (row) => row.id, errors);
  validateUniqueRows(concepts, 'concepts.yaml', (row) => row.id, errors);
  validateUniqueRows(
    coverage,
    'coverage.yaml',
    (row) => `${row.model}.${row.program}`,
    errors,
  );
  validateUniqueRows(
    transparency,
    'transparency.yaml',
    (row) => row.model,
    errors,
  );
  validateUniqueRows(usage, 'usage.yaml', (row) => row.model, errors);
  validateUniqueRows(
    accuracy,
    'accuracy.yaml',
    (row) => `${row.model}.${row.program}.${row.metric}`,
    errors,
  );
  validateUniqueRows(
    imputations,
    'imputations.yaml',
    (row) => `${row.model}.${row.concept}`,
    errors,
  );
  validateUniqueRows(
    behavioralParameters,
    'behavioral_parameters.yaml',
    (row) =>
      [
        row.model,
        row.domain,
        row.parameter,
        row.population ?? '',
        row.horizon ?? '',
      ].join('.'),
    errors,
  );
  validateUniqueRows(
    modeling,
    'modeling.yaml',
    (row) => `${row.model}.${row.category}.${row.label}`,
    errors,
  );
  validateUniqueRows(
    artifacts,
    'artifacts.yaml',
    (row) => `${row.model}.${row.type}.${row.name}`,
    errors,
  );
  validateUniqueRows(freshness, 'freshness.yaml', (row) => row.model, errors);

  for (const row of coverage) {
    if (!modelIds.has(row.model)) {
      errors.push(`coverage.yaml: unknown model "${row.model}"`);
    }
    if (!programIds.has(row.program)) {
      errors.push(`coverage.yaml: unknown program "${row.program}"`);
    }
    validateEnum(
      row.status,
      COVERAGE_STATUS_VALUES,
      `coverage.yaml: ${row.model}.${row.program}.status`,
      errors,
    );
    validateEnum(
      row.statuteTraceable,
      TRISTATE_VALUES,
      `coverage.yaml: ${row.model}.${row.program}.statuteTraceable`,
      errors,
    );
    validateEnum(
      row.testCoverage,
      TEST_COVERAGE_VALUES,
      `coverage.yaml: ${row.model}.${row.program}.testCoverage`,
      errors,
    );
    validateRequiredSources(
      row.sources,
      `coverage.yaml: ${row.model}.${row.program}`,
      errors,
    );
  }
  for (const row of transparency) {
    if (!modelIds.has(row.model)) {
      errors.push(`transparency.yaml: unknown model "${row.model}"`);
    }
    for (const field of [
      'codePublic',
      'issueTrackerPublic',
      'documentationPublic',
      'testSuitePublic',
      'datasetPublic',
      'reproducibleBuilds',
    ] as const) {
      validateEnum(
        row[field],
        TRISTATE_VALUES,
        `transparency.yaml: ${row.model}.${field}`,
        errors,
      );
    }
    validateEnum(
      row.parameterSourcing,
      PARAMETER_SOURCING_VALUES,
      `transparency.yaml: ${row.model}.parameterSourcing`,
      errors,
    );
    validateRequiredSources(
      row.sources,
      `transparency.yaml: ${row.model}`,
      errors,
    );
  }
  for (const row of usage) {
    if (!modelIds.has(row.model)) {
      errors.push(`usage.yaml: unknown model "${row.model}"`);
    }
    validateRequiredSources(row.sources, `usage.yaml: ${row.model}`, errors);
  }
  for (const row of accuracy) {
    if (!modelIds.has(row.model)) {
      errors.push(`accuracy.yaml: unknown model "${row.model}"`);
    }
    if (!programIds.has(row.program)) {
      errors.push(`accuracy.yaml: unknown program "${row.program}"`);
    }
    validateRequiredSources(
      [row.targetSource],
      `accuracy.yaml: ${row.model}.${row.metric}.targetSource`,
      errors,
    );
    validateSources(
      row.predictedSource ? [row.predictedSource] : undefined,
      `accuracy.yaml: ${row.model}.${row.metric}.predictedSource`,
      errors,
    );
  }
  for (const row of imputations) {
    if (!modelIds.has(row.model)) {
      errors.push(`imputations.yaml: unknown model "${row.model}"`);
    }
    if (!conceptIds.has(row.concept)) {
      errors.push(`imputations.yaml: unknown concept "${row.concept}"`);
    }
    validateEnum(
      row.method,
      IMPUTATION_METHOD_VALUES,
      `imputations.yaml: ${row.model}.${row.concept}.method`,
      errors,
    );
    validateEnum(
      row.reproducible,
      TRISTATE_VALUES,
      `imputations.yaml: ${row.model}.${row.concept}.reproducible`,
      errors,
    );
    validateRequiredSources(
      row.sources,
      `imputations.yaml: ${row.model}.${row.concept}`,
      errors,
    );
  }
  for (const row of behavioralParameters) {
    if (!modelIds.has(row.model)) {
      errors.push(`behavioral_parameters.yaml: unknown model "${row.model}"`);
    }
    validateEnum(
      row.domain,
      BEHAVIORAL_PARAMETER_DOMAIN_VALUES,
      `behavioral_parameters.yaml: ${row.model}.${row.parameter}.domain`,
      errors,
    );
    validateEnum(
      row.kind,
      BEHAVIORAL_PARAMETER_KIND_VALUES,
      `behavioral_parameters.yaml: ${row.model}.${row.parameter}.kind`,
      errors,
    );
    validateEnum(
      row.status,
      BEHAVIORAL_PARAMETER_STATUS_VALUES,
      `behavioral_parameters.yaml: ${row.model}.${row.parameter}.status`,
      errors,
    );
    validateRequiredSources(
      row.sources,
      `behavioral_parameters.yaml: ${row.model}.${row.parameter}`,
      errors,
    );
  }
  for (const row of modeling) {
    if (!modelIds.has(row.model)) {
      errors.push(`modeling.yaml: unknown model "${row.model}"`);
    }
    validateEnum(
      row.category,
      MODELING_MECHANIC_CATEGORY_VALUES,
      `modeling.yaml: ${row.model}.${row.label}.category`,
      errors,
    );
    validateRequiredSources(
      row.sources,
      `modeling.yaml: ${row.model}.${row.label}`,
      errors,
    );
  }
  for (const row of concepts) {
    if (row.program && !programIds.has(row.program)) {
      errors.push(`concepts.yaml: unknown program "${row.program}"`);
    }
  }
  for (const row of artifacts) {
    if (!modelIds.has(row.model)) {
      errors.push(`artifacts.yaml: unknown model "${row.model}"`);
    }
    validateEnum(
      row.type,
      ARTIFACT_TYPE_VALUES,
      `artifacts.yaml: ${row.model}.${row.name}.type`,
      errors,
    );
    validateEnum(
      row.public,
      TRISTATE_VALUES,
      `artifacts.yaml: ${row.model}.${row.name}.public`,
      errors,
    );
    validateRequiredSources(
      row.sources,
      `artifacts.yaml: ${row.model}.${row.name}`,
      errors,
    );
  }
  for (const row of freshness) {
    if (!modelIds.has(row.model)) {
      errors.push(`freshness.yaml: unknown model "${row.model}"`);
    }
    validateEnum(
      row.handlesFutureDatedLegislation,
      TRISTATE_VALUES,
      `freshness.yaml: ${row.model}.handlesFutureDatedLegislation`,
      errors,
    );
    validateEnum(
      row.updateCadence,
      UPDATE_CADENCE_VALUES,
      `freshness.yaml: ${row.model}.updateCadence`,
      errors,
    );
    validateRequiredSources(row.sources, `freshness.yaml: ${row.model}`, errors);
  }
  // Sibling references must resolve to known models and be bidirectional.
  for (const m of models) {
    validateEnum(
      m.type,
      MODEL_TYPE_VALUES,
      `models.yaml: ${m.id}.type`,
      errors,
    );
    validateEnum(
      m.sector,
      MODEL_SECTOR_VALUES,
      `models.yaml: ${m.id}.sector`,
      errors,
    );
    validateEnum(
      m.codePublic,
      TRISTATE_VALUES,
      `models.yaml: ${m.id}.codePublic`,
      errors,
    );
    for (const [capability, value] of Object.entries(m.capabilities)) {
      validateEnum(
        value,
        TRISTATE_VALUES,
        `models.yaml: ${m.id}.capabilities.${capability}`,
        errors,
      );
    }
    validateRequiredSources(m.sources, `models.yaml: ${m.id}`, errors);
    for (const sibling of m.siblings ?? []) {
      if (!modelIds.has(sibling)) {
        errors.push(
          `models.yaml: ${m.id} lists unknown sibling "${sibling}"`,
        );
        continue;
      }
      const other = models.find((x) => x.id === sibling);
      if (!other?.siblings?.includes(m.id)) {
        errors.push(
          `models.yaml: sibling link ${m.id} -> ${sibling} is not bidirectional`,
        );
      }
    }
  }
  for (const p of programs) {
    validateEnum(
      p.type,
      PROGRAM_TYPE_VALUES,
      `programs.yaml: ${p.id}.type`,
      errors,
    );
    validateRequiredSources(p.sources, `programs.yaml: ${p.id}`, errors);
  }

  if (errors.length > 0) {
    throw new Error(
      `Comparison data referential integrity errors:\n${errors.join('\n')}`,
    );
  }

  return {
    models,
    programs,
    concepts,
    coverage,
    transparency,
    usage,
    accuracy,
    imputations,
    behavioralParameters,
    modeling,
    artifacts,
    freshness,
  };
}

export function conceptById(
  data: ComparisonData,
  id: string,
): Concept | undefined {
  return data.concepts.find((c) => c.id === id);
}

/**
 * Behavioral parameter rows grouped by domain for side-by-side comparison.
 */
export function behavioralParametersByDomain(
  data: ComparisonData,
): Array<{
  domain: string;
  rows: BehavioralParameter[];
}> {
  const modelIds = new Set(data.models.map((m) => m.id));
  const orderedDomains = [
    'labor-supply',
    'taxable-income',
    'capital-gains',
    'take-up',
    'health-insurance',
    'retirement',
    'saving',
    'tax-incidence',
    'macro',
    'tariff',
    'financial-transactions',
    'other',
  ];
  return orderedDomains
    .map((domain) => ({
      domain,
      rows: data.behavioralParameters.filter(
        (row) => row.domain === domain && modelIds.has(row.model),
      ),
    }))
    .filter((group) => group.rows.length > 0);
}

/**
 * Imputation rows grouped by concept id, preserving concept order from
 * concepts.yaml. Used by the methods view to render side-by-side model
 * comparisons.
 */
export function imputationsByConcept(
  data: ComparisonData,
): Array<{ concept: Concept; rows: Imputation[] }> {
  return data.concepts
    .map((concept) => ({
      concept,
      rows: data.imputations.filter((i) => i.concept === concept.id),
    }))
    .filter((g) => g.rows.length > 0);
}

/**
 * Modeling-mechanics rows grouped by model, filtered to the selected model set.
 */
export function modelingByModel(
  data: ComparisonData,
): Array<{ model: Model; rows: ModelingMechanic[] }> {
  return data.models
    .map((model) => ({
      model,
      rows: data.modeling.filter((row) => row.model === model.id),
    }))
    .filter((group) => group.rows.length > 0);
}

/** Convenience: model lookup by id. */
export function modelById(data: ComparisonData, id: string): Model | undefined {
  return data.models.find((m) => m.id === id);
}

/** Convenience: program lookup by id. */
export function programById(
  data: ComparisonData,
  id: string,
): Program | undefined {
  return data.programs.find((p) => p.id === id);
}

/**
 * Programs that have at least one explicit coverage row for the currently
 * selected model set. This keeps country/model filters from rendering a grid
 * of all-unknown cells for models whose coverage has not been catalogued yet.
 */
export function programsWithCoverageForModels(
  data: ComparisonData,
): Program[] {
  const modelIds = new Set(data.models.map((m) => m.id));
  const coveredProgramIds = new Set(
    data.coverage
      .filter((row) => modelIds.has(row.model))
      .map((row) => row.program),
  );
  return data.programs.filter((p) => coveredProgramIds.has(p.id));
}

/** Coverage rows grouped by program for the matrix view. */
export function coverageByProgram(
  data: ComparisonData,
): Map<string, Map<string, Coverage>> {
  const map = new Map<string, Map<string, Coverage>>();
  for (const row of data.coverage) {
    let inner = map.get(row.program);
    if (!inner) {
      inner = new Map();
      map.set(row.program, inner);
    }
    inner.set(row.model, row);
  }
  return map;
}
