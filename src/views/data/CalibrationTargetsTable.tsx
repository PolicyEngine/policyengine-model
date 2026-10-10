import { colors, typography, spacing } from '../../designTokens';
import { formatPercent, type CalibrationGroup } from '../../data/calibrationTargets';
import { formatSourceFamily, formatValue, groupLabel } from './calibrationFormat';

const LEVELS = [
  { key: 'nationalCount', label: 'National', bg: colors.primary[50], text: colors.primary[700] },
  { key: 'stateCount', label: 'State', bg: colors.gray[100], text: colors.gray[700] },
  { key: 'districtCount', label: 'District', bg: colors.secondary[50], text: colors.secondary[700] },
  { key: 'otherCount', label: 'Build-internal', bg: colors.gray[50], text: colors.gray[500] },
] as const;

const COLUMNS = [
  { label: 'Target', width: '30%' },
  { label: 'Source', width: '24%' },
  { label: 'Levels', width: '18%' },
  { label: 'National target value', width: '12%' },
  { label: 'Within 10%', width: '10%' },
  { label: 'Calibration year', width: '6%' },
];

const cell = {
  padding: `${spacing.sm} ${spacing.lg}`,
  fontSize: typography.fontSize.sm,
  color: colors.text.primary,
  verticalAlign: 'top' as const,
};

const mono = {
  ...cell,
  fontFamily: typography.fontFamily.mono,
  whiteSpace: 'nowrap' as const,
};

export default function CalibrationTargetsTable({ rows }: { rows: CalibrationGroup[] }) {
  return (
    <div
      style={{
        borderRadius: spacing.radius.xl,
        border: `1px solid ${colors.border.light}`,
        overflowX: 'auto',
        boxShadow: spacing.shadow.sm,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: typography.fontFamily.primary }}>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
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
          {rows.map((r, i) => (
            <tr
              key={`${r.sourceFamily}-${r.sourceTable}-${r.measureConcept}-${r.concept}`}
              style={{ borderBottom: i < rows.length - 1 ? `1px solid ${colors.border.light}` : 'none' }}
            >
              <td style={{ ...cell, fontWeight: typography.fontWeight.medium }}>{groupLabel(r)}</td>
              <td style={{ ...cell, fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                {r.sourceUrl ? (
                  <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: colors.text.secondary }}>
                    {formatSourceFamily(r.sourceFamily)}
                  </a>
                ) : (
                  formatSourceFamily(r.sourceFamily)
                )}
                <div style={{ color: colors.text.tertiary, marginTop: '2px' }}>{r.sourceTable}</div>
              </td>
              <td style={{ ...cell, fontSize: typography.fontSize.xs }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {LEVELS.filter((level) => r[level.key] > 0).map((level) => (
                    <span
                      key={level.key}
                      style={{
                        display: 'inline-block',
                        padding: '1px 8px',
                        borderRadius: '9999px',
                        backgroundColor: level.bg,
                        color: level.text,
                        fontWeight: typography.fontWeight.medium,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {level.label}
                      {r[level.key] > 1 ? ` (${r[level.key]})` : ''}
                    </span>
                  ))}
                </div>
              </td>
              <td style={mono}>{formatValue(r.nationalValue, r.unit)}</td>
              <td style={mono}>{formatPercent(r.withinTenPctShare)}</td>
              <td style={{ ...cell, fontSize: typography.fontSize.xs, color: colors.text.secondary, whiteSpace: 'nowrap' }}>
                {r.periods.length > 0 ? r.periods.join(', ') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
