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
  proseStyle,
  sectionStyle,
} from './comparisonStyles';
import {
  modelById,
  programById,
  imputationsByConcept,
  behavioralParametersByDomain,
  ELASTICITY_KINDS,
  modelingByModel,
} from '../../data/comparisons';
import ModelSelector from './ModelSelector';
import CategoryFilter from './CategoryFilter';
import type {
  ComparisonData,
  Model,
  BehavioralParameter,
  ModelingMechanicCategory,
} from '../../types/comparison';

const MECHANIC_CATEGORY_LABEL: Record<ModelingMechanicCategory, string> = {
  architecture: 'Architecture',
  'simulation-unit': 'Simulation unit',
  'base-data': 'Base data',
  'data-enhancement': 'Data enhancement',
  'aging-uprating': 'Aging/uprating',
  calibration: 'Calibration',
  'take-up': 'Take-up',
  'tax-modeling': 'Tax modeling',
  'benefit-modeling': 'Benefit modeling',
  'behavioral-response': 'Behavioral response',
  'macro-feedback': 'Macro feedback',
  'health-insurance': 'Health insurance',
  'dynamic-lifecycle': 'Dynamic lifecycle',
  geography: 'Geography',
  'time-horizon': 'Time horizon',
  validation: 'Validation',
  output: 'Output',
  access: 'Access',
  other: 'Other',
};

