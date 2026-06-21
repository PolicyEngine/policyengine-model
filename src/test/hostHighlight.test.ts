import { describe, it, expect } from 'vitest';
import {
  isPolicyEngineModel,
  formatDeviation,
} from '../components/comparison/hostHighlight';

describe('isPolicyEngineModel', () => {
  it('matches both PE country models', () => {
    expect(isPolicyEngineModel('policyengine-us')).toBe(true);
    expect(isPolicyEngineModel('policyengine-uk')).toBe(true);
  });

  it('rejects peer models', () => {
    expect(isPolicyEngineModel('trim3')).toBe(false);
    expect(isPolicyEngineModel('tax-calculator')).toBe(false);
    expect(isPolicyEngineModel('ukmod')).toBe(false);
  });
});

describe('formatDeviation', () => {
  it('formats overshoot with a plus sign', () => {
    expect(formatDeviation(105, 100)).toBe('+5.0% vs target');
  });

  it('formats undershoot with a minus sign', () => {
    expect(formatDeviation(46_800_000_000, 64_100_000_000)).toBe(
      '−27% vs target',
    );
  });

  it('uses one decimal under 10 percent and none above', () => {
    expect(formatDeviation(100.4, 100)).toBe('+0.4% vs target');
    expect(formatDeviation(150, 100)).toBe('+50% vs target');
  });

  it('returns null for unknown or missing predictions', () => {
    expect(formatDeviation('unknown', 100)).toBeNull();
    expect(formatDeviation(undefined, 100)).toBeNull();
    expect(formatDeviation(null, 100)).toBeNull();
  });

  it('returns null when the target is zero', () => {
    expect(formatDeviation(0, 0)).toBeNull();
  });

  it('reports near-exact matches as within 0.1%', () => {
    expect(formatDeviation(12_094_000_000, 12_099_000_000)).toBe(
      'within 0.1% of target',
    );
  });
});
