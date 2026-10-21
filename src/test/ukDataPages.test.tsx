import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import release from '../data/ukDataRelease.json';
import { ukPipelineIntro, ukPipelineStages, ukBranchLabels, runtimeShortfall } from '../data/ukPipelineStages';
import { fmtInt, fmtPct, fmtTarget } from '../data/ukDataRelease';
import { UK_MODEL_VERSION } from '../data/ukBehaviouralResponses';

vi.mock('next/navigation', () => ({
  usePathname: () => '/uk/model/data/pipeline',
  useSearchParams: () => new URLSearchParams(),
}));

import DataPipeline from '../components/data/DataPipeline';

/** Every string the UK pipeline can show, across all stages and expanders. */
function allPipelineText(): string {
  const parts: string[] = [ukPipelineIntro, ukBranchLabels.national, ukBranchLabels.local];
  for (const s of ukPipelineStages) {
    parts.push(s.title, s.subtitle, s.description, s.inputSize ?? '', s.outputSize ?? '', ...(s.dataSources ?? []), ...s.details);
    for (const i of s.imputations ?? []) parts.push(i.name, i.source, i.method);
    for (const t of s.calibrationTargets ?? []) parts.push(t.variable, t.target, t.source);
  }
  return parts.join('\n');
}

// Claims the UK pages made before policyengine.py pinned policyengine-uk-data
// 1.58.0, or that never applied to the UK.
const STALE_UK_PHRASES = [
  /FRS\)? 2023-24/,
  /~20,000/,
  /Round 7/,
  /LCFS 2021-22|Living Costs and Food Survey 2021-22/,
  /SPI 2020-21|2020-21 SPI/,
  /1\.3x/,
  /\b78%|\b58%/,
  /PyTorch/,
  /Constituency \(national\)/,
  /~60,000|~30,000/,
  /zero-weight copy \(10,000/,
  /TAXSIM|CBO|federal|congressional/i,
  /certified/i,
  // Corrected by the 2026-10-14 fact-check of the 1.58.0 pages.
  /pension wealth/,
  /each trains on 100,000/,
  /below the repayment threshold/,
  /bus subsidy to £3\.0bn/,
  /beyond the 95th/,
  /in proportion to population within its survey region/,
  /Census 2021 and 2022/,
  /Ofgem’s April 2026/,
  /decides who takes up/,
  /UK-wide targets/,
  /end of calibration/,
];

// Claims the calibration and validation pages made before the same fact-check.
const STALE_DATA_PAGE_PHRASES = [
  /UK-wide targets/,
  /income-related ESA alone|scored against income-related ESA/,
  /Personal Independence Payment spending/,
  /sums the variable that the release’s target registry assigns/,
  /removes it/,
  /up to three years back/,
  /end of calibration/i,
  /Dwellings by tenure, by nation/,
  /certified/i,
];

