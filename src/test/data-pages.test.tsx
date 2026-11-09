import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import PipelinePage from '../views/data/PipelinePage';
import CalibrationPage from '../views/data/CalibrationPage';
import { pipelineStages } from '../data/pipelineStages';
import { ukPipelineStages } from '../data/ukPipelineStages';
import {
  administrativeTargetCount,
  describeLevels,
  joinList,
  targetCountsByFamily,
  usCalibration,
} from '../data/calibrationTargets';
import { formatConcept, formatValue, groupLabel } from '../views/data/calibrationFormat';
import CalibrationTargetsTable from '../views/data/CalibrationTargetsTable';
import { usLocalAreaFile, usLocalAreaTargets } from '../data/usLocalAreaFile';

const data = usCalibration;
const LEVELS = ['national', 'state', 'district', 'other'] as const;

// Copy from the local-area pipeline that Microcosm replaced, and words
// PolicyEngine does not use in outward copy.
const STALE_OR_FORBIDDEN = [
  '37,758',
  '488',
  '430 clones',
  'geographic variants',
  'L0-regularized',
  'policy_data.db',
  'policyengine-us-data',
  'Enhanced CPS',
  'certified',
  'Certified',
  // Corrected by the independent review: calibration holds household-weight
  // mass, not population; PUF copies share only the survey state.
  'Total population is held fixed',
  'shares its geography',
  '2024 population estimate',
];

// Microcosm's pre-August name and the dataset Microcosm replaced as the US
// default, as PolicyEngine/ai-inequality's retired-name test spells them. The
// published release ids still carry the old name, so no page may print them.
const RETIRED_NAMES =
  /populace|enhanced[\s_-]*(?:cps|current[\s_-]*population[\s_-]*survey)|\be[\s_-]?cps\b|policyengine[\s_-]*us[\s_-]*data/i;

const stageText = (stages: typeof pipelineStages) => JSON.stringify(stages);

describe('US pipeline stages describe the national and local-area files', () => {
  it('builds shared stages first, then forks into a national and a local-area branch', () => {
    const branches = pipelineStages.map((s) => s.branch);
    const firstBranched = branches.findIndex((b) => b !== 'shared');
    expect(firstBranched).toBeGreaterThan(0);
    expect(branches.slice(firstBranched)).not.toContain('shared');
    expect(branches).toContain('national');
    expect(branches).toContain('local');
  });

  it('has unique stage ids and ends each branch in its own final dataset', () => {
    const ids = pipelineStages.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const finals = pipelineStages.filter((s) => s.isFinalDataset);
    expect(finals.map((s) => s.title)).toEqual(['National file', 'Local-area file']);
    expect(finals[0].branch.startsWith('national')).toBe(true);
    expect(finals[1].branch.startsWith('local')).toBe(true);
    expect(pipelineStages[pipelineStages.length - 1].isFinalDataset).toBe(true);
  });

  it('does not describe the retired pipeline or use forbidden words', () => {
    const text = stageText(pipelineStages);
    for (const phrase of STALE_OR_FORBIDDEN) expect(text).not.toContain(phrase);
  });

  it('prints no retired name and no release id in any stage', () => {
    expect(stageText(pipelineStages)).not.toMatch(RETIRED_NAMES);
    expect(stageText(pipelineStages)).not.toContain(data.releaseId);
    expect(stageText(pipelineStages)).not.toContain(data.calibrationReleaseId);
  });

  it('routes state and district analyses to the local-area file, not a filter on the national file', () => {
    const text = stageText(pipelineStages);
    expect(text).not.toMatch(/no per-area datasets/i);
    expect(text).not.toMatch(/districts are a filter/i);
    const localFile = pipelineStages.find((s) => s.id === 'local-area-file')!;
    expect(localFile.description).toMatch(/state and congressional district analyses on this file/);
  });

  it('quotes the local-area counts from usLocalAreaFile', () => {
    const calibration = pipelineStages.find((s) => s.id === 'local-calibration')!;
    expect(calibration.subtitle).toContain(usLocalAreaTargets.total.toLocaleString());
    expect(calibration.description).toContain(usLocalAreaTargets.state.toLocaleString());
    expect(calibration.description).toContain(usLocalAreaTargets.district.toLocaleString());
    const domainTotal = calibration.calibrationTargets!.reduce(
      (sum, t) => sum + Number(t.target.replace(/[^0-9]/g, '')),
      0,
    );
    expect(domainTotal).toBe(usLocalAreaTargets.total);
    const acs = pipelineStages.find((s) => s.id === 'acs-households')!;
    expect(acs.description).toContain(usLocalAreaFile.acsHouseholds.toLocaleString());
    expect(acs.description).toContain(usLocalAreaFile.nationalHouseholds.toLocaleString());
  });

  it('quotes the release target counts, not hand-typed ones', () => {
    const calibration = pipelineStages.find((s) => s.id === 'calibration')!;
    expect(calibration.description).toContain(data.totalTargets.toLocaleString());
    expect(calibration.description).toContain(data.levelCounts.national.toLocaleString());
    expect(calibration.description).toContain(data.levelCounts.state.toLocaleString());
    const domainTotal = calibration.calibrationTargets!.reduce(
      (sum, t) => sum + Number(t.target.replace(/[^0-9]/g, '')),
      0,
    );
    expect(domainTotal).toBe(data.totalTargets);
  });

  it('UK stages keep their two-matrix fork', () => {
    expect(ukPipelineStages.some((s) => s.branch === 'national')).toBe(true);
    expect(ukPipelineStages.some((s) => s.branch === 'local')).toBe(true);
  });
});

