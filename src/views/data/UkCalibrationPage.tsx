import { useMemo, useState } from 'react';
import { colors, typography, spacing } from '../../designTokens';
import ukCalibrationTargets from '../../data/ukCalibrationTargets.json';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/layout/SearchInput';

export type UkLevel =
  | 'uk'
  | 'gb'
  | 'englandAndWales'
  | 'nation'
  | 'region'
  | 'constituency'
  | 'localAuthority'
  | 'other';

export interface UkCalibrationRow {
  key: string;
  scope: 'national' | 'local';
  label: string;
  breakdown: string | null;
  geoLevels: UkLevel[];
  nationalCount: number;
  gbCount: number;
  englandAndWalesCount: number;
  nationCount: number;
  regionCount: number;
  constituencyCount: number;
  localAuthorityCount: number;
  otherCount: number;
  nations: string[];
  targetCount: number;
  nationalValue: number | null;
  nationalValueGeography: string | null;
  unit: 'gbp' | 'count' | 'kwh';
  source: string;
  sourceTables: string[];
  period: number | null;
  notes: string[];
  localAreaFileOnly: boolean;
}

interface UkRelease {
  buildId: string;
  dataset: string;
  households: number;
  targets: number;
}

export interface UkCalibrationData {
  policyengineVersion: string;
  modelVersion: string;
  calibrationYear: number;
  releases: { national: UkRelease; localArea: UkRelease };
  totalTargets: { national: number; localArea: number; union: number };
  levelCounts: Record<'national' | 'localArea' | 'union', Record<UkLevel, number>>;
  rows: UkCalibrationRow[];
}

export const ukCalibration = ukCalibrationTargets as UkCalibrationData;

const LEVELS: UkLevel[] = [
  'uk',
  'gb',
  'englandAndWales',
  'nation',
  'region',
  'constituency',
  'localAuthority',
  'other',
];

const COUNT_FIELDS: Record<UkLevel, keyof UkCalibrationRow> = {
  uk: 'nationalCount',
  gb: 'gbCount',
  englandAndWales: 'englandAndWalesCount',
  nation: 'nationCount',
  region: 'regionCount',
  constituency: 'constituencyCount',
  localAuthority: 'localAuthorityCount',
  other: 'otherCount',
};

export const levelLabels: Record<UkLevel, string> = {
  uk: 'UK',
  gb: 'GB',
  englandAndWales: 'England and Wales',
  nation: 'Nation',
  region: 'Region',
  constituency: 'Constituency',
  localAuthority: 'Local authority',
  other: 'Scottish BRMA',
};

// The US page's national / state / district colours, by analogous level.
const levelColors: Record<UkLevel, { bg: string; text: string }> = {
  uk: { bg: '#dbeafe', text: '#1e40af' },
  gb: { bg: '#dbeafe', text: '#1e40af' },
  englandAndWales: { bg: '#dbeafe', text: '#1e40af' },
  nation: { bg: '#dcfce7', text: '#166534' },
  region: { bg: '#dcfce7', text: '#166534' },
  constituency: { bg: '#fef3c7', text: '#92400e' },
  localAuthority: { bg: '#fef3c7', text: '#92400e' },
  other: { bg: '#fef3c7', text: '#92400e' },
};

export function levelCount(row: UkCalibrationRow, level: UkLevel): number {
  return row[COUNT_FIELDS[level]] as number;
}

export function levelBadge(row: UkCalibrationRow, level: UkLevel): string {
  const count = levelCount(row, level);
  // A row whose nation targets are all one nation's names that nation.
  const name = level === 'nation' && row.nations.length === 1 ? row.nations[0] : levelLabels[level];
  return `${name}${count > 1 ? ` (${count.toLocaleString('en-GB')})` : ''}`;
}