describe('UK pipeline copy', () => {
  const text = allPipelineText();

  it.each(STALE_UK_PHRASES.map((p) => [p.source, p]))('never says %s', (_, phrase) => {
    expect(text).not.toMatch(phrase as RegExp);
  });

  it('quotes the pinned release and its counts from the extracted release file', () => {
    expect(ukPipelineIntro).toContain(`policyengine.py ${release.release.policyengine}`);
    expect(ukPipelineIntro).toContain(`${release.release.dataPackage} ${release.release.dataVersion}`);
    expect(text).toContain(`${fmtInt(release.base.households)} households`);
    expect(text).toContain(`${fmtInt(release.enhanced.households)} households`);
    expect(text).toContain(`${fmtInt(release.weightMatrices.constituency.areas)} × ${fmtInt(release.enhanced.households)} weights`);
    expect(text).toContain(`${fmtInt(release.weightMatrices.localAuthority.areas)} × ${fmtInt(release.enhanced.households)} weights`);
    expect(text).toContain(fmtPct(release.calibration.nationalWithin10));
    expect(text).toContain(`${fmtInt(release.enhanced.geography.householdsWithoutArea)} households have none`);
  });

  it('describes one Output Area draw per household when the release used one', () => {
    expect(release.enhanced.geography.outputAreaDrawsPerHousehold).toBe(1);
    expect(text).toContain('the publish run drew 1');
    expect(text).not.toMatch(/10 (clones|geographic variants|Output Areas)/);
  });

  it('accounts for every household in the released file', () => {
    const c = release.enhanced.composition;
    expect(c.frs).toBe(release.base.households);
    expect(c.capitalGainsCopies).toBe(c.frs + c.spiCopies);
    expect(c.frs + c.spiCopies + c.capitalGainsCopies + c.cgtBandDonors).toBe(release.enhanced.households);
    expect(release.weightMatrices.constituency.households).toBe(release.enhanced.households);
    expect(release.weightMatrices.localAuthority.households).toBe(release.enhanced.households);
    const g = release.enhanced.geography;
    expect(g.householdsWithArea + g.householdsWithoutArea).toBe(release.enhanced.households);
  });

  it('states the weight a pinned-model run loses against calibration', () => {
    const calibrated = release.enhanced.weightedHouseholds * release.weightMatrices.columnSumPerSavedWeight;
    expect(runtimeShortfall).toBeCloseTo(1 - release.validation.households / calibrated, 12);
    expect(runtimeShortfall).toBeGreaterThan(0);
    expect(runtimeShortfall).toBeLessThan(0.01);
    expect(text).toContain(`${fmtPct(runtimeShortfall)} fewer`);
  });

  it('describes the behavioural responses of the model version the release pins', () => {
    // A new pin must fail here until someone re-checks the behavioural page
    // against the new policyengine-uk (UK_MODEL_SOURCE=… bun run test).
    expect(UK_MODEL_VERSION).toBe(release.release.modelVersion);
  });

  it('renders the UK intro and branch labels', () => {
    render(<DataPipeline country="uk" />);
    expect(screen.getByText(ukPipelineIntro)).toBeInTheDocument();
    expect(screen.getByText(ukBranchLabels.national)).toBeInTheDocument();
    expect(screen.getByText(ukBranchLabels.local)).toBeInTheDocument();
  });
});

import fc from 'fast-check';
import UkCalibrationPage, { listAreas } from '../views/data/UkCalibrationPage';
import UkValidationPage, { fmtDifference, niClasses, niTotalTarget, obrRows } from '../views/data/UkValidationPage';
import checks from '../data/ukTargetChecks.json';

