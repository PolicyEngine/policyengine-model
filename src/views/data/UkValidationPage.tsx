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
  type UkTargetCheck,
} from '../../data/ukDataRelease';
import { DataTable, ExternalLink, PageLink, StatTile, bodyText, cell, issueUrl, sectionHeading } from './ukTables';

const rows = checks as UkTargetCheck[];
const v = uk.validation;
const cal = uk.calibration;

// Rows in multi-target OBR families, named one by one.
const OBR_ROW_LABELS: Record<string, string> = {
  'obr/ni': 'National Insurance receipts, total',
  'obr/ni_employee': 'Employee National Insurance receipts',
  'obr/council_tax': 'Council tax receipts, UK',
  'obr/council_tax_england': 'Council tax receipts, England',
  'obr/council_tax_scotland': 'Council tax receipts, Scotland',
  'obr/council_tax_wales': 'Council tax receipts, Wales',
};

const areaOf = new Map(cal.nationalGroups.map((g) => [g.label, g.geography]));

/** OBR receipts and spending lines, in £, from the March 2026 forecast. */
export const obrRows = rows
  .filter((r) => r.id.startsWith('obr/') && r.unit === 'gbp')
  .map((r) => {
    const label = OBR_ROW_LABELS[r.id] ?? r.group;
    const area = areaOf.get(r.group);
    return { ...r, label: area && area !== 'UK' ? `${label} (${area})` : label };
  })
  .sort((a, b) => b.target - a.target);

/** "+5.2%" / "−12.0%"; a zero target has no relative difference. */
export function fmtDifference(target: number, estimate: number): string {
  if (target === 0) return '–';
  const pct = (estimate / target - 1) * 100;
  return `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`;
}

const KNOWN_ISSUES = [
  {
    repo: 'policyengine-uk-data',
    n: 581,
    text: `The build calibrated the release with policyengine-uk ${uk.release.builtWithModelVersion}; policyengine.py runs it with ${uk.release.modelVersion}. UK-wide fit within 10% falls from ${fmtPct(cal.nationalWithin10)} to ${fmtPct(v.within10)} between the two.`,
  },
  {
    repo: 'policyengine-uk-data',
    n: 537,
    text: 'The total National Insurance target is compared with employee contributions alone.',
  },
  { repo: 'policyengine-uk', n: 1996, text: 'Modelled VAT exceeds OBR receipts.' },
  { repo: 'policyengine-uk-data', n: 570, text: 'Capital gains fall short of HMRC’s totals.' },
  {
    repo: 'policyengine-uk-data',
    n: 580,
    text: 'Northern Ireland households have no Output Area, so Northern Ireland constituencies and local authorities have no households.',
  },
];

/**
 * How the UK default dataset compares with official statistics: the saved
 * file run by the model policyengine.py pins (scripts/run_uk_target_check.py),
 * scored on the release's own UK-wide calibration targets, plus the area
 * targets the build holds out of calibration.
 */
