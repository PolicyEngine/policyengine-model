import PageHeader from '../layout/PageHeader';
import { colors, spacing } from '../../designTokens';
import { CoverageBadge } from './StatusBadge';
import { coverageByProgram } from '../../data/comparisons';
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

export default function CoverageMatrix({ data }: { data: ComparisonData }) {
  const matrix = coverageByProgram(data);

  // Programs in display order: group by jurisdiction then by listing order.
  const orderedPrograms = data.programs;

  return (
    <div>
      <PageHeader
        category="Comparison"
        title="Coverage matrix"
        description="Which tax and transfer programs each model implements. Status reflects whether the program is computed end-to-end (implemented), simulated with simplifications (partial), or absent. Click any model name for its overview."
      />

      <section style={sectionStyle}>
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 220 }}>Program</th>
                <th style={thStyle}>Jurisdiction</th>
                {data.models.map((m) => (
                  <th key={m.id} style={thStyle}>
                    {m.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderedPrograms.map((p) => (
                <tr key={p.id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    {p.statute && <div style={subTextStyle}>{p.statute}</div>}
                  </td>
                  <td style={tdStyle}>
                    <span style={subTextStyle}>{p.jurisdiction}</span>
                  </td>
                  {data.models.map((m) => {
                    const cell = matrix.get(p.id)?.get(m.id);
                    if (!cell) {
                      return (
                        <td key={m.id} style={tdStyle}>
                          <CoverageBadge status="unknown" />
                        </td>
                      );
                    }
                    return (
                      <td key={m.id} style={tdStyle}>
                        <CoverageBadge status={cell.status} />
                        {cell.asOfYear && cell.asOfYear !== 'unknown' && (
                          <div style={subTextStyle}>as of {cell.asOfYear}</div>
                        )}
                        {cell.docsUrl && (
                          <div style={{ ...subTextStyle, marginTop: 4 }}>
                            <a
                              href={cell.docsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: colors.primary[600], textDecoration: 'none' }}
                            >
                              docs ↗
                            </a>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>How to read this</h2>
        <ul style={{ ...proseStyle, paddingLeft: spacing['2xl'] }}>
          <li>
            <strong>Implemented</strong> means rules are computed end-to-end and produce
            household-level outputs. It does not mean perfect — see the methods page for
            calibration and accuracy detail.
          </li>
          <li>
            <strong>Partial</strong> means the program is included in totals but eligibility or
            benefit determination is simplified (e.g. benefit value taken as reported survey
            income rather than computed).
          </li>
          <li>
            <strong>Not modeled</strong> means the program is intentionally out of scope for that
            model — typically because the model is tax-only (TPC) or transfer-only.
          </li>
          <li>
            <strong>Unknown</strong> means we have not yet confirmed status from public
            documentation. Help us fill these in.
          </li>
        </ul>
      </section>
    </div>
  );
}
