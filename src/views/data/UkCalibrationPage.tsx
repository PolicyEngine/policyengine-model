'use client';

import { useMemo, useState } from 'react';
import { colors, typography, spacing } from '../../designTokens';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/layout/SearchInput';
import checks from '../../data/ukTargetChecks.json';
import {
  ukRelease as uk,
  ukFacts as f,
  fmtInt,
  fmtPct,
  fmtTarget,
  type UkLocalCalibration,
  type UkTargetCheck,
  type UkTargetGroup,
} from '../../data/ukDataRelease';
import { DataTable, ExternalLink, PageLink, StatTile, bodyText, cell, issueUrl, sectionHeading } from './ukTables';

const cal = uk.calibration;
const rows = checks as UkTargetCheck[];

const VINTAGES: Record<string, string> = {
  march_2026: 'March 2026 forecast',
  spring_2026: 'Spring 2026 forecast',
  '2023-24 outturn': '2023-24 outturn',
};

// How many national targets describe each area, in the extractor's order.
const AREA_PHRASES: Record<string, (n: string) => string> = {
  UK: (n) => `${n} for the UK`,
  'Great Britain': (n) => `${n} for Great Britain`,
  'England and Northern Ireland': (n) => `${n} for England and Northern Ireland`,
  England: (n) => `${n} for England`,
  Scotland: (n) => `${n} for Scotland`,
  'Northern Ireland': (n) => `${n} for Northern Ireland`,
  Nation: (n) => `${n} by nation`,
  Region: (n) => `${n} by region`,
};

export function listAreas(byArea: Record<string, number>): string {
  const parts = Object.entries(byArea).map(([area, n]) => (AREA_PHRASES[area] ?? ((x: string) => `${x} for ${area}`))(fmtInt(n)));
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join('');
}

const zeroTargets = rows.filter((r) => r.target === 0);

function groupValue(g: UkTargetGroup): string {
  if (g.value === undefined) return '–';
  return fmtTarget(g.value, g.units[0]);
}

const noteStyle = {
  fontSize: typography.fontSize.xs,
  color: colors.text.tertiary,
  fontWeight: typography.fontWeight.normal,
  marginTop: spacing.xs,
};

