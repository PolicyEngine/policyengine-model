import { colors, spacing } from '../../designTokens';
import { SourceList } from './SourceList';
import {
  tableWrapperStyle,
  tableStyle,
  thStyle,
  tdStyle,
  subTextStyle,
} from './comparisonStyles';
import { modelById } from '../../data/comparisons';
import type {
  ComparisonData,
  BehavioralParameter,
} from '../../types/comparison';

function domainLabel(domain: string): string {
  return domain
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function fmtBehavioralValue(row: BehavioralParameter): string {
  if (row.status === 'documented-undisclosed') return 'Undisclosed';
  if (row.status === 'not-modeled') return 'Not modeled';
  if (row.status === 'unknown') return 'Unknown';
  if (typeof row.value === 'number') return row.value.toString();
  if (row.value === 'varies') return 'Varies';
  if (
    typeof row.central === 'number' ||
    typeof row.lower === 'number' ||
    typeof row.upper === 'number'
  ) {
    const parts = [
      typeof row.lower === 'number' ? `low ${row.lower}` : null,
      typeof row.central === 'number' ? `central ${row.central}` : null,
      typeof row.upper === 'number' ? `high ${row.upper}` : null,
    ].filter(Boolean);
    return parts.join(' / ');
  }
  return '—';
}

/**
 * One behavioral-rows table grouped by domain. Shared by the
 * `/behavioral` compare view (Elasticities + Other behavioral
 * sections) so the column shape stays consistent across both.
 */
export function BehavioralDomainBlock({
  data,
  groups,
}: {
  data: ComparisonData;
  groups: Array<{
    domain: BehavioralParameter['domain'];
    rows: BehavioralParameter[];
  }>;
}) {
  return (
    <>
      {groups.map(({ domain, rows }) => (
        <div key={domain} style={{ marginTop: spacing['3xl'] }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: colors.primary[800],
              margin: 0,
              marginBottom: spacing.sm,
            }}
          >
            {domainLabel(domain)}
          </h3>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, minWidth: 180 }}>Model</th>
                  <th style={thStyle}>Parameter</th>
                  <th style={thStyle}>Value</th>
                  <th style={thStyle}>Population / scope</th>
                  <th style={thStyle}>Margin / horizon</th>
                  <th style={thStyle}>Notes</th>
                  <th style={thStyle}>Sources</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const model = modelById(data, row.model);
                  return (
                    <tr
                      key={`${row.model}-${row.domain}-${row.parameter}-${idx}`}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>
                          {model?.name ?? row.model}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 280 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {row.label}
                        </div>
                        <code style={{ fontSize: 12 }}>{row.parameter}</code>
                        <div style={{ ...subTextStyle, marginTop: 4 }}>
                          {row.kind} · {row.status}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <strong>{fmtBehavioralValue(row)}</strong>
                        {row.unit && (
                          <div style={{ ...subTextStyle, marginTop: 4 }}>
                            {row.unit}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 260 }}>
                        {row.population ?? '—'}
                        {row.policyScope && (
                          <div style={{ ...subTextStyle, marginTop: 4 }}>
                            {row.policyScope}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 220 }}>
                        {row.margin ?? '—'}
                        {row.horizon && (
                          <div style={{ ...subTextStyle, marginTop: 4 }}>
                            {row.horizon}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 360, fontSize: 13 }}>
                        {row.functionalForm && (
                          <div style={{ marginBottom: spacing.xs }}>
                            {row.functionalForm}
                          </div>
                        )}
                        {row.notes ?? ''}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 260 }}>
                        <SourceList sources={row.sources} compact />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
