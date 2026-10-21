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

// The release scores OBR's total NICs line against employee NICs alone
// (policyengine-uk-data#537), so the table leaves that line out and compares
// the three classes, each with its own OBR forecast, as a sum.
const NI_TOTAL = 'obr/ni';
const NI_CLASSES = ['obr/ni_employee', 'obr/ni_employer', 'obr/ni_self_employed'];
const byId = new Map(rows.map((r) => [r.id, r]));
const sumOf = (key: 'target' | 'estimate') => NI_CLASSES.reduce((sum, id) => sum + (byId.get(id)?.[key] ?? 0), 0);
export const niClasses = { target: sumOf('target'), estimate: sumOf('estimate') };
export const niTotalTarget = byId.get(NI_TOTAL)?.target ?? 0;

/** OBR receipts and spending lines, in £, from the March 2026 forecast. */
export const obrRows = rows
  .filter((r) => r.id.startsWith('obr/') && r.unit === 'gbp' && r.id !== NI_TOTAL)
  .map((r) => {
    const label = OBR_ROW_LABELS[r.id] ?? r.group;
    const area = areaOf.get(r.group);
    return { ...r, label: area && area !== 'UK' && !label.includes(area) ? `${label} (${area})` : label };
  })
  .sort((a, b) => b.target - a.target);

/** "+5.2%" / "−12.0%"; a zero target has no relative difference. */
export function fmtDifference(target: number, estimate: number): string {
  if (target === 0) return '–';
  const pct = (estimate / target - 1) * 100;
  return `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`;
}

// Targets that no household contributes to, so no weighting can meet them.
export const unreachableTargets = rows.filter((r) => r.target !== 0 && r.estimate === 0);

// `after` marks an issue the repository has addressed since the pinned
// release; the release itself still has it.
const KNOWN_ISSUES: { repo: string; n: number; text: string; after?: string }[] = [
  {
    repo: 'policyengine-uk-data',
    n: 581,
    text: `The build calibrated the release with policyengine-uk ${uk.release.builtWithModelVersion}; policyengine.py runs it with ${uk.release.modelVersion}. The share of national and regional targets within 10% falls from ${fmtPct(cal.nationalWithin10)} to ${fmtPct(v.within10)} between the two.`,
  },
  {
    repo: 'policyengine-uk-data',
    n: 537,
    text: 'The total National Insurance target is compared with employee contributions alone.',
    after: 'changed on policyengine-uk-data’s main branch after this release',
  },
  {
    repo: 'policyengine-uk-data',
    n: 582,
    text: 'The OBR’s incapacity benefits line also covers incapacity benefit, severe disablement allowance and the incapacity part of Income Support, which the release’s comparison with ESA leaves out.',
  },
  {
    repo: 'policyengine-uk-data',
    n: 588,
    text: 'The OBR’s DWP benefit lines cover Great Britain, but apart from Universal Credit the release scores them on every UK household, Northern Ireland’s included.',
  },
  {
    repo: 'policyengine-uk-data',
    n: 583,
    text: 'The OBR’s disability line combines Disability Living Allowance and PIP, and the release scores it against PIP alone.',
  },
  {
    repo: 'policyengine-uk-data',
    n: 584,
    text: 'The OBR’s UK council tax line includes Northern Ireland domestic rates and an accruals adjustment, which the model’s council tax leaves out.',
  },
  {
    repo: 'policyengine-uk-data',
    n: 468,
    text: `Both local calibrations assign Universal Credit household counts to areas by row order, which does not match the areas.`,
    after: 'fixed on policyengine-uk-data’s main branch after this release',
  },
  {
    repo: 'policyengine-uk-data',
    n: 538,
    text: `policyengine-uk ${uk.release.modelVersion} uprates the saved weights to ${v.year} by population growth, not by the factor the build used to save them, so a ${v.year} run has ${fmtPct(1 - v.households / (uk.enhanced.weightedHouseholds * uk.weightMatrices.columnSumPerSavedWeight))} fewer households than calibration fitted.`,
  },
  {
    repo: 'policyengine-uk-data',
    n: 587,
    text: 'The Output Area lookup gives every Scottish Output Area the same population, and has no Output Areas for Cumberland, Westmorland and Furness, North Yorkshire or Somerset, so policyengine.py finds no households for those four authorities.',
  },
  {
    repo: 'policyengine-uk-data',
    n: 593,
    text: `${unreachableTargets.length} non-zero targets have no household that contributes to them, among them the £1 million and over income bands and ages 85 to 90, so no weighting can meet them.`,
  },
  {
    repo: 'policyengine-uk',
    n: 1996,
    text: 'Modelled VAT exceeds OBR receipts.',
    after: `addressed in policyengine-uk after ${uk.release.modelVersion}`,
  },
  {
    repo: 'policyengine-uk-data',
    n: 570,
    text: 'Capital gains fall short of HMRC’s totals.',
    after: 'addressed on policyengine-uk-data’s main branch after this release',
  },
  {
    repo: 'policyengine-uk-data',
    n: 580,
    text: 'Northern Ireland households have no Output Area, so analyses of Northern Ireland constituencies and local authorities find no households, although calibration fits those areas’ targets with Northern Ireland households.',
  },
];

