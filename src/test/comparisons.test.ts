import { describe, it, expect } from 'vitest';
import {
  loadComparisonData,
  modelById,
  programById,
  coverageByProgram,
  programsWithCoverageForModels,
  modelingByModel,
} from '../data/comparisons';
import { sourcesFor, sourceKinds } from '../types/comparison';

describe('comparison data', () => {
  const data = loadComparisonData();
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
  const UPDATE_CADENCE_VALUES = new Set([
    'continuous',
    'quarterly',
    'annual',
    'as-funded',
    'unknown',
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

  it('loads non-empty model and program registries', () => {
    expect(data.models.length).toBeGreaterThanOrEqual(4);
    expect(data.programs.length).toBeGreaterThanOrEqual(15);
  });

  it('has unique model ids', () => {
    const ids = data.models.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique program ids', () => {
    const ids = data.programs.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('UI-rendered enum fields use schema-compatible string values', () => {
    for (const m of data.models) {
      expect(MODEL_TYPE_VALUES.has(m.type)).toBe(true);
      expect(MODEL_SECTOR_VALUES.has(m.sector)).toBe(true);
      expect(TRISTATE_VALUES.has(m.codePublic)).toBe(true);
      for (const value of Object.values(m.capabilities)) {
        expect(TRISTATE_VALUES.has(value)).toBe(true);
      }
      for (const source of m.sources) {
        if (source.kind) expect(SOURCE_KIND_VALUES.has(source.kind)).toBe(true);
      }
    }
    for (const p of data.programs) {
      expect(PROGRAM_TYPE_VALUES.has(p.type)).toBe(true);
    }
    for (const c of data.coverage) {
      expect(COVERAGE_STATUS_VALUES.has(c.status)).toBe(true);
      expect(TRISTATE_VALUES.has(c.statuteTraceable)).toBe(true);
      expect(TEST_COVERAGE_VALUES.has(c.testCoverage)).toBe(true);
      for (const source of c.sources) {
        if (source.kind) expect(SOURCE_KIND_VALUES.has(source.kind)).toBe(true);
      }
    }
    for (const t of data.transparency) {
      expect(TRISTATE_VALUES.has(t.codePublic)).toBe(true);
      expect(TRISTATE_VALUES.has(t.issueTrackerPublic)).toBe(true);
      expect(TRISTATE_VALUES.has(t.documentationPublic)).toBe(true);
      expect(TRISTATE_VALUES.has(t.testSuitePublic)).toBe(true);
      expect(TRISTATE_VALUES.has(t.datasetPublic)).toBe(true);
      expect(TRISTATE_VALUES.has(t.reproducibleBuilds)).toBe(true);
      expect(PARAMETER_SOURCING_VALUES.has(t.parameterSourcing)).toBe(true);
      for (const source of t.sources) {
        if (source.kind) expect(SOURCE_KIND_VALUES.has(source.kind)).toBe(true);
      }
    }
    for (const u of data.usage) {
      for (const source of u.sources) {
        if (source.kind) expect(SOURCE_KIND_VALUES.has(source.kind)).toBe(true);
      }
    }
    for (const a of data.accuracy) {
      if (a.targetSource.kind) {
        expect(SOURCE_KIND_VALUES.has(a.targetSource.kind)).toBe(true);
      }
      if (a.predictedSource?.kind) {
        expect(SOURCE_KIND_VALUES.has(a.predictedSource.kind)).toBe(true);
      }
    }
    for (const i of data.imputations) {
      expect(IMPUTATION_METHOD_VALUES.has(i.method)).toBe(true);
      expect(TRISTATE_VALUES.has(i.reproducible)).toBe(true);
      for (const source of i.sources) {
        if (source.kind) expect(SOURCE_KIND_VALUES.has(source.kind)).toBe(true);
      }
    }
    for (const row of data.modeling) {
      expect(MODELING_MECHANIC_CATEGORY_VALUES.has(row.category)).toBe(true);
      for (const source of row.sources) {
        if (source.kind) expect(SOURCE_KIND_VALUES.has(source.kind)).toBe(true);
      }
    }
    for (const a of data.artifacts) {
      expect(ARTIFACT_TYPE_VALUES.has(a.type)).toBe(true);
      expect(TRISTATE_VALUES.has(a.public)).toBe(true);
      for (const source of a.sources) {
        if (source.kind) expect(SOURCE_KIND_VALUES.has(source.kind)).toBe(true);
      }
    }
    for (const f of data.freshness) {
      expect(TRISTATE_VALUES.has(f.handlesFutureDatedLegislation)).toBe(true);
      expect(UPDATE_CADENCE_VALUES.has(f.updateCadence)).toBe(true);
      for (const source of f.sources) {
        if (source.kind) expect(SOURCE_KIND_VALUES.has(source.kind)).toBe(true);
      }
    }
  });

  it('every coverage row resolves to a known model and program', () => {
    const modelIds = new Set(data.models.map((m) => m.id));
    const programIds = new Set(data.programs.map((p) => p.id));
    for (const row of data.coverage) {
      expect(modelIds.has(row.model)).toBe(true);
      expect(programIds.has(row.program)).toBe(true);
    }
  });

  it('every modeling detail references a known model', () => {
    const modelIds = new Set(data.models.map((m) => m.id));
    for (const row of data.modeling) {
      expect(modelIds.has(row.model)).toBe(true);
    }
  });

  it('every transparency row references a known model', () => {
    const modelIds = new Set(data.models.map((m) => m.id));
    for (const row of data.transparency) {
      expect(modelIds.has(row.model)).toBe(true);
    }
  });

  it('every model has at least one source', () => {
    for (const m of data.models) {
      expect(m.sources.length).toBeGreaterThan(0);
    }
  });

  it('every transparency row has at least one source', () => {
    for (const t of data.transparency) {
      expect(t.sources.length).toBeGreaterThan(0);
    }
  });

  it('every coverage row has at least one source', () => {
    for (const c of data.coverage) {
      expect(c.sources.length).toBeGreaterThan(0);
    }
  });

  it('every model has a transparency row', () => {
    const tModels = new Set(data.transparency.map((t) => t.model));
    for (const m of data.models) {
      expect(tModels.has(m.id)).toBe(true);
    }
  });

  it('every model has a usage row', () => {
    const uModels = new Set(data.usage.map((u) => u.model));
    for (const m of data.models) {
      expect(uModels.has(m.id)).toBe(true);
    }
  });

  it('modelById resolves known ids', () => {
    expect(modelById(data, 'policyengine-us')?.name).toBe('PolicyEngine US');
    expect(modelById(data, 'trim3')?.name).toBe('TRIM3');
    expect(modelById(data, 'attis')?.name).toBe('ATTIS');
    expect(modelById(data, 'tpc-microsim')).toBeDefined();
    expect(modelById(data, 'nonexistent')).toBeUndefined();
  });

  it('programById resolves known ids', () => {
    expect(programById(data, 'us-eitc')?.name).toBe('Earned Income Tax Credit');
    expect(programById(data, 'us-snap')?.name).toBe('SNAP');
    expect(programById(data, 'nonexistent')).toBeUndefined();
  });

  it('coverageByProgram groups correctly', () => {
    const matrix = coverageByProgram(data);
    const eitc = matrix.get('us-eitc');
    expect(eitc).toBeDefined();
    expect(eitc?.get('policyengine-us')?.status).toBe('implemented');
  });

  it('filters coverage programs to rows relevant to selected models', () => {
    const nberOnly = {
      ...data,
      models: data.models.filter((m) => m.id === 'nber-taxsim'),
    };
    expect(programsWithCoverageForModels(nberOnly).map((p) => p.id)).toEqual([
      'us-federal-income-tax',
      'us-payroll-tax',
      'us-eitc',
      'us-ctc',
      'us-cdcc',
      'us-state-income-tax',
    ]);

    const ukOnly = {
      ...data,
      models: data.models.filter((m) => m.country === 'uk'),
    };
    expect(programsWithCoverageForModels(ukOnly).map((p) => p.id)).toContain(
      'uk-income-tax',
    );
  });

  it('every model has at least one modeling-mechanics row', () => {
    const modeledIds = new Set(data.modeling.map((row) => row.model));
    for (const m of data.models) {
      expect(modeledIds.has(m.id)).toBe(true);
    }
  });

  it('modelingByModel groups rows for selected models only', () => {
    const selected = {
      ...data,
      models: data.models.filter((m) =>
        ['nber-taxsim', 'pwbm'].includes(m.id),
      ),
    };
    expect(modelingByModel(selected).map((group) => group.model.id)).toEqual([
      'nber-taxsim',
      'pwbm',
    ]);
  });

  it('every model has at least one artifact', () => {
    const artifactModels = new Set(data.artifacts.map((a) => a.model));
    for (const m of data.models) {
      expect(artifactModels.has(m.id)).toBe(true);
    }
  });

  it('every model has a freshness row', () => {
    const fModels = new Set(data.freshness.map((f) => f.model));
    for (const m of data.models) {
      expect(fModels.has(m.id)).toBe(true);
    }
  });

  it('every freshness row has at least one source', () => {
    for (const f of data.freshness) {
      expect(f.sources.length).toBeGreaterThan(0);
    }
  });

  it('coverage status values are within the allowed set', () => {
    for (const row of data.coverage) {
      expect(COVERAGE_STATUS_VALUES.has(row.status)).toBe(true);
    }
  });

  it('every program has at least one source citation', () => {
    for (const p of data.programs) {
      if (!p.sources || p.sources.length === 0) {
        throw new Error(`programs.yaml: ${p.id} has no sources`);
      }
    }
  });

  it('tax/tariff programs use annualRevenueUsd, not annualOutlaysUsd', () => {
    const revenueOnlyTypes = new Set([
      'income-tax',
      'payroll-tax',
      'property-tax',
      'consumption-tax',
      'tariff',
      'wealth-tax',
    ]);
    for (const p of data.programs) {
      if (revenueOnlyTypes.has(p.type)) {
        expect(p.annualOutlaysUsd).toBeUndefined();
      }
    }
  });

  it('sibling references resolve and are bidirectional', () => {
    const ids = new Set(data.models.map((m) => m.id));
    for (const m of data.models) {
      for (const s of m.siblings ?? []) {
        expect(ids.has(s)).toBe(true);
        const other = data.models.find((x) => x.id === s);
        expect(other?.siblings ?? []).toContain(m.id);
      }
    }
  });

  describe('source corroboration', () => {
    const TRANSPARENCY_FIELDS = [
      'codePublic',
      'codeLicense',
      'documentationPublic',
      'datasetPublic',
    ] as const;

    it('every confident transparency claim has at least one citing source', () => {
      for (const t of data.transparency) {
        for (const field of TRANSPARENCY_FIELDS) {
          const value = t[field];
          if (value === 'unknown' || value === '') continue;
          const cite = sourcesFor(t.sources, field);
          if (cite.length === 0) {
            throw new Error(
              `transparency[${t.model}].${field} = ${value} has no citing source`,
            );
          }
        }
      }
    });

    it('every transparency row exposes >=3 sources spanning >=2 distinct kinds', () => {
      for (const t of data.transparency) {
        expect(t.sources.length).toBeGreaterThanOrEqual(3);
        const kinds = sourceKinds(t.sources);
        kinds.delete('other');
        expect(kinds.size).toBeGreaterThanOrEqual(2);
      }
    });

    it('every model has >=3 sources spanning >=2 distinct kinds', () => {
      for (const m of data.models) {
        expect(m.sources.length).toBeGreaterThanOrEqual(3);
        const kinds = sourceKinds(m.sources);
        kinds.delete('other');
        expect(kinds.size).toBeGreaterThanOrEqual(2);
      }
    });

    it('every freshness row with confident values exposes >=2 sources', () => {
      for (const f of data.freshness) {
        const hasConfident =
          f.latestImplementedYear !== 'unknown' ||
          f.handlesFutureDatedLegislation !== 'unknown' ||
          f.updateCadence !== 'unknown';
        if (hasConfident) {
          expect(f.sources.length).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it('sourcesFor filters by supports field correctly', () => {
      const t = data.transparency.find((x) => x.model === 'trim3');
      expect(t).toBeDefined();
      const codePublicSources = sourcesFor(t!.sources, 'codePublic');
      expect(codePublicSources.length).toBeGreaterThan(0);
      const kinds = sourceKinds(codePublicSources);
      expect(kinds.has('government')).toBe(true);
    });

    it('sourcesFor returns untagged sources for any field', () => {
      const tagged = { label: 'a', supports: ['codePublic'] };
      const untagged = { label: 'b' };
      const result = sourcesFor([tagged, untagged], 'codeLicense');
      expect(result).toContain(untagged);
      expect(result).not.toContain(tagged);
    });
  });
});