function LocalTable({ local, areaName }: { local: UkLocalCalibration; areaName: string }) {
  return (
    <DataTable head={['Target family', 'Source', 'Measures', `${areaName} targets`, 'Within 10%']} minWidth={680}>
      {local.families.map((fam) => (
        <tr key={fam.label}>
          <td style={cell('left', { fontWeight: typography.fontWeight.medium })}>
            {fam.label}
            {fam.heldOut && <div style={noteStyle}>Logged, not fitted</div>}
            {fam.note && <div style={noteStyle}>{fam.note}</div>}
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
 * the build's own, at its last logged epoch.
 */
export default function UkCalibrationPage() {
  const [search, setSearch] = useState('');
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cal.nationalGroups;
    return cal.nationalGroups.filter((g) =>
      [g.label, g.publisher, g.geography, g.note ?? ''].some((field) => field.toLowerCase().includes(q)),
    );
  }, [search]);
  const scored = cal.nationalTargets - cal.nationalZeroTargets;

  return (
    <div>
      <PageHeader
        category="Data"
        title="Calibration targets"
        description={
          `Calibration fits the household weights in ${f.data} to ${f.nationalTargets} targets for ${f.nationalScope}, ` +
          `and to local targets for ${f.constituencies} constituencies and ${f.localAuthorities} local authorities. ` +
          'Most targets are statistics the OBR, HMRC, DWP, ONS and other public bodies publish; some are built from ' +
          'them or set in the build’s code, and the tables say which.'
        }
      />

      <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.md, marginBottom: spacing['3xl'] }}>
        <StatTile value={f.nationalTargets} label="national and regional targets" />
        <StatTile value={fmtInt(cal.constituency.trainingCells)} label={`targets fitted across ${f.constituencies} constituencies`} />
        <StatTile value={fmtInt(cal.localAuthority.trainingCells)} label={`targets fitted across ${f.localAuthorities} local authorities`} />
        <StatTile value={fmtPct(cal.nationalWithin10)} label={`of national and regional targets within 10% at epoch ${cal.epoch}`} />
      </div>

      <p style={bodyText}>
        These figures come from the release’s calibration logs and its target registry. The build runs 512 epochs
        and saves the weights, and logs the fit, every tenth epoch, so the released weights and every fit figure here
        are from epoch {cal.epoch}. A target with no 2025 figure takes the value of its nearest listed year, if that
        year is earlier and within three years: {fmtInt(cal.targetsWithoutYearValue)} of the {f.nationalTargets}{' '}
        national and regional targets do. To see how the saved file does when policyengine.py’s pinned model runs
        it, see <PageLink path="/data/validation">validation</PageLink>.
      </p>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>National and regional targets</h2>
        <p style={bodyText}>
          {f.nationalTargets} targets in {cal.nationalGroups.length} families: {listAreas(cal.nationalTargetsByArea)}.
          At epoch {cal.epoch}, {fmtPct(cal.nationalWithin10)} of the {fmtInt(scored)} non-zero targets lie within 10%
          of their value, and {fmtPct(cal.nationalWithin5)} within 5%. Each target counts once, whatever its size, so
          a share says nothing about how far the misses are; the{' '}
          <PageLink path="/data/validation">validation</PageLink> page gives each OBR line’s gap.
          {zeroTargets.length > 0 &&
            ` Relative error is undefined for a target of zero, so the shares leave out ${zeroTargets
              .map((r) => `${r.id}, in “${r.group}”, where calibration estimates ${fmtTarget(r.calibrationEstimate, r.unit)}`)
              .join(', ')}.`}
        </p>
        <SearchInput value={search} onChange={setSearch} placeholder="Search targets, publishers..." />
        <DataTable head={['Target family', 'Published by', 'Area', 'Targets', '2025 value', 'Within 10%']} minWidth={760}>
          {groups.map((g) => (
            <tr key={`${g.source}-${g.label}`}>
              <td style={cell('left', { fontWeight: typography.fontWeight.medium })}>
                {g.label}
                {g.note && <div style={noteStyle}>{g.note}</div>}
              </td>
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
      </section>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Constituency targets</h2>
        <p style={bodyText}>
          {f.constituencies} constituencies × {cal.constituency.metrics} measures. Calibration gives each constituency
          its own weight for every household in its nation, and fits each constituency’s weights towards its local
          targets while their sum is fitted towards the national and regional targets. It fits{' '}
          {fmtInt(cal.constituency.trainingCells)} non-zero area targets, and {fmtPct(cal.constituency.trainingWithin10)}{' '}
          of them lie within 10% at epoch {cal.epoch}. The other {fmtInt(cal.constituency.structuralZeroCells)} are
          Scottish and Welsh renting targets in constituencies outside those nations, which calibration meets exactly.
          HMRC counts of taxpayers with employment income are logged but not fitted. The build treats the constituency
          targets as figures for the 2010 boundaries and maps them to the 2024 boundaries.
        </p>
        <LocalTable local={cal.constituency} areaName="Constituency" />
      </section>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Local authority targets</h2>
        <p style={bodyText}>
          {f.localAuthorities} local authorities × {cal.localAuthority.metrics} measures, fitted the same way. Calibration
          fits {fmtInt(cal.localAuthority.trainingCells)} area targets, and {fmtPct(cal.localAuthority.trainingWithin10)}{' '}
          of them lie within 10% at epoch {cal.epoch}. {fmtInt(cal.localAuthority.cellsWithoutSource)} area and measure
          pairs still have no figure after the build’s preprocessing, and stay out of the loss. Local authorities
          missing from HMRC’s income table take the average of the others.
        </p>
        <LocalTable local={cal.localAuthority} areaName="Local authority" />
      </section>

      <section>
        <h2 style={sectionHeading}>What the local fit does not show</h2>
        <p style={bodyText}>
          These local fit figures describe the release’s constituency and local authority weight files. When
          policyengine.py analyses a constituency or local authority, it uses the households whose Output Area lies in
          it, at their national weights, not those files, so the figures above do not measure how well such an
          analysis matches the area. The <PageLink path="/data/pipeline">data pipeline</PageLink> page describes how
          households get an Output Area. In this release the build also assigns Universal Credit counts to the wrong
          areas (<ExternalLink href={issueUrl('policyengine-uk-data', 468)}>policyengine-uk-data#468</ExternalLink>),
          so the Universal Credit rows above do not check Universal Credit by area.
        </p>
      </section>
    </div>
  );
}