function fmtUsd(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

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
 * One behavioral-rows table grouped by domain. Reused for the
 * Elasticities and Other-behavioral sections so the column shape stays
 * consistent across them. Also exported for the peer-aware
 * `/behavioral` compare view so the column shape matches Methods.
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

export default function MethodsView({
  data,
  countryModels,
  selectedCategories,
}: {
  data: ComparisonData;
  countryModels: Model[];
  /**
   * Optional filter — if provided, only renders modeling-mechanic rows
   * whose category id is in this set. Server pages read
   * `?categories=` and pass the parsed set; client `CategoryFilter`
   * updates the URL.
   */
  selectedCategories?: Set<ModelingMechanicCategory>;
}) {
  const grouped = imputationsByConcept(data);
  const elasticityGroups = behavioralParametersByDomain(data, (r) =>
    ELASTICITY_KINDS.has(r.kind),
  );
  const otherBehavioralGroups = behavioralParametersByDomain(data, (r) =>
    !ELASTICITY_KINDS.has(r.kind),
  );
  const modelingGroups = modelingByModel(data);

  return (
    <div>
      <PageHeader
        category="Comparison"
        title="Methods and accuracy"
        description="How each model is structured — elasticities and other behavioral assumptions, atomic modeling mechanics (architecture, base data, take-up, macro linkage, etc.), imputations and calibration grouped by comparable concept (e.g. SNAP participation), and accuracy benchmarks against administrative targets. Sections appear when the active model set has content for them."
      />

      <ModelSelector countryModels={countryModels} />

      {elasticityGroups.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Elasticities</h2>
          <p style={proseStyle}>
            Numeric response parameters — elasticities, semi-elasticities,
            and participation elasticities — grouped by behavioral
            domain. Each row is a scalar value (or a published range)
            with its population, margin, and citation, so values are
            directly comparable across models.
          </p>
          <BehavioralDomainBlock data={data} groups={elasticityGroups} />
        </section>
      )}

      {otherBehavioralGroups.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Other behavioral assumptions</h2>
          <p style={proseStyle}>
            Non-scalar behavioral mechanics: choice and take-up models,
            tax-incidence assumptions, functional forms, calibration
            targets, and explicit not-modeled / undisclosed cases. These
            describe model structure rather than a single coefficient.
          </p>
          <BehavioralDomainBlock data={data} groups={otherBehavioralGroups} />
        </section>
      )}

      {(() => {
        // Group modeling rows by category for comparable side-by-side view.
        // Each section: rows = (model × mechanic), grouped under category.
        const byCategory = new Map<
          ModelingMechanicCategory,
          Array<{ model: Model; rowIdx: number; row: ReturnType<typeof modelingByModel>[number]['rows'][number] }>
        >();
        for (const { model, rows } of modelingGroups) {
          rows.forEach((row, i) => {
            const list = byCategory.get(row.category) ?? [];
            list.push({ model, rowIdx: i, row });
            byCategory.set(row.category, list);
          });
        }
        // Render order: stable by enum declaration in ModelingMechanicCategory.
        const orderedCategories = (
          Object.keys(MECHANIC_CATEGORY_LABEL) as ModelingMechanicCategory[]
        ).filter((c) => byCategory.has(c));

        const visibleCategoryIds = selectedCategories ?? new Set(orderedCategories);
        const visibleCategories = orderedCategories.filter((c) =>
          visibleCategoryIds.has(c),
        );

        if (orderedCategories.length === 0) return null;

        return (
          <section style={sectionStyle}>
            <h2 style={h2Style}>Modeling mechanics, by category</h2>
            <p style={proseStyle}>
              Atomic implementation details — architecture, base data, aging,
              take-up, macro-linkage, health-insurance, dynamic lifecycle —
              with one row per model per cited detail. Pick categories above
              to focus the comparison; rows within each category are
              side-by-side across models.
            </p>
            <CategoryFilter
              categories={orderedCategories.map((id) => ({
                id,
                label: MECHANIC_CATEGORY_LABEL[id],
              }))}
            />

            {visibleCategories.map((cat) => {
              const entries = byCategory.get(cat) ?? [];
              return (
                <div key={cat} style={{ marginTop: spacing['3xl'] }}>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: colors.primary[800],
                      margin: 0,
                      marginBottom: spacing.sm,
                    }}
                  >
                    {MECHANIC_CATEGORY_LABEL[cat]}
                  </h3>
                  <div style={tableWrapperStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, minWidth: 180 }}>Model</th>
                          <th style={thStyle}>Mechanic</th>
                          <th style={thStyle}>Scope</th>
                          <th style={thStyle}>Sources</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map(({ model, rowIdx, row }) => (
                          <tr key={`${model.id}-${rowIdx}`}>
                            <td style={tdStyle}>
                              <div style={{ fontWeight: 600 }}>{model.name}</div>
                            </td>
                            <td style={{ ...tdStyle, maxWidth: 460 }}>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                {row.label}
                              </div>
                              <div style={{ fontSize: 13, color: colors.text.secondary }}>
                                {row.detail}
                              </div>
                            </td>
                            <td style={tdStyle}>{row.scope ?? '—'}</td>
                            <td style={{ ...tdStyle, maxWidth: 240 }}>
                              <SourceList sources={row.sources} compact />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </section>
        );
      })()}

      {grouped.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Imputations and calibration, by concept</h2>
          <p style={proseStyle}>
            Each block below covers one methodological concept — e.g. how a
            model goes from CPS-eligible to CPS-participant in SNAP. The
            rows are model implementations of that same concept, side by
            side. Hover a source label to see the supporting quote.
          </p>

          {grouped.map(({ concept, rows }) => (
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
            <p style={{ ...proseStyle, fontSize: 14, marginBottom: spacing.md }}>
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
                      <tr key={i}>
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
                        <td style={{ ...tdStyle, maxWidth: 360, fontSize: 13 }}>
                          {imp.description}
                          {imp.calibrationTargets && imp.calibrationTargets.length > 0 && (
                            <div style={{ ...subTextStyle, marginTop: spacing.xs }}>
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
          ))}
        </section>
      )}

      {data.accuracy.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Accuracy benchmarks</h2>
        <p style={proseStyle}>
          Each row pairs an administrative target with the model&apos;s
          predicted value (where documented). Some rows are calibration
          targets — the model is built to match them — while others are
          external validation. Predicted values marked <em>unknown</em> are
          pending model runs.
        </p>
        <div style={{ ...tableWrapperStyle, marginTop: spacing.lg }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Model</th>
                <th style={thStyle}>Program</th>
                <th style={thStyle}>Metric</th>
                <th style={thStyle}>Year</th>
                <th style={thStyle}>Target</th>
                <th style={thStyle}>Predicted</th>
                <th style={thStyle}>Units</th>
                <th style={thStyle}>Sources</th>
              </tr>
            </thead>
            <tbody>
              {data.accuracy.map((row, i) => {
                const model = modelById(data, row.model);
                const program = programById(data, row.program);
                const fmt = (n: number) =>
                  row.units === 'usd' ? fmtUsd(n) : fmtCount(n);
                return (
                  <tr key={i}>
                    <td style={tdStyle}>{model?.name ?? row.model}</td>
                    <td style={tdStyle}>{program?.name ?? row.program}</td>
                    <td style={tdStyle}>{row.metric}</td>
                    <td style={tdStyle}>{row.year}</td>
                    <td style={tdStyle}>
                      <strong>{fmt(row.targetValue)}</strong>
                    </td>
                    <td style={tdStyle}>
                      {row.predictedValue === 'unknown' || row.predictedValue == null
                        ? '—'
                        : fmt(row.predictedValue)}
                    </td>
                    <td style={tdStyle}>{row.units}</td>
                    <td style={tdStyle}>
                      <SourceList
                        sources={[
                          row.targetSource,
                          ...(row.predictedSource ? [row.predictedSource] : []),
                        ]}
                        compact
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </section>
      )}
    </div>
  );
}
