'use client';

import { useMemo, useState } from 'react';
import { colors, typography, spacing } from '../../designTokens';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/layout/SearchInput';
import {
  ukRelease as uk,
  ukFacts as f,
  fmtInt,
  fmtPct,
  fmtTarget,
  type UkLocalCalibration,
  type UkTargetGroup,
} from '../../data/ukDataRelease';
import { DataTable, ExternalLink, PageLink, StatTile, bodyText, cell, issueUrl, sectionHeading } from './ukTables';

const cal = uk.calibration;

const VINTAGES: Record<string, string> = {
  march_2026: 'March 2026 forecast',
  spring_2026: 'Spring 2026 forecast',
  '2023-24 outturn': '2023-24 outturn',
};

function groupValue(g: UkTargetGroup): string {
  if (g.value === undefined) return '–';
  return fmtTarget(g.value, g.units[0]);
}

function LocalTable({ local, areaName }: { local: UkLocalCalibration; areaName: string }) {
  return (
    <DataTable head={['Target family', 'Source', 'Measures', `${areaName} targets`, 'Within 10%']} minWidth={680}>
      {local.families.map((fam) => (
        <tr key={fam.label}>
          <td style={cell('left', { fontWeight: typography.fontWeight.medium })}>
            {fam.label}
            {fam.heldOut && (
              <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, fontWeight: typography.fontWeight.normal }}>
                Logged, not fitted
              </div>
            )}
          </td>
          <td style={cell('right', { fontSize: typography.fontSize.xs, color: colors.text.secondary })}>{fam.source}</td>
          <td style={cell()}>{fmtInt(fam.metrics)}</td>
          <td style={cell()}>{fmtInt(fam.cells)}</td>
          <td style={cell()}>{fmtPct(fam.within10)}</td>
        </tr>
      ))}
    </DataTable>
  );
}

/**
 * The targets the UK release is calibrated to, from the release's calibration
 * logs and target registry (scripts/extract_uk_release.py). Fit figures are
 * the final logged epoch of the build's own calibration.
 */
export default function UkCalibrationPage() {
  const [search, setSearch] = useState('');
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cal.nationalGroups;
    return cal.nationalGroups.filter((g) =>
      [g.label, g.publisher, g.geography].some((field) => field.toLowerCase().includes(q)),
    );
  }, [search]);
  const scored = cal.nationalTargets - cal.nationalZeroTargets;

  return (
    <div>
      <PageHeader
        category="Data"
        title="Calibration targets"
        description={
          `Calibration fits the household weights in ${f.data} to ${f.nationalTargets} UK-wide targets for 2025, and ` +
          `to local targets for ${f.constituencies} constituencies and ${f.localAuthorities} local authorities. Each ` +
          'target is a figure published by the OBR, HMRC, DWP, ONS or another public body, or derived from one.'
        }
      />

      <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.md, marginBottom: spacing['3xl'] }}>
        <StatTile value={f.nationalTargets} label="UK-wide targets" />
        <StatTile value={fmtInt(cal.constituency.trainingCells)} label={`Targets across ${f.constituencies} constituencies`} />
        <StatTile value={fmtInt(cal.localAuthority.trainingCells)} label={`Targets across ${f.localAuthorities} local authorities`} />
        <StatTile value={fmtPct(cal.nationalWithin10)} label="of UK-wide targets within 10% at the end of calibration" />
      </div>

      <p style={bodyText}>
        These figures come from the release’s calibration logs, at the last logged epoch ({cal.epoch}), and its
        target registry. A target with no 2025 figure takes the nearest earlier year, up to three years back. To see
        how the saved file does when policyengine.py’s pinned model runs it, see{' '}
        <PageLink path="/data/validation">validation</PageLink>.
      </p>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>UK-wide targets</h2>
        <p style={bodyText}>
          {f.nationalTargets} targets in {cal.nationalGroups.length} families. At the end of calibration,{' '}
          {fmtPct(cal.nationalWithin10)} of the {fmtInt(scored)} non-zero targets lie within 10% of their value, and{' '}
          {fmtPct(cal.nationalWithin5)} within 5%. Relative error is undefined for a target whose value is zero, so the
          shares leave out the {cal.nationalZeroTargets === 1 ? 'one such target' : `${cal.nationalZeroTargets} such targets`}.
        </p>
        <SearchInput value={search} onChange={setSearch} placeholder="Search targets, publishers..." />
        <DataTable head={['Target family', 'Published by', 'Area', 'Targets', '2025 value', 'Within 10%']} minWidth={760}>
          {groups.map((g) => (
            <tr key={`${g.source}-${g.label}`}>
              <td style={cell('left', { fontWeight: typography.fontWeight.medium })}>{g.label}</td>
              <td style={cell('right', { fontSize: typography.fontSize.xs })}>
                {g.urls.length > 0 ? <ExternalLink href={g.urls[0]}>{g.publisher}</ExternalLink> : g.publisher}
                {g.vintages.length > 0 && (
                  <div style={{ color: colors.text.tertiary }}>{g.vintages.map((v) => VINTAGES[v] ?? v).join(', ')}</div>
                )}
              </td>
              <td style={cell()}>{g.geography}</td>
              <td style={cell()}>{fmtInt(g.targets)}</td>
              <td style={cell('right', { whiteSpace: 'nowrap' })}>{groupValue(g)}</td>
              <td style={cell()}>{fmtPct(g.within10)}</td>
            </tr>
          ))}
        </DataTable>
        {groups.length === 0 && <p style={{ color: colors.text.tertiary, marginTop: spacing.md }}>No targets match.</p>}
        <p style={{ ...bodyText, fontSize: typography.fontSize.sm, marginTop: spacing.lg }}>
          The UK-wide National Insurance target compares OBR’s total receipts with employee contributions alone, which
          calibration cannot match;{' '}
          <ExternalLink href={issueUrl('policyengine-uk-data', 537)}>policyengine-uk-data#537</ExternalLink> removes it.
        </p>
      </section>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Constituency targets</h2>
        <p style={bodyText}>
          {f.constituencies} constituencies × {cal.constituency.metrics} measures. Calibration fits{' '}
          {fmtInt(cal.constituency.trainingCells)} non-zero area targets, and {fmtPct(cal.constituency.trainingWithin10)} of
          them lie within 10% at the end. The other {fmtInt(cal.constituency.structuralZeroCells)} are Scottish and Welsh
          renting targets in constituencies outside those nations, which calibration meets exactly. HMRC counts of
          taxpayers with employment income are logged but not fitted.
        </p>
        <LocalTable local={cal.constituency} areaName="Constituency" />
      </section>

      <section>
        <h2 style={sectionHeading}>Local authority targets</h2>
        <p style={bodyText}>
          {f.localAuthorities} local authorities × {cal.localAuthority.metrics} measures. Calibration fits{' '}
          {fmtInt(cal.localAuthority.trainingCells)} area targets, and {fmtPct(cal.localAuthority.trainingWithin10)} of
          them lie within 10% at the end. {fmtInt(cal.localAuthority.cellsWithoutSource)} area and measure pairs have no
          local source and stay out of the loss.
        </p>
        <LocalTable local={cal.localAuthority} areaName="Local authority" />
      </section>
    </div>
  );
}
