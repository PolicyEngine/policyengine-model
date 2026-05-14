import PageHeader from '../layout/PageHeader';
import { colors } from '../../designTokens';
import { TristateBadge } from './StatusBadge';
import { SourceList } from './SourceList';
import {
  tableWrapperStyle,
  tableStyle,
  thStyle,
  tdStyle,
  subTextStyle,
  sectionStyle,
} from './comparisonStyles';
import type { ComparisonData } from '../../types/comparison';

const ROWS: Array<{
  key: string;
  label: string;
  description: string;
  format: 'tristate' | 'text' | 'count';
}> = [
  { key: 'codePublic', label: 'Code public', description: 'Source code available to read.', format: 'tristate' },
  { key: 'codeLicense', label: 'Code license', description: 'License terms.', format: 'text' },
  { key: 'issueTrackerPublic', label: 'Issue tracker public', description: 'Bugs and feature requests visible.', format: 'tristate' },
  { key: 'documentationPublic', label: 'Documentation public', description: 'Methodology documented externally.', format: 'tristate' },
  { key: 'parameterSourcing', label: 'Parameter sourcing', description: 'How parameter values are cited to source law.', format: 'text' },
  { key: 'testSuitePublic', label: 'Test suite public', description: 'Tests visible and runnable.', format: 'tristate' },
  { key: 'datasetPublic', label: 'Dataset public', description: 'Underlying microdataset openly available.', format: 'tristate' },
  { key: 'reproducibleBuilds', label: 'Reproducible builds', description: 'Independent reproduction of model outputs is feasible.', format: 'tristate' },
];

const SOURCING_LABEL: Record<string, string> = {
  'inline-cite': 'Inline citation in parameter file',
  'separate-doc': 'In separate documentation',
  'none': 'No citations',
  'unknown': 'Unknown',
};

export default function TransparencyTable({ data }: { data: ComparisonData }) {
  return (
    <div>
      <PageHeader
        category="Comparison"
        title="Transparency"
        description="How verifiable each model is by an outside party. Public code, public documentation, public data, and a reproducible build pipeline are the four legs of model transparency — they let a reader confirm that what the model says happens is what actually happens."
      />

      <section style={sectionStyle}>
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 240 }}>Dimension</th>
                {data.models.map((m) => (
                  <th key={m.id} style={thStyle}>
                    {m.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{row.label}</div>
                    <div style={subTextStyle}>{row.description}</div>
                  </td>
                  {data.models.map((m) => {
                    const t = data.transparency.find((x) => x.model === m.id);
                    if (!t) {
                      return (
                        <td key={m.id} style={tdStyle}>
                          —
                        </td>
                      );
                    }
                    const value = t[row.key as keyof typeof t];
                    if (row.format === 'tristate') {
                      return (
                        <td key={m.id} style={tdStyle}>
                          <TristateBadge value={value as 'yes' | 'no' | 'partial' | 'unknown'} />
                        </td>
                      );
                    }
                    if (row.key === 'parameterSourcing') {
                      return (
                        <td key={m.id} style={tdStyle}>
                          {SOURCING_LABEL[value as string] ?? String(value)}
                        </td>
                      );
                    }
                    return (
                      <td key={m.id} style={tdStyle}>
                        {String(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Code repository</div>
                </td>
                {data.models.map((m) => {
                  const t = data.transparency.find((x) => x.model === m.id);
                  return (
                    <td key={m.id} style={tdStyle}>
                      {t?.codeUrl ? (
                        <a
                          href={t.codeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: colors.primary[600], textDecoration: 'none' }}
                        >
                          {new URL(t.codeUrl).host} ↗
                        </a>
                      ) : (
                        <span style={subTextStyle}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Documentation</div>
                </td>
                {data.models.map((m) => {
                  const t = data.transparency.find((x) => x.model === m.id);
                  return (
                    <td key={m.id} style={tdStyle}>
                      {t?.documentationUrl ? (
                        <a
                          href={t.documentationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: colors.primary[600], textDecoration: 'none' }}
                        >
                          {new URL(t.documentationUrl).host} ↗
                        </a>
                      ) : (
                        <span style={subTextStyle}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Notes</div>
                </td>
                {data.models.map((m) => {
                  const t = data.transparency.find((x) => x.model === m.id);
                  return (
                    <td key={m.id} style={{ ...tdStyle, fontSize: 12, color: colors.text.secondary }}>
                      {t?.notes ?? '—'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Sources</div>
                </td>
                {data.models.map((m) => {
                  const t = data.transparency.find((x) => x.model === m.id);
                  return (
                    <td key={m.id} style={tdStyle}>
                      <SourceList sources={t?.sources ?? []} />
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
