import PageHeader from '../layout/PageHeader';
import { colors, spacing } from '../../designTokens';
import { TristateBadge } from './StatusBadge';
import { SourceList } from './SourceList';
import {
  tableWrapperStyle,
  tableStyle,
  thStyle,
  tdStyle,
  subTextStyle,
  h2Style,
  sectionStyle,
} from './comparisonStyles';
import type { ComparisonData, ArtifactType } from '../../types/comparison';

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  codebase: 'Codebase',
  'parameter-database': 'Parameter database',
  dataset: 'Dataset',
  api: 'API',
  'web-application': 'Web app',
  'documentation-site': 'Documentation',
  paper: 'Paper / report',
  cli: 'CLI / package',
};

export default function ArtifactsTable({ data }: { data: ComparisonData }) {
  return (
    <div>
      <PageHeader
        category="Comparison"
        title="Artifacts"
        description="Concrete deliverables produced by each model: source code, datasets, parameter databases, public APIs, web applications, documentation sites, and papers. An artifact is anything an outside reader can verify exists."
      />

      {data.models.map((model) => {
        const artifacts = data.artifacts.filter((a) => a.model === model.id);
        if (artifacts.length === 0) return null;
        return (
          <section key={model.id} style={sectionStyle}>
            <h2 style={h2Style}>{model.name}</h2>
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, minWidth: 180 }}>Type</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Public</th>
                    <th style={thStyle}>License</th>
                    <th style={thStyle}>Link</th>
                    <th style={thStyle}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {artifacts.map((a, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>
                        <span style={subTextStyle}>{ARTIFACT_TYPE_LABELS[a.type]}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{a.name}</div>
                      </td>
                      <td style={tdStyle}>
                        <TristateBadge value={a.public} />
                      </td>
                      <td style={tdStyle}>{a.license}</td>
                      <td style={tdStyle}>
                        {a.url ? (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: colors.primary[600], textDecoration: 'none' }}
                          >
                            {(() => {
                              try {
                                return `${new URL(a.url).host} ↗`;
                              } catch {
                                return a.url;
                              }
                            })()}
                          </a>
                        ) : (
                          <span style={subTextStyle}>—</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 13, maxWidth: 380 }}>
                        {a.description ?? '—'}
                        <div style={{ marginTop: spacing.sm }}>
                          <SourceList sources={a.sources} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
