import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import release from '../data/ukDataRelease.json';
import { ukPipelineIntro, ukPipelineStages, ukBranchLabels } from '../data/ukPipelineStages';
import { fmtInt, fmtPct } from '../data/ukDataRelease';

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

  it('renders the UK intro and branch labels', () => {
    render(<DataPipeline country="uk" />);
    expect(screen.getByText(ukPipelineIntro)).toBeInTheDocument();
    expect(screen.getByText(ukBranchLabels.national)).toBeInTheDocument();
    expect(screen.getByText(ukBranchLabels.local)).toBeInTheDocument();
  });
});
