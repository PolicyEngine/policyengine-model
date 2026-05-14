import PageHeader from '../layout/PageHeader';
import { colors } from '../../designTokens';
import { SourceList } from './SourceList';
import {
  tableWrapperStyle,
  tableStyle,
  thStyle,
  tdStyle,
  subTextStyle,
  sectionStyle,
} from './comparisonStyles';
import type { ComparisonData, UsageMetric } from '../../types/comparison';

function fmtCount(v: UsageMetric[keyof UsageMetric]): string {
  if (v === 'unknown' || v == null) return '—';
  if (typeof v === 'number') {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toLocaleString();
  }
  return String(v);
}

const ROWS: Array<{ key: keyof UsageMetric; label: string; description: string }> = [
  { key: 'academicCitations', label: 'Academic citations', description: 'Peer-reviewed uses (cumulative).' },
  { key: 'governmentReports', label: 'Government reports', description: 'Federal or state reports relying on the model (past year).' },
  { key: 'pressMentions', label: 'Press mentions', description: 'Major US press mentions (past year).' },
  { key: 'monthlyActiveUsers', label: 'Monthly active users', description: 'Distinct users of any model surface.' },
  { key: 'monthlyComputations', label: 'Monthly computations', description: 'API calls or simulation runs.' },
  { key: 'organizationUsers', label: 'Organization users', description: 'Distinct organizations using the model.' },
];

export default function UsageTable({ data }: { data: ComparisonData }) {
  return (
    <div>
      <PageHeader
        category="Comparison"
        title="Usage"
        description="How widely each model is used: academic citations, government reports, press mentions, and active users. Many cells are 'unknown' because incumbents do not publish usage metrics — we treat that absence as data, not noise."
      />

      <section style={sectionStyle}>
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 240 }}>Signal</th>
                {data.models.map((m) => (
                  <th key={m.id} style={thStyle}>
                    {m.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={String(row.key)}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{row.label}</div>
                    <div style={subTextStyle}>{row.description}</div>
                  </td>
                  {data.models.map((m) => {
                    const u = data.usage.find((x) => x.model === m.id);
                    return (
                      <td key={m.id} style={tdStyle}>
                        {u ? fmtCount(u[row.key]) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Notes</div>
                </td>
                {data.models.map((m) => {
                  const u = data.usage.find((x) => x.model === m.id);
                  return (
                    <td
                      key={m.id}
                      style={{
                        ...tdStyle,
                        fontSize: 12,
                        color: colors.text.secondary,
                        maxWidth: 280,
                      }}
                    >
                      {u?.notes ?? '—'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Sources</div>
                </td>
                {data.models.map((m) => {
                  const u = data.usage.find((x) => x.model === m.id);
                  return (
                    <td key={m.id} style={tdStyle}>
                      <SourceList sources={u?.sources ?? []} />
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

