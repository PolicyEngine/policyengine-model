import { colors, spacing } from '../../designTokens';
import { CoverageBadge } from './StatusBadge';
import {
  coverageByProgram,
  programsWithCoverageForModels,
} from '../../data/comparisons';
import { SourceList } from './SourceList';
import YearFilter from './YearFilter';
import {
  tableWrapperStyle,
  tableStyle,
  thStyle,
  tdStyle,
  subTextStyle,
  h2Style,
  proseStyle,
  sectionStyle,
  stickyFirstColThStyle,
  stickyFirstColTdStyle,
} from './comparisonStyles';
import {
  isPolicyEngineModel,
  hostCellStyle,
  hostHeaderBackground,
  ThisModelChip,
} from './hostHighlight';
import type { ComparisonData } from '../../types/comparison';
import type { StateImplementation } from '../../types/Program';

export interface CoverageMatrixOverlay {
  /** Per-program state implementations (PolicyEngine US has these). */
  stateImplementations?: Map<string, StateImplementation[]>;
  /** Per-program verified-years string (e.g. "2022-2026" or "2022+"). */
  verifiedYears?: Map<string, string>;
  /** Years that appear across the overlay, for the year-filter chip bar. */
  availableYears?: number[];
}

const MAX_FORWARD_YEAR = new Date().getFullYear() + 5;

function parseYearRange(verifiedYears?: string): Set<number> {
  if (!verifiedYears) return new Set();
  const trimmed = verifiedYears.trim();
  const openMatch = trimmed.match(/^(\d{4})\+$/);
  if (openMatch) {
    const start = parseInt(openMatch[1], 10);
    const years = new Set<number>();
    for (let y = start; y <= MAX_FORWARD_YEAR; y++) years.add(y);
    return years;
  }
  const rangeMatch = trimmed.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    const years = new Set<number>();
    for (let y = start; y <= end; y++) years.add(y);
    return years;
  }
  const singleMatch = trimmed.match(/^(\d{4})$/);
  if (singleMatch) return new Set([parseInt(singleMatch[1], 10)]);
  return new Set();
}

const STATE_COLOR: Record<string, string> = {
  complete: '#2C7A7B',
  partial: '#4FD1C5',
  inProgress: '#94A3B8',
  notStarted: '#E2E8F0',
};

export default function CoverageMatrix({
  data,
  overlay,
  selectedYear,
}: {
  data: ComparisonData;
  overlay?: CoverageMatrixOverlay;
  selectedYear?: number;
}) {
  const matrix = coverageByProgram(data);

  // Programs in display order; keep only programs with at least one explicit
  // coverage row for the selected model set. If a year filter is on and we
  // have per-program verifiedYears, drop programs that don't include the year.
  const orderedPrograms = programsWithCoverageForModels(data).filter((p) => {
    if (!selectedYear || !overlay?.verifiedYears) return true;
    const range = parseYearRange(overlay.verifiedYears.get(p.id));
    return range.size === 0 || range.has(selectedYear);
  });

  return (
    <div>
      {overlay?.availableYears && overlay.availableYears.length > 0 && (
        <YearFilter years={overlay.availableYears} />
      )}

      <section style={sectionStyle}>
        {orderedPrograms.length === 0 ? (
          <p style={proseStyle}>
            No explicit coverage rows have been catalogued for the selected
            model set yet.
          </p>
        ) : (
          <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, ...stickyFirstColThStyle, minWidth: 220 }}>
                  Program
                </th>
                <th style={thStyle}>Jurisdiction</th>
                {data.models.map((m) => {
                  const isHost = isPolicyEngineModel(m.id);
                  return (
                    <th
                      key={m.id}
                      style={
                        isHost
                          ? { ...thStyle, backgroundColor: hostHeaderBackground }
                          : thStyle
                      }
                    >
                      {m.name}
                      {isHost && (
                        <div style={{ marginTop: 4 }}>
                          <ThisModelChip />
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {orderedPrograms.map((p) => {
                const states = overlay?.stateImplementations?.get(p.id);
                const verifiedYears = overlay?.verifiedYears?.get(p.id);
                return (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, ...stickyFirstColTdStyle }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.statute && <div style={subTextStyle}>{p.statute}</div>}
                      {verifiedYears && (
                        <div style={subTextStyle}>verified {verifiedYears}</div>
                      )}
                      {states && states.length > 0 && (
                        <details
                          style={{ marginTop: 6, fontSize: 11 }}
                        >
                          <summary
                            style={{
                              cursor: 'pointer',
                              color: colors.primary[600],
                            }}
                          >
                            {states.filter((s) => s.status === 'complete').length}/
                            {states.length} states
                          </summary>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
                              gap: 3,
                              marginTop: 6,
                              maxWidth: 480,
                            }}
                          >
                            {states.map((s) => (
                              <span
                                key={s.state}
                                title={`${s.state}: ${s.status}${s.notes ? ' — ' + s.notes : ''}`}
                                style={{
                                  padding: '2px 4px',
                                  borderRadius: 3,
                                  backgroundColor: STATE_COLOR[s.status] ?? STATE_COLOR.notStarted,
                                  color:
                                    s.status === 'notStarted'
                                      ? colors.text.tertiary
                                      : colors.white,
                                  textAlign: 'center',
                                  fontSize: 10,
                                  fontWeight: 600,
                                }}
                              >
                                {s.state}
                              </span>
                            ))}
                          </div>
                        </details>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={subTextStyle}>{p.jurisdiction}</span>
                    </td>
                    {data.models.map((m) => {
                      const cell = matrix.get(p.id)?.get(m.id);
                      const cellStyle = isPolicyEngineModel(m.id)
                        ? { ...tdStyle, ...hostCellStyle }
                        : tdStyle;
                      if (!cell) {
                        return (
                          <td key={m.id} style={cellStyle}>
                            <CoverageBadge status="unknown" />
                          </td>
                        );
                      }
                      return (
                        <td key={m.id} style={cellStyle}>
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
                          {cell.notes && (
                            <div style={{ ...subTextStyle, marginTop: 4 }}>
                              {cell.notes}
                            </div>
                          )}
                          {cell.sources.length > 0 && (
                            <details style={{ marginTop: 4 }}>
                              <summary
                                style={{
                                  cursor: 'pointer',
                                  color: colors.primary[600],
                                  fontSize: 11,
                                }}
                              >
                                sources
                              </summary>
                              <SourceList sources={cell.sources} compact />
                            </details>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
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