describe('UK calibration and validation pages', () => {
  it('lists every national and regional target family, with its area and notes, and no US-only text', () => {
    const { container } = render(<UkCalibrationPage />);
    const text = container.textContent ?? '';
    expect(text).toContain(`${release.calibration.nationalTargets} targets in ${release.calibration.nationalGroups.length} families`);
    expect(text).toContain(listAreas(release.calibration.nationalTargetsByArea));
    for (const g of release.calibration.nationalGroups) {
      expect(text).toContain(g.label);
      if (g.note) expect(text).toContain(g.note);
    }
    for (const fam of [...release.calibration.constituency.families, ...release.calibration.localAuthority.families]) {
      if (fam.note) expect(text).toContain(fam.note);
    }
    expect(text).toContain(`epoch ${release.calibration.epoch}`);
    expect(text).not.toMatch(/US model only|congressional|IRS|L0/);
    for (const phrase of STALE_DATA_PAGE_PHRASES) expect(text).not.toMatch(phrase);
    const families = release.calibration.nationalGroups.reduce((n, g) => n + g.targets, 0);
    expect(families).toBe(release.calibration.nationalTargets);
    const byArea = Object.values(release.calibration.nationalTargetsByArea).reduce((n, x) => n + x, 0);
    expect(byArea).toBe(release.calibration.nationalTargets);
  });

  it('flags the misassigned local Universal Credit targets in both calibrations', () => {
    for (const local of [release.calibration.constituency, release.calibration.localAuthority]) {
      const uc = local.families.filter((f) => f.label.startsWith('Universal Credit'));
      expect(uc.length).toBeGreaterThan(0);
      for (const f of uc) expect(f.note).toMatch(/row order/);
    }
  });

  it('shows the pinned run and never claims TAXSIM for the UK', () => {
    const { container } = render(<UkValidationPage />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/TAXSIM|federal|state income tax|filing status/i);
    expect(text).toContain(`policyengine-uk ${release.validation.modelVersion}`);
    expect(text).toContain(fmtPct(release.validation.within10));
    expect(text).toContain(fmtPct(release.validation.within5));
    for (const n of [537, 570, 580, 581, 582, 1996]) expect(text).toContain(`#${n}`);
    for (const phrase of STALE_DATA_PAGE_PHRASES) expect(text).not.toMatch(phrase);
    for (const id of release.validation.revisedTargets) expect(text).toContain(id);
  });

  it('scores the pinned run against the values calibration fitted', () => {
    const fitted = new Map(release.calibration.nationalGroups.map((g) => [g.label, g]));
    for (const r of checks) expect(fitted.has(r.group)).toBe(true);
    const scorable = checks.filter((r) => r.target !== 0);
    const within = scorable.filter((r) => Math.abs(r.estimate / r.target - 1) < 0.1).length / scorable.length;
    expect(within).toBeCloseTo(release.validation.within10, 6);
  });

  it('scores the same targets the release calibrates to', () => {
    expect(checks.length).toBe(release.calibration.nationalTargets);
    expect(release.validation.targets).toBe(checks.length);
    expect(new Set(checks.map((r) => r.id)).size).toBe(checks.length);
    expect(obrRows.length).toBe(checks.filter((r) => r.id.startsWith('obr/') && r.unit === 'gbp').length - 1);
    expect(obrRows.some((r) => r.id === 'obr/ni')).toBe(false);
    expect(obrRows.find((r) => r.id === 'obr/universal_credit')?.label).toMatch(/Great Britain/);
    expect(obrRows.find((r) => r.id === 'obr/state_pension')?.label).toMatch(/Great Britain/);
    expect(obrRows.find((r) => r.id === 'obr/pip')?.label).toMatch(/Disability Living Allowance and PIP/);
  });

  it('compares the three National Insurance classes with their own OBR forecasts, not the mismapped total', () => {
    const get = (id: string) => checks.find((r) => r.id === id)!;
    const classes = ['obr/ni_employee', 'obr/ni_employer', 'obr/ni_self_employed'];
    expect(niClasses.target).toBeCloseTo(classes.reduce((n, id) => n + get(id).target, 0));
    expect(niClasses.estimate).toBeCloseTo(classes.reduce((n, id) => n + get(id).estimate, 0));
    expect(niTotalTarget).toBe(get('obr/ni').target);
    const { container } = render(<UkValidationPage />);
    const text = container.textContent ?? '';
    expect(text).toContain(fmtTarget(niClasses.target, 'gbp'));
    expect(text).toContain(fmtTarget(niClasses.estimate, 'gbp'));
    expect(text).toContain(fmtDifference(niClasses.target, niClasses.estimate));
  });

  it('formats differences with the sign of estimate minus target', () => {
    fc.assert(fc.property(
      fc.double({ min: 1, max: 1e12, noNaN: true }),
      fc.double({ min: 0, max: 1e12, noNaN: true }),
      (target, estimate) => {
        const out = fmtDifference(target, estimate);
        const pct = Number(out.replace('−', '-').replace('%', ''));
        expect(Math.abs(pct - (estimate / target - 1) * 100)).toBeLessThanOrEqual(0.05 + 1e-9);
        if (estimate > target * 1.001) expect(out.startsWith('+')).toBe(true);
        if (estimate < target * 0.999) expect(out.startsWith('−')).toBe(true);
      },
    ));
    expect(fmtDifference(0, 10)).toBe('–');
  });
});
