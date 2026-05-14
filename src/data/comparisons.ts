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
  Artifact,
  Freshness,
  ComparisonData,
} from '../types/comparison';

const DATA_DIR = path.join(process.cwd(), 'data', 'comparisons');

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
  const artifacts = loadYaml<Artifact[]>('artifacts.yaml', 'artifacts');
  const freshness = loadYaml<Freshness[]>('freshness.yaml', 'freshness');

  const modelIds = new Set(models.map((m) => m.id));
  const programIds = new Set(programs.map((p) => p.id));
  const conceptIds = new Set(concepts.map((c) => c.id));

  const errors: string[] = [];

  for (const row of coverage) {
    if (!modelIds.has(row.model)) {
      errors.push(`coverage.yaml: unknown model "${row.model}"`);
    }
    if (!programIds.has(row.program)) {
      errors.push(`coverage.yaml: unknown program "${row.program}"`);
    }
  }
  for (const row of transparency) {
    if (!modelIds.has(row.model)) {
      errors.push(`transparency.yaml: unknown model "${row.model}"`);
    }
  }
  for (const row of usage) {
    if (!modelIds.has(row.model)) {
      errors.push(`usage.yaml: unknown model "${row.model}"`);
    }
  }
  for (const row of accuracy) {
    if (!modelIds.has(row.model)) {
      errors.push(`accuracy.yaml: unknown model "${row.model}"`);
    }
    if (!programIds.has(row.program)) {
      errors.push(`accuracy.yaml: unknown program "${row.program}"`);
    }
  }
  for (const row of imputations) {
    if (!modelIds.has(row.model)) {
      errors.push(`imputations.yaml: unknown model "${row.model}"`);
    }
    if (!conceptIds.has(row.concept)) {
      errors.push(`imputations.yaml: unknown concept "${row.concept}"`);
    }
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
  }
  for (const row of freshness) {
    if (!modelIds.has(row.model)) {
      errors.push(`freshness.yaml: unknown model "${row.model}"`);
    }
  }
  // Sibling references must resolve to known models and be bidirectional.
  for (const m of models) {
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
