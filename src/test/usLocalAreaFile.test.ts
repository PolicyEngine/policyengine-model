import { describe, it, expect } from 'vitest';
import { usLocalAreaFile, usLocalAreaTargets } from '../data/usLocalAreaFile';

// The figures come from the local-area release's calibration diagnostics and
// gate summary; these checks hold them to the identities those files satisfy.
describe('US local-area file figures add up', () => {
  it('counts every household once: ACS records plus the national file', () => {
    expect(usLocalAreaFile.acsHouseholds + usLocalAreaFile.nationalHouseholds).toBe(usLocalAreaFile.households);
    expect(usLocalAreaFile.people).toBeGreaterThan(usLocalAreaFile.households);
  });

  it('splits the household weight between the two sets of records', () => {
    expect(usLocalAreaFile.acsWeightShare + usLocalAreaFile.nationalWeightShare).toBeCloseTo(1, 12);
    expect(usLocalAreaFile.acsWeightShare).toBeGreaterThan(0);
    expect(usLocalAreaFile.nationalWeightShare).toBeGreaterThan(0);
  });

  it('partitions the targets by geography', () => {
    expect(usLocalAreaTargets.total).toBe(4765);
    expect(usLocalAreaTargets.state + usLocalAreaTargets.district).toBe(usLocalAreaTargets.total);
    expect(usLocalAreaTargets.district).toBe(436);
    expect(usLocalAreaTargets.stateWithinTenPct + usLocalAreaTargets.districtWithinTenPct).toBe(
      usLocalAreaTargets.withinTenPct,
    );
  });

  it('never counts more targets within 10% than exist', () => {
    for (const group of usLocalAreaFile.targetGroups) {
      expect(group.withinTenPct).toBeGreaterThanOrEqual(0);
      expect(group.withinTenPct).toBeLessThanOrEqual(group.count);
    }
  });

  it('matches the release-wide share within 10% (0.9608 in calibration_diagnostics.json)', () => {
    expect(Number((usLocalAreaTargets.withinTenPct / usLocalAreaTargets.total).toFixed(4))).toBe(0.9608);
  });

  it('keeps the effective sample size below the record count', () => {
    expect(usLocalAreaFile.effectiveSampleSize).toBeGreaterThan(0);
    expect(usLocalAreaFile.effectiveSampleSize).toBeLessThan(usLocalAreaFile.households);
  });
});