export default function UkValidationPage() {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const scored = v.targets - v.zeroTargets;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.id.toLowerCase().includes(q) || r.group.toLowerCase().includes(q)) : rows;
  }, [search]);

  return (
    <div>
      <PageHeader
        category="Data"
        title="Validation"
        description={
          `PolicyEngine UK checks its default dataset against the official statistics it is calibrated to, using the ` +
          `model version ${f.pin} pins, and against area statistics the build leaves out of calibration. This page ` +
          `publishes every target, misses included.`
        }
      />

      <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.md, marginBottom: spacing['3xl'] }}>
        <StatTile value={fmtPct(v.within10)} label={`of ${fmtInt(scored)} UK-wide targets within 10%, policyengine-uk ${v.modelVersion}`} />
        <StatTile value={fmtPct(v.within5)} label="within 5%" />
        <StatTile value={fmtPct(cal.nationalWithin10)} label={`within 10% at the end of calibration, policyengine-uk ${uk.release.builtWithModelVersion}`} />
        <StatTile value={fmtPct(cal.constituency.heldOut.within10)} label="of held-out constituency targets within 10%" />
      </div>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>The default dataset against its UK-wide targets</h2>
        <p style={bodyText}>
          policyengine-uk {v.modelVersion}, the version {f.pin} pins, runs {uk.release.defaultDataset} from {f.data}{' '}
          for {v.year}-{String(v.year + 1).slice(2)}, and the build’s own code scores the result against the{' '}
          {f.nationalTargets} UK-wide targets the release is calibrated to. {fmtPct(v.within10)} of the{' '}
          {fmtInt(scored)} non-zero targets lie within 10%, and {fmtPct(v.within5)} within 5%. At the end of
          calibration, with policyengine-uk {uk.release.builtWithModelVersion}, the shares were{' '}
          {fmtPct(cal.nationalWithin10)} and {fmtPct(cal.nationalWithin5)}. The run counts {fmtInt(v.people)} people
          in {fmtInt(v.households)} households.
        </p>
        <p style={bodyText}>
          The OBR’s March 2026 Economic and Fiscal Outlook forecasts these receipts and spending lines for 2025-26:
        </p>
        <DataTable head={['Receipts or spending', 'OBR forecast', 'PolicyEngine UK', 'Difference']} minWidth={600}>
          {obrRows.map((r) => (
            <tr key={r.id}>
              <td style={cell('left', { fontWeight: typography.fontWeight.medium })}>{r.label}</td>
              <td style={cell()}>{fmtTarget(r.target, 'gbp')}</td>
              <td style={cell()}>{fmtTarget(r.estimate, 'gbp')}</td>
              <td style={cell()}>{fmtDifference(r.target, r.estimate)}</td>
            </tr>
          ))}
        </DataTable>
      </section>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Fit by target family</h2>
        <p style={bodyText}>
          Share of each family’s targets within 10%, at the end of calibration and with the pinned model. The{' '}
          <PageLink path="/data/calibration">calibration targets</PageLink> page lists each family’s publisher.
        </p>
        <DataTable head={['Target family', 'Targets', 'End of calibration', `policyengine-uk ${v.modelVersion}`]} minWidth={620}>
          {cal.nationalGroups.map((g) => (
            <tr key={`${g.source}-${g.label}`}>
              <td style={cell('left', { fontWeight: typography.fontWeight.medium })}>{g.label}</td>
              <td style={cell()}>{fmtInt(g.targets)}</td>
              <td style={cell()}>{fmtPct(g.within10)}</td>
              <td style={cell()}>{fmtPct(g.pinnedWithin10)}</td>
            </tr>
          ))}
        </DataTable>
      </section>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Held out of calibration</h2>
        <p style={bodyText}>
          The build logs HMRC’s counts of income taxpayers with employment income for each constituency and local
          authority, but does not fit them: HMRC’s counts cover every income taxpayer with pay in the year, including
          people the FRS finds out of work when it interviews them. At the end of calibration,{' '}
          {fmtPct(cal.constituency.heldOut.within10)} of the {f.constituencies} constituency counts and{' '}
          {fmtPct(cal.localAuthority.heldOut.within10)} of the {f.localAuthorities} local authority counts lie within 10%.
        </p>
      </section>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Known issues</h2>
        <ul style={{ ...bodyText, paddingLeft: spacing.xl }}>
          {KNOWN_ISSUES.map((issue) => (
            <li key={`${issue.repo}-${issue.n}`} style={{ marginBottom: spacing.sm }}>
              {issue.text}{' '}
              <ExternalLink href={issueUrl(issue.repo, issue.n)}>{`${issue.repo}#${issue.n}`}</ExternalLink>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 style={sectionHeading}>Every UK-wide target</h2>
        <p style={bodyText}>
          All {fmtInt(rows.length)} targets, with the pinned model’s {v.year}-{String(v.year + 1).slice(2)} estimate.
          Target identifiers match policyengine-uk-data’s target registry.
        </p>
        {showAll ? (
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search targets..." />
            <DataTable head={['Target', 'Value', 'PolicyEngine UK', 'Difference']} minWidth={640}>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={cell('left')}>
                    <div style={{ fontFamily: typography.fontFamily.mono, fontSize: typography.fontSize.xs }}>{r.id}</div>
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{r.group}</div>
                  </td>
                  <td style={cell()}>{fmtTarget(r.target, r.unit)}</td>
                  <td style={cell()}>{fmtTarget(r.estimate, r.unit)}</td>
                  <td style={cell()}>{fmtDifference(r.target, r.estimate)}</td>
                </tr>
              ))}
            </DataTable>
          </>
        ) : (
          <button
            onClick={() => setShowAll(true)}
            className="tw:cursor-pointer"
            style={{
              padding: `${spacing.sm} ${spacing.xl}`,
              borderRadius: spacing.radius.lg,
              border: `1px solid ${colors.primary[300]}`,
              backgroundColor: colors.primary[50],
              color: colors.primary[700],
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              fontFamily: typography.fontFamily.primary,
            }}
          >
            Show all {fmtInt(rows.length)} targets
          </button>
        )}
      </section>
    </div>
  );
}
