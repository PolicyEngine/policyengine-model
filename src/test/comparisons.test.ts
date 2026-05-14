import { describe, it, expect } from 'vitest';
import {
  loadComparisonData,
  modelById,
  programById,
  coverageByProgram,
} from '../data/comparisons';
import { sourcesFor, sourceKinds } from '../types/comparison';

describe('comparison data', () => {
  const data = loadComparisonData();

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

  it('every coverage row resolves to a known model and program', () => {
    const modelIds = new Set(data.models.map((m) => m.id));
    const programIds = new Set(data.programs.map((p) => p.id));
    for (const row of data.coverage) {
      expect(modelIds.has(row.model)).toBe(true);
      expect(programIds.has(row.program)).toBe(true);
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
    const allowed = new Set([
      'implemented',
      'partial',
      'not-implemented',
      'out-of-scope',
      'unknown',
    ]);
    for (const row of data.coverage) {
      expect(allowed.has(row.status)).toBe(true);
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
