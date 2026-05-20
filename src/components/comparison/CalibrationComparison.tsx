import 'server-only';
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
  proseStyle,
} from './comparisonStyles';
import { modelById, imputationsByConcept } from '../../data/comparisons';
import type { ComparisonData } from '../../types/comparison';

/**
 * Compare-mode view for `/data/calibration`. Renders one sub-table per
 * methodological concept (from `concepts.yaml`), with one row per
 * active model's imputation method for that concept. Rows are ordered
 * so the host PE model appears first within each concept.
 */
export default function CalibrationComparison({
  data,
  activeModelIds,
}: {
  data: ComparisonData;
  activeModelIds: string[];
}) {
  const order = new Map(activeModelIds.map((id, i) => [id, i]));
  const grouped = imputationsByConcept(data).map(({ concept, rows }) => ({
    concept,
    rows: rows.slice().sort(
      (a, b) =>
        (order.get(a.model) ?? Infinity) - (order.get(b.model) ?? Infinity),
    ),
  }));

  return (
    <div>
      <PageHeader category="Data" title="Calibration targets" />

      <p style={proseStyle}>
        Each block below covers one methodological concept used to impute or
        calibrate microdata — e.g. how a model goes from a survey-eligible
        household to a program participant. The rows are each model&apos;s
        implementation of that concept, side by side. Hover a source label to
        see the supporting quote.
      </p>

      {grouped.length === 0 ? (
        <p style={{ ...proseStyle, marginTop: spacing['3xl'] }}>
          No imputation or calibration concepts are catalogued for the active
          model set.
        </p>
      ) : (
        grouped.map(({ concept, rows }) => (
          <div key={concept.id} style={{ marginTop: spacing['3xl'] }}>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: colors.primary[800],
                margin: 0,
                marginBottom: spacing.sm,
              }}
            >
              {concept.name}
            </h3>
            <p
              style={{
                ...proseStyle,
                fontSize: 14,
                marginBottom: spacing.md,
              }}
            >
              {concept.description}
            </p>
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Model</th>
                    <th style={thStyle}>Method</th>
                    <th style={thStyle}>Base dataset</th>
                    <th style={thStyle}>Reproducible</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Sources</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((imp, i) => {
                    const model = modelById(data, imp.model);
                    return (
                      <tr key={`${imp.model}-${imp.concept}-${i}`}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>
                            {model?.name ?? imp.model}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <code style={{ fontSize: 12 }}>{imp.method}</code>
                        </td>
                        <td style={tdStyle}>{imp.baseDataset}</td>
                        <td style={tdStyle}>
                          <TristateBadge value={imp.reproducible} />
                        </td>
                        <td
                          style={{ ...tdStyle, maxWidth: 360, fontSize: 13 }}
                        >
                          {imp.description}
                          {imp.calibrationTargets &&
                            imp.calibrationTargets.length > 0 && (
                              <div
                                style={{
                                  ...subTextStyle,
                                  marginTop: spacing.xs,
                                }}
                              >
                                <strong>Calibration targets:</strong>{' '}
                                {imp.calibrationTargets.join('; ')}
                              </div>
                            )}
                          {imp.documentationUrl && (
                            <div style={{ ...subTextStyle, marginTop: 4 }}>
                              <a
                                href={imp.documentationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: colors.primary[600],
                                  textDecoration: 'none',
                                }}
                              >
                                docs ↗
                              </a>
                            </div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, maxWidth: 280 }}>
                          <SourceList sources={imp.sources} compact />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
