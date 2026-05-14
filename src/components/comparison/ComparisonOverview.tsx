import PageHeader from '../layout/PageHeader';
import { colors, spacing } from '../../designTokens';
import { SourceList } from './SourceList';
import {
  tableWrapperStyle,
  tableStyle,
  thStyle,
  tdStyle,
  subTextStyle,
  h2Style,
  proseStyle,
  sectionStyle,
} from './comparisonStyles';
import type { ComparisonData } from '../../types/comparison';

export default function ComparisonOverview({ data }: { data: ComparisonData }) {
  return (
    <div>
      <PageHeader
        category="Comparison"
        title="Open microsimulation reference"
        description="A structured comparison of US tax and transfer microsimulation models across coverage, transparency, methodology, artifacts, and usage. PolicyEngine maintains this index alongside its own model documentation so contributors and reviewers can audit our choices against the alternatives."
      />

      <section style={sectionStyle}>
        <h2 style={h2Style}>Scope</h2>
        <p style={proseStyle}>
          This reference compares four production microsimulation models maintained for US policy
          analysis. The catalogue can extend to CBO, JCT, OpenFisca, TAXSIM, EUROMOD, and others;
          each row in <code>data/comparisons/*.yaml</code> is the source of truth for one fact.
          When a value is not publicly documented, the row reads <em>unknown</em> rather than a
          guess.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Models in scope</h2>
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Model</th>
                <th style={thStyle}>Organization</th>
                <th style={thStyle}>Since</th>
                <th style={thStyle}>License</th>
                <th style={thStyle}>Code public</th>
                <th style={thStyle}>Primary dataset</th>
                <th style={thStyle}>Sources</th>
              </tr>
            </thead>
            <tbody>
              {data.models.map((m) => (
                <tr key={m.id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div style={subTextStyle}>{m.id}</div>
                  </td>
                  <td style={tdStyle}>
                    {m.organizationUrl ? (
                      <a
                        href={m.organizationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: colors.primary[600], textDecoration: 'none' }}
                      >
                        {m.organization}
                      </a>
                    ) : (
                      m.organization
                    )}
                  </td>
                  <td style={tdStyle}>{m.inceptionYear === 'unknown' ? '—' : m.inceptionYear}</td>
                  <td style={tdStyle}>{m.license}</td>
                  <td style={tdStyle}>{m.codePublic ? 'Yes' : 'No'}</td>
                  <td style={tdStyle}>{m.primaryDataset}</td>
                  <td style={tdStyle}>
                    <SourceList sources={m.sources} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Dimensions</h2>
        <ul
          style={{
            ...proseStyle,
            paddingLeft: spacing['2xl'],
            margin: 0,
          }}
        >
          <li>
            <strong>Coverage</strong> — which programs each model implements, plus statute
            traceability and test coverage.
          </li>
          <li>
            <strong>Freshness</strong> — latest policy year encoded, forward coverage of
            scheduled changes, update cadence, and lag from enactment to implementation.
          </li>
          <li>
            <strong>Transparency</strong> — code license, documentation depth, dataset openness,
            reproducibility.
          </li>
          <li>
            <strong>Methods</strong> — imputations, calibrations, and accuracy benchmarks against
            administrative totals.
          </li>
          <li>
            <strong>Artifacts</strong> — concrete deliverables: codebases, datasets, APIs, web
            apps, papers.
          </li>
          <li>
            <strong>Usage</strong> — citations, government reports, press mentions, organizational
            users (where measurable).
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Editorial notes</h2>
        <p style={proseStyle}>
          PolicyEngine maintains this index. Where evidence is one-sided we say so explicitly:
          three of the four models in this catalogue do not publish source code, so transparency
          comparisons are necessarily based on what is publicly documented. We welcome pull
          requests adding or correcting entries — see{' '}
          <code>data/comparisons/README.md</code> in the repository for contribution conventions.
        </p>
      </section>
    </div>
  );
}
