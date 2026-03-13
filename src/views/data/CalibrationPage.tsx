import { useState, useMemo } from 'react';
import { colors, typography, spacing } from '../../designTokens';
import usCalibrationTargets from '../../data/calibrationTargets.json';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/layout/SearchInput';
import type { Country } from '../../hooks/useCountry';

interface CalibrationRow {
  variable: string;
  domain: string | null;
  geoLevels: string[];
  nationalValue: number | null;
  nationalCount: number;
  stateCount: number;
  districtCount: number;
  source: string;
  period: number;
}

function formatValue(val: number | null): string {
  if (val === null || val === undefined) return '—';
  const abs = Math.abs(val);
  if (abs >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
  return val.toLocaleString();
}

function formatVariable(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const geoLevelColors: Record<string, { bg: string; text: string }> = {
  national: { bg: '#dbeafe', text: '#1e40af' },
  state: { bg: '#dcfce7', text: '#166534' },
  district: { bg: '#fef3c7', text: '#92400e' },
};

const geoLevelLabels: Record<string, string> = {
  national: 'National',
  state: 'State',
  district: 'CD',
};

export default function CalibrationPage({ country }: { country: Country }) {
  const [search, setSearch] = useState('');

  const allTargets: CalibrationRow[] = country === 'us'
    ? (usCalibrationTargets as CalibrationRow[])
    : [];

  const filtered = useMemo(() => {
    if (!search) return allTargets;
    const q = search.toLowerCase();
    return allTargets.filter(
      (t) =>
        t.variable.toLowerCase().includes(q) ||
        (t.domain && t.domain.toLowerCase().includes(q)) ||
        t.source.toLowerCase().includes(q) ||
        t.geoLevels.some((g) => g.toLowerCase().includes(q)),
    );
  }, [allTargets, search]);

  const targetCount = allTargets.reduce(
    (sum, t) => sum + t.nationalCount + t.stateCount + t.districtCount,
    0,
  );

  if (country !== 'us') {
    return (
      <div>
        <PageHeader
          category="Data"
          title="Calibration targets"
          description="Calibration target details are currently available for the US model only."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        category="Data"
        title="Calibration targets"
        description={`PolicyEngine calibrates household survey weights using L0-regularized optimization so that weighted aggregates match ${targetCount.toLocaleString()} administrative targets from IRS, CBO, Census, CMS, and other agencies across national, state, and congressional district levels.`}
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Search variables, domains, sources..." />

      <p style={{
        fontSize: typography.fontSize.xs,
        color: colors.text.tertiary,
        marginBottom: spacing.md,
        marginTop: `-${spacing.sm}`,
      }}>
        {filtered.length} unique target{filtered.length !== 1 ? 's' : ''} shown
        {search ? ` (filtered from ${allTargets.length})` : ''}
      </p>

      {filtered.length === 0 ? (
        <p style={{ color: colors.text.tertiary }}>No calibration targets found.</p>
      ) : (
        <div
          style={{
            borderRadius: spacing.radius.xl,
            border: `1px solid ${colors.border.light}`,
            overflow: 'hidden',
            boxShadow: spacing.shadow.sm,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: typography.fontFamily.primary,
            }}
          >
            <thead>
              <tr>
                {[
                  { label: 'Variable', width: '25%' },
                  { label: 'Domain', width: '25%' },
                  { label: 'Geographic Levels', width: '25%' },
                  { label: 'National Target', width: '13%' },
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
              {filtered.map((t, i) => (
                <tr
                  key={`${t.variable}-${t.domain}-${i}`}
                  style={{
                    borderBottom:
                      i < filtered.length - 1
                        ? `1px solid ${colors.border.light}`
                        : 'none',
                  }}
                >
                  <td
                    style={{
                      padding: `${spacing.sm} ${spacing.lg}`,
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                    }}
                  >
                    {formatVariable(t.variable)}
                  </td>
                  <td
                    style={{
                      padding: `${spacing.sm} ${spacing.lg}`,
                      fontSize: typography.fontSize.sm,
                      color: t.domain ? colors.text.primary : colors.text.tertiary,
                      fontFamily: typography.fontFamily.mono,
                    }}
                  >
                    {t.domain ? formatVariable(t.domain) : '—'}
                  </td>
                  <td
                    style={{
                      padding: `${spacing.sm} ${spacing.lg}`,
                      fontSize: typography.fontSize.xs,
                    }}
                  >
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {['national', 'state', 'district'].filter((l) => t.geoLevels.includes(l)).map((level) => {
                        const style = geoLevelColors[level] || { bg: '#f3f4f6', text: '#374151' };
                        const count = level === 'national' ? t.nationalCount
                          : level === 'state' ? t.stateCount
                          : t.districtCount;
                        return (
                          <span
                            key={level}
                            style={{
                              display: 'inline-block',
                              padding: '1px 8px',
                              borderRadius: '9999px',
                              backgroundColor: style.bg,
                              color: style.text,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.medium,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {geoLevelLabels[level] || level}
                            {count > 1 ? ` (${count})` : ''}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: `${spacing.sm} ${spacing.lg}`,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.primary,
                      fontFamily: typography.fontFamily.mono,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatValue(t.nationalValue)}
                  </td>
                  <td
                    style={{
                      padding: `${spacing.sm} ${spacing.lg}`,
                      fontSize: typography.fontSize.xs,
                      color: colors.text.secondary,
                    }}
                  >
                    {t.source}
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