export function formatUkValue(value: number | null, unit: UkCalibrationRow['unit']): string {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  if (unit === 'gbp') {
    if (abs >= 1e12) return `£${(value / 1e12).toFixed(2)}tn`;
    if (abs >= 1e9) return `£${(value / 1e9).toFixed(1)}bn`;
    if (abs >= 1e6) return `£${(value / 1e6).toFixed(1)}m`;
    return `£${Math.round(value).toLocaleString('en-GB')}`;
  }
  if (unit === 'kwh') {
    if (abs >= 1e9) return `${(value / 1e9).toFixed(1)} TWh`;
    if (abs >= 1e6) return `${(value / 1e6).toFixed(1)} GWh`;
    return `${Math.round(value).toLocaleString('en-GB')} kWh`;
  }
  return Math.round(value).toLocaleString('en-GB');
}

const n = (x: number) => x.toLocaleString('en-GB');

/** The header sentence, from the extracted release counts. */
export function describeUkTargets(data: UkCalibrationData): string {
  const { national, localArea, union } = data.totalTargets;
  const dense = data.levelCounts.localArea;
  const localCells = dense.constituency + dense.localAuthority + dense.other;
  const denseNational = localArea - localCells;
  const lead =
    `Microcosm UK, the dataset PolicyEngine’s UK model runs on, is reweighted so its weighted totals match ` +
    `published statistics for calendar ${data.calibrationYear}. The national file is calibrated to ` +
    `${n(national)} targets for the UK, Great Britain, England and Wales, the four nations and the English regions.`;
  if (union !== localArea) {
    return `${lead} The local-area file is calibrated to ${n(localArea)} targets, ${n(localCells)} of them for constituencies, local authorities and Scotland’s Broad Rental Market Areas.`;
  }
  const extra = denseNational - national;
  return (
    `${lead} The local-area file is calibrated to all ${n(localArea)} targets: the national ones` +
    `${extra > 0 ? `, ${n(extra)} more above constituency level,` : ''} and ` +
    `${n(localCells)} cells for constituencies, local authorities and Scotland’s Broad Rental Market Areas.`
  );
}

const prose = {
  fontSize: typography.fontSize.base,
  color: colors.text.secondary,
  lineHeight: 1.7,
  marginBottom: spacing.xl,
  maxWidth: '720px',
};

const cell = {
  padding: `${spacing.sm} ${spacing.lg}`,
  verticalAlign: 'top' as const,
};