/**
 * How the UK default dataset compares with official statistics: the saved
 * file run by the model policyengine.py pins (scripts/run_uk_target_check.py),
 * scored on the release's own national and regional calibration targets, plus the area
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
          `PolicyEngine UK checks its default dataset against the targets it is calibrated to, using the model ` +
          `version ${f.pin} pins, and against area statistics the build leaves out of calibration. This page lists ` +
          `every national and regional target, misses included.`
        }
      />

      <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.md, marginBottom: spacing['3xl'] }}>
        <StatTile value={fmtPct(v.within10)} label={`of ${fmtInt(scored)} national and regional targets within 10%, policyengine-uk ${v.modelVersion}`} />
        <StatTile value={fmtPct(v.within5)} label="within 5%" />
        <StatTile value={fmtPct(cal.nationalWithin10)} label={`within 10% at calibration’s epoch ${cal.epoch}, policyengine-uk ${uk.release.builtWithModelVersion}`} />
        <StatTile value={fmtPct(cal.constituency.heldOut.within10)} label="of held-out constituency targets within 10%" />
      </div>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>The default dataset against its calibration targets</h2>
        <p style={bodyText}>
          policyengine-uk {v.modelVersion}, the version {f.pin} pins, runs {uk.release.defaultDataset} from {f.data}{' '}
          for {v.year}-{String(v.year + 1).slice(2)}, and the build’s own code scores the result against the{' '}
          {f.nationalTargets} national and regional targets the release is calibrated to, at the values calibration
          fitted. {fmtPct(v.within10)} of the {fmtInt(scored)} non-zero targets lie within 10%, and{' '}
          {fmtPct(v.within5)} within 5%. At calibration’s epoch {cal.epoch}, with policyengine-uk{' '}
          {uk.release.builtWithModelVersion} and policyengine-core {uk.release.builtWithCoreVersion}, the shares were{' '}
          {fmtPct(cal.nationalWithin10)} and {fmtPct(cal.nationalWithin5)}; the pinned run uses policyengine-core{' '}
          {v.coreVersion}. The run counts {fmtInt(v.people)} people in {fmtInt(v.households)} households.
        </p>
        <p style={bodyText}>
          These are the targets calibration fitted, so the shares measure how far the fit holds up under the pinned
          model, not accuracy on statistics the build never saw. Each target also counts once, whatever its size.
          {v.revisedTargets.length > 0 &&
            ` When the pinned run rebuilds the targets, ${fmtInt(v.revisedTargets.length)} come out at different values (${v.revisedTargets.join(', ')}); the page keeps the values calibration fitted.`}
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
        <p style={{ ...bodyText, fontSize: typography.fontSize.sm, marginTop: spacing.md }}>
          Each PolicyEngine UK figure follows the release’s scoring for that target, which can sum a different variable
          from the one the line names, or only some nations’ households. The OBR’s lines for DWP benefits cover Great
          Britain; except for Universal Credit, the release scores them on every UK household, Northern Ireland’s
          included. The disability line combines Disability Living
          Allowance and PIP, against modelled PIP alone. The UK council tax line also includes Northern Ireland
          domestic rates and an accruals adjustment, which the model’s council tax leaves out. Fuel duty is the duty
          on households’ car fuel, against all fuel duty receipts.
        </p>
        <p style={{ ...bodyText, fontSize: typography.fontSize.sm }}>
          The OBR forecasts employee, employer and self-employed National Insurance contributions that add to{' '}
          {fmtTarget(niClasses.target, 'gbp')}; PolicyEngine UK’s add to {fmtTarget(niClasses.estimate, 'gbp')}
          {` (${fmtDifference(niClasses.target, niClasses.estimate)})`}. The release scores the OBR’s forecast of
          total receipts, {fmtTarget(niTotalTarget, 'gbp')}, against employee contributions alone (
          <ExternalLink href={issueUrl('policyengine-uk-data', 537)}>policyengine-uk-data#537</ExternalLink>), so the
          table leaves that line out and the fit figures count it as a miss.
        </p>
      </section>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Fit by target family</h2>
        <p style={bodyText}>
          Share of each family’s non-zero targets within 10%, at calibration’s epoch {cal.epoch} and with the pinned
          model. The <PageLink path="/data/calibration">calibration targets</PageLink> page lists each family’s
          source and area.
        </p>
        <DataTable head={['Target family', 'Targets', `Epoch ${cal.epoch}`, `policyengine-uk ${v.modelVersion}`]} minWidth={620}>
          {cal.nationalGroups.map((g) => (
            <tr key={`${g.source}-${g.label}`}>
              <td style={cell('left', { fontWeight: typography.fontWeight.medium })}>
                {g.label}
                {g.note && (
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, fontWeight: typography.fontWeight.normal, marginTop: spacing.xs }}>
                    {g.note}
                  </div>
                )}
              </td>
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
          authority, scaled by the same factor as the local income amounts, but does not fit them. Its code explains
          why: the counts are annual, so they include people with pay for part of the year whom the FRS finds out of
          work at interview, and fitting them would move weight from people out of work to employees. The local
          employment income amounts, and the national counts by income band, are still fitted. At calibration’s
          epoch {cal.epoch}, {fmtPct(cal.constituency.heldOut.within10)} of the {f.constituencies} constituency counts
          and {fmtPct(cal.localAuthority.heldOut.within10)} of the {f.localAuthorities} local authority counts lie
          within 10%. These are the only targets the build holds out.
        </p>
      </section>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Known issues</h2>
        <ul style={{ ...bodyText, paddingLeft: spacing.xl }}>
          {KNOWN_ISSUES.map((issue) => (
            <li key={issue.text} style={{ marginBottom: spacing.sm }}>
              {issue.text}{' '}
              <ExternalLink href={issueUrl(issue.repo, issue.n)}>{`${issue.repo}#${issue.n}`}</ExternalLink>
              {issue.after && ` (${issue.after})`}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 style={sectionHeading}>Every national and regional target</h2>
        <p style={bodyText}>
          All {fmtInt(rows.length)} targets, at the values calibration fitted, with the pinned model’s{' '}
          {v.year}-{String(v.year + 1).slice(2)} estimate from each target’s scoring. Target identifiers match
          policyengine-uk-data’s target registry.
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