describe('Calibration targets data is internally consistent', () => {
  it('names the release it was generated from and the build that calibrated it', () => {
    expect(data.releaseId).toMatch(/^populace-us-/);
    expect(data.calibrationReleaseId).toMatch(/^populace-us-/);
  });

  it('group target counts sum to the release total', () => {
    expect(data.targets.reduce((sum, r) => sum + r.targetCount, 0)).toBe(data.totalTargets);
  });

  it('per-level counts sum to the release level counts and the total', () => {
    for (const level of LEVELS) {
      const key = `${level}Count` as const;
      expect(data.targets.reduce((s, r) => s + r[key], 0)).toBe(data.levelCounts[level]);
    }
    expect(LEVELS.reduce((s, l) => s + data.levelCounts[l], 0)).toBe(data.totalTargets);
    for (const r of data.targets) {
      expect(r.nationalCount + r.stateCount + r.districtCount + r.otherCount).toBe(r.targetCount);
    }
  });

  it('groups are unique by source table and measured concept', () => {
    const keys = data.targets.map(
      (r) => `${r.sourceFamily}|${r.sourceTable}|${r.measureConcept}|${r.concept}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('within-10% shares are valid fractions', () => {
    expect(data.withinTenPctShare).toBeGreaterThan(0);
    expect(data.withinTenPctShare).toBeLessThanOrEqual(1);
    for (const r of data.targets) {
      expect(r.withinTenPctShare).toBeGreaterThanOrEqual(0);
      expect(r.withinTenPctShare).toBeLessThanOrEqual(1);
    }
  });

  it('family totals cover every target', () => {
    const families = targetCountsByFamily(data);
    expect(families.reduce((s, [, n]) => s + n, 0)).toBe(data.totalTargets);
    expect(administrativeTargetCount(data.levelCounts) + data.levelCounts.other).toBe(data.totalTargets);
  });
});

describe('Target labels', () => {
  it('writes acronyms in capitals and program names as proper nouns', () => {
    expect(formatConcept('aptc_recipients')).toBe('APTC recipients');
    expect(formatConcept('actc_claims')).toBe('ACTC claims');
    expect(formatConcept('ctc_amount')).toBe('CTC amount');
    expect(formatConcept('total_medicaid_chip_enrollment')).toBe('Total Medicaid and CHIP enrollment');
    expect(formatConcept('total_medicaid_enrollment')).toBe('Total Medicaid enrollment');
    expect(formatConcept('taxable_ira_distributions_amount')).toBe('Taxable IRA distributions amount');
    expect(formatConcept('schedule_c_income_amount')).toBe('Schedule C income amount');
    expect(formatConcept('taxable_social_security_amount')).toBe('Taxable Social Security amount');
    expect(formatConcept('partnership_scorp_income_returns')).toBe(
      'Partnership and S corporation income returns',
    );
  });

  it('leaves no lowercase acronym or program name in any label', () => {
    const lowercase = /\b(aptc|actc|ctc|eitc|ira|chip|snap|ssi|tanf|agi|medicaid|medicare|keogh|scorp)\b/;
    for (const r of data.targets) expect(groupLabel(r)).not.toMatch(lowercase);
  });

  it('labels different measured concepts in one table differently', () => {
    const byTable = new Map<string, Set<string>>();
    for (const r of data.targets) {
      const labels = byTable.get(r.sourceTable) ?? new Set<string>();
      expect(labels.has(groupLabel(r))).toBe(false);
      labels.add(groupLabel(r));
      byTable.set(r.sourceTable, labels);
    }
  });

  it('keeps the all-returns and EITC return counts apart', () => {
    const table = 'Historic Table 2 state data, United States total';
    const labels = data.targets.filter((r) => r.sourceTable === table).map(groupLabel).sort();
    expect(labels).toEqual(['EITC returns with three or more qualifying children', 'Returns filed']);
  });

  it('names the population behind restricted IRS figures', () => {
    const agi = data.targets.filter((r) => r.concept === 'adjusted_gross_income').map(groupLabel);
    expect(agi).toContain('Adjusted gross income (itemizing returns)');
    expect(agi).toContain('Adjusted gross income (returns with EITC)');
    expect(agi).toContain('Adjusted gross income (returns excluding dependents)');
    expect(
      groupLabel({
        sourceFamily: 'irs_soi', sourceTable: 'T', concept: 'eitc_returns',
        measureConcept: 'irs_soi.returns_with_total_earned_income_credit',
        domain: 'individual_income_tax_returns_with_earned_income_credit',
      }),
    ).toBe('EITC returns');
  });

  it('shows within-10% shares to one decimal so a miss is visible', () => {
    const statePop = data.targets.find(
      (r) => r.sourceFamily === 'census_pep' && r.stateCount > 0,
    )!;
    expect(statePop.withinTenPctShare).toBeLessThan(1);
    const { container } = render(<CalibrationTargetsTable rows={[statePop]} />);
    expect(container.textContent).toContain('99.9%');
    expect(container.textContent).not.toContain('100%');
  });

  it('gives every group a specific label, never a bare measure name', () => {
    const generic = new Set([
      'Amount', 'Actual amount', 'All funds', 'Amount outstanding', 'Collections', 'Payment amount',
      'Projected amount', 'Recipient count', 'Return count', 'Revenue loss', 'Population',
      'Medicaid enrollment substitution',
    ]);
    for (const r of data.targets) expect(generic.has(groupLabel(r))).toBe(false);
  });

  it('formats dollars and counts differently', () => {
    expect(formatValue(93.8e9, 'usd')).toBe('$93.8B');
    expect(formatValue(22.2e6, 'count')).toBe('22.2M');
    expect(formatValue(null, 'usd')).toBe('—');
  });

  it('joins lists in plain English', () => {
    expect(joinList(['a'])).toBe('a');
    expect(joinList(['a', 'b'])).toBe('a and b');
    expect(joinList(['a', 'b', 'c'])).toBe('a, b, and c');
  });

  it('describes only the levels the release calibrates', () => {
    expect(describeLevels({ national: 447, state: 5211, district: 0, other: 1 })).toBe(
      '447 national and 5,211 state-level targets',
    );
    expect(describeLevels({ national: 1, state: 2, district: 3, other: 0 })).toBe(
      '1 national, 2 state-level, and 3 congressional district targets',
    );
  });
});

describe('Data pages state which file each analysis runs on', () => {
  it('pipeline page intro names both files and quotes the release counts', () => {
    const { container } = render(<PipelinePage country="us" />);
    expect(screen.getByText(/builds the two household files/i)).toBeInTheDocument();
    const text = container.textContent ?? '';
    expect(text).toContain(describeLevels(data.levelCounts));
    expect(text).toContain(usLocalAreaFile.acsHouseholdsRounded);
    expect(text).toMatch(/state and congressional district analyses on the local-area file/);
    for (const phrase of STALE_OR_FORBIDDEN) expect(text).not.toContain(phrase);
    expect(text).not.toMatch(RETIRED_NAMES);
  });

  it('UK pipeline page keeps its constituency and local authority branches', () => {
    const { container } = render(<PipelinePage country="uk" />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/national file/i);
    expect(text).toMatch(/local authorit/i);
  });

  it('calibration page names the package version and the local-area file, but no release id', () => {
    const { container } = render(<CalibrationPage country="us" />);
    const text = container.textContent ?? '';
    expect(text).not.toContain(data.releaseId);
    expect(text).not.toContain(data.calibrationReleaseId);
    expect(text).not.toMatch(RETIRED_NAMES);
    expect(text).toContain(`version ${data.policyenginePackageVersion} of the policyengine Python package`);
    expect(text).toMatch(/state and congressional district analyses on Microcosm’s\s+local-area file/);
    expect(text).toContain(usLocalAreaTargets.total.toLocaleString());
    expect(text).not.toMatch(/filter on this same file/i);
    expect(text).toContain(describeLevels(data.levelCounts));
    for (const phrase of STALE_OR_FORBIDDEN) expect(text).not.toContain(phrase);
    // The Microcosm dashboard prints the old name, so the page does not link it.
    expect(container.querySelector('a[href*="microcosm.institute"]')).toBeNull();
  });
});