export default function UkCalibrationPage() {
  const [search, setSearch] = useState('');
  const data = ukCalibration;
  const allRows = data.rows;

  const filtered = useMemo(() => {
    if (!search) return allRows;
    const q = search.toLowerCase();
    return allRows.filter((r) =>
      [
        r.label,
        r.breakdown ?? '',
        r.source,
        ...r.sourceTables,
        ...r.notes,
        ...r.nations,
        ...r.geoLevels.map((l) => levelLabels[l]),
      ].some((s) => s.toLowerCase().includes(q)),
    );
  }, [allRows, search]);

  const { national, localArea } = data.releases;

  return (
    <div>
      <PageHeader category="Data" title="Calibration targets" description={describeUkTargets(data)} />

      <div
        style={{
          padding: `${spacing.md} ${spacing.lg}`,
          borderRadius: spacing.radius.lg,
          border: `1px solid ${colors.border.light}`,
          backgroundColor: colors.gray[50],
          marginBottom: spacing.xl,
          maxWidth: '720px',
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          lineHeight: 1.6,
          overflowWrap: 'anywhere',
        }}
      >
        The targets of the two Microcosm UK releases that version {data.policyengineVersion} of the policyengine
        Python package serves with policyengine-uk {data.modelVersion}: the national file{' '}
        <code style={{ fontFamily: typography.fontFamily.mono }}>{national.buildId}</code> ({n(national.households)}{' '}
        households) and the local-area file{' '}
        <code style={{ fontFamily: typography.fontFamily.mono }}>{localArea.buildId}</code> ({n(localArea.households)}{' '}
        households).
      </div>

      <p style={prose}>
        Every value below is a published official statistic or Microcosm’s transformation of published figures
        (uprating, calendar-year windows of fiscal-year figures, published ratios, or rescaling to a published
        higher-level total); each row’s notes say which. Rows whose source reads “Microcosm derivation from open
        data” are built from open data such as HM Land Registry price-paid records. Rows that list only
        constituencies, local authorities or Scottish Broad Rental Market Areas (BRMAs),
        and rows marked “local-area file only”, calibrate the local-area file alone; a few cells of other rows are
        also calibrated in the local-area file only. How closely each file meets its targets is measured on licensed
        survey microdata, so those figures are available to UK Data Service licence holders only.
      </p>

      <SearchInput value={search} onChange={setSearch} placeholder="Search targets, breakdowns, sources..." />

      <p
        style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.tertiary,
          marginBottom: spacing.md,
          marginTop: `-${spacing.sm}`,
        }}
      >
        {filtered.length} target group{filtered.length !== 1 ? 's' : ''} shown
        {search ? ` (filtered from ${allRows.length})` : ''}
      </p>

      {filtered.length === 0 ? (
        <p style={{ color: colors.text.tertiary }}>No calibration targets found.</p>
      ) : (
        // contain: inline-size keeps the table's width from widening the page
        // on phones; the table scrolls inside this box instead.
        <div
          className="tw:overflow-x-auto tw:[contain:inline-size]"
          style={{
            borderRadius: spacing.radius.xl,
            border: `1px solid ${colors.border.light}`,
            boxShadow: spacing.shadow.sm,
          }}
        >
          <table
            style={{
              width: '100%',
              minWidth: '760px',
              borderCollapse: 'collapse',
              fontFamily: typography.fontFamily.primary,
            }}
          >
            <thead>
              <tr>
                {[
                  { label: 'Target', width: '30%' },
                  { label: 'Breakdown', width: '18%' },
                  { label: 'Geographic levels', width: '22%' },
                  { label: 'Value', width: '13%' },
                  { label: 'Source', width: '17%' },
                ].map((col) => (
                  <th
                    key={col.label}
                    style={{
                      padding: `${spacing.sm} ${spacing.lg}`,
                      textAlign: 'left',
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.secondary,
                      backgroundColor: colors.gray[50],
                      borderBottom: `1px solid ${colors.border.light}`,
                      whiteSpace: 'nowrap',
                      width: col.width,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.key}
                  data-row-key={r.key}
                  style={{
                    borderBottom: i < filtered.length - 1 ? `1px solid ${colors.border.light}` : 'none',
                  }}
                >
                  <td style={cell}>
                    <div
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.text.primary,
                      }}
                    >
                      {r.label}
                    </div>
                    {r.scope === 'national' && r.localAreaFileOnly && (
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.primary[700], marginTop: '2px' }}>
                        Local-area file only
                      </div>
                    )}
                    {r.notes.length > 0 && (
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.tertiary,
                          marginTop: '2px',
                          lineHeight: 1.5,
                        }}
                      >
                        {r.notes.join(' · ')}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      ...cell,
                      fontSize: typography.fontSize.sm,
                      color: r.breakdown ? colors.text.primary : colors.text.tertiary,
                    }}
                  >
                    {r.breakdown ?? '—'}
                  </td>
                  <td style={{ ...cell, fontSize: typography.fontSize.xs }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {LEVELS.filter((l) => r.geoLevels.includes(l)).map((level) => (
                        <span
                          key={level}
                          style={{
                            display: 'inline-block',
                            padding: '1px 8px',
                            borderRadius: '9999px',
                            backgroundColor: levelColors[level].bg,
                            color: levelColors[level].text,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.medium,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {levelBadge(r, level)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td
                    style={{
                      ...cell,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.primary,
                      fontFamily: typography.fontFamily.mono,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatUkValue(r.nationalValue, r.unit)}
                    {r.nationalValue !== null && r.nationalValueGeography && r.nationalValueGeography !== 'United Kingdom' && (
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.tertiary,
                          fontFamily: typography.fontFamily.primary,
                        }}
                      >
                        {r.nationalValueGeography}
                      </div>
                    )}
                  </td>
                  <td
                    title={r.sourceTables.join('\n')}
                    style={{ ...cell, fontSize: typography.fontSize.xs, color: colors.text.secondary }}
                  >
                    {r.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
