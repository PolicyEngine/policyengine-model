import 'server-only';
import type { CSSProperties, ReactNode } from 'react';
import { colors, spacing } from '../../designTokens';
import { TristateBadge } from './StatusBadge';
import { SourceList } from './SourceList';
import {
  tableWrapperStyle,
  tableStyle,
  thStyle,
  tdStyle,
  subTextStyle,
} from './comparisonStyles';
import { loadComparisonData } from '../../data/comparisons';
import {
  sourcesFor,
  type Artifact,
  type ArtifactType,
  type ComparisonData,
  type Freshness,
  type Model,
  type ModelingMechanic,
  type ModelingMechanicCategory,
  type Source,
  type Transparency,
  type Tristate,
  type UpdateCadence,
  type UsageMetric,
} from '../../types/comparison';

/* -------------------------------------------------------------------------- */
/*                                  STYLES                                    */
/* -------------------------------------------------------------------------- */

const blockStyle: CSSProperties = {
  marginBottom: spacing['4xl'],
  border: `1px solid ${colors.border.light}`,
  borderRadius: 12,
  backgroundColor: colors.white,
  padding: spacing['2xl'],
};

const blockHeaderStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: colors.primary[600],
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: spacing.sm,
};

const blockTitleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: colors.primary[900],
  margin: 0,
  marginBottom: spacing.sm,
};

const blockSubtitleStyle: CSSProperties = {
  fontSize: 14,
  color: colors.text.secondary,
  margin: 0,
  marginBottom: spacing.xl,
  lineHeight: 1.5,
  maxWidth: 760,
};

const panelStyle: CSSProperties = {
  borderTop: `1px solid ${colors.border.light}`,
  paddingTop: spacing.xl,
  marginTop: spacing.xl,
};

const panelTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: colors.primary[900],
  margin: 0,
  marginBottom: spacing.xs,
};

const panelDescriptionStyle: CSSProperties = {
  fontSize: 13,
  color: colors.text.tertiary,
  margin: 0,
  marginBottom: spacing.md,
  lineHeight: 1.5,
};

const linkStyle: CSSProperties = {
  color: colors.primary[600],
  textDecoration: 'none',
};

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

const SOURCING_LABEL: Record<string, string> = {
  'inline-cite': 'Inline citation in parameter file',
  'separate-doc': 'In separate documentation',
  none: 'No citations',
  unknown: 'Unknown',
};

const CADENCE_LABEL: Record<UpdateCadence, string> = {
  continuous: 'Continuous',
  quarterly: 'Quarterly',
  annual: 'Annual',
  'as-funded': 'As funded',
  unknown: 'Unknown',
};

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  codebase: 'Code repositories',
  'parameter-database': 'Parameter databases',
  dataset: 'Datasets',
  api: 'APIs',
  'web-application': 'Web apps',
  'documentation-site': 'Documentation sites',
  paper: 'Papers / reports',
  cli: 'CLIs / packages',
};

/** Display order for artifact-type sub-tables. */
const ARTIFACT_TYPE_ORDER: ArtifactType[] = [
  'codebase',
  'parameter-database',
  'dataset',
  'api',
  'web-application',
  'documentation-site',
  'cli',
  'paper',
];

const ABOUT_MECHANIC_CATEGORIES = [
  'architecture',
  'simulation-unit',
  'tax-modeling',
  'benefit-modeling',
  'health-insurance',
  'geography',
  'time-horizon',
  'dynamic-lifecycle',
  'macro-feedback',
  'documentation',
  'output',
  'access',
] as const satisfies readonly ModelingMechanicCategory[];

type AboutMechanicCategory = (typeof ABOUT_MECHANIC_CATEGORIES)[number];

const ABOUT_MECHANIC_CATEGORY_LABELS: Record<AboutMechanicCategory, string> = {
  architecture: 'Architecture',
  'simulation-unit': 'Simulation unit',
  'tax-modeling': 'Tax modeling',
  'benefit-modeling': 'Benefit modeling',
  'health-insurance': 'Health insurance',
  geography: 'Geography',
  'time-horizon': 'Time horizon',
  'dynamic-lifecycle': 'Dynamic lifecycle',
  'macro-feedback': 'Macro feedback',
  documentation: 'Documentation',
  output: 'Output',
  access: 'Access',
};

function tryHost(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function fmtYear(v: number | 'unknown' | undefined): string {
  if (v == null || v === 'unknown') return '—';
  return String(v);
}

function fmtCount(v: number | 'unknown' | undefined): string {
  if (v == null || v === 'unknown') return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString();
}

function CellWithSources({
  children,
  sources,
}: {
  children: ReactNode;
  sources: Source[];
}) {
  return (
    <div>
      <div>{children}</div>
      {sources.length > 0 && (
        <div style={{ marginTop: spacing.xs }}>
          <SourceList sources={sources} compact />
        </div>
      )}
    </div>
  );
}

function ExternalLink({ url, label }: { url?: string; label?: string }) {
  if (!url) return <span style={{ color: colors.text.tertiary }}>—</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
      {label ?? `${tryHost(url)} ↗`}
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/*                              PANEL: TRANSPARENCY                           */
/* -------------------------------------------------------------------------- */

type TransparencyFormat = 'tristate' | 'text' | 'sourcing' | 'count' | 'url';

const TRANSPARENCY_FIELDS: Array<{
  key: keyof Transparency;
  label: string;
  format: TransparencyFormat;
}> = [
  { key: 'codePublic', label: 'Code public', format: 'tristate' },
  { key: 'codeLicense', label: 'License', format: 'text' },
  { key: 'documentationPublic', label: 'Docs public', format: 'tristate' },
  { key: 'documentationUrl', label: 'Docs URL', format: 'url' },
  { key: 'testSuitePublic', label: 'Tests public', format: 'tristate' },
  { key: 'testCount', label: 'Test count', format: 'count' },
  { key: 'datasetPublic', label: 'Dataset public', format: 'tristate' },
  { key: 'reproducibleBuilds', label: 'Reproducible builds', format: 'tristate' },
  { key: 'parameterSourcing', label: 'Parameter sourcing', format: 'sourcing' },
];

function renderTransparencyValue(
  format: TransparencyFormat,
  value: unknown,
): ReactNode {
  if (format === 'tristate') {
    return <TristateBadge value={(value as Tristate) ?? 'unknown'} />;
  }
  if (format === 'sourcing') {
    return SOURCING_LABEL[String(value)] ?? String(value ?? '—');
  }
  if (format === 'count') {
    if (value === 'unknown' || value == null) return '—';
    return typeof value === 'number' ? value.toLocaleString() : String(value);
  }
  if (format === 'url') {
    return <ExternalLink url={value as string | undefined} />;
  }
  return value == null || value === '' ? '—' : String(value);
}

function TransparencyCompareTable({
  models,
  rows,
}: {
  models: Model[];
  rows: Transparency[];
}) {
  return (
    <div style={tableWrapperStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...thStyle, minWidth: 200 }}>Dimension</th>
            {models.map((m) => (
              <th key={m.id} style={thStyle}>
                {m.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TRANSPARENCY_FIELDS.map((f) => (
            <tr key={String(f.key)}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600 }}>{f.label}</div>
              </td>
              {models.map((m) => {
                const row = rows.find((r) => r.model === m.id);
                if (!row) {
                  return (
                    <td key={m.id} style={tdStyle}>
                      —
                    </td>
                  );
                }
                const cellSources = sourcesFor(row.sources, String(f.key));
                return (
                  <td key={m.id} style={tdStyle}>
                    <CellWithSources sources={cellSources}>
                      {renderTransparencyValue(f.format, row[f.key])}
                    </CellWithSources>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              PANEL: FRESHNESS                              */
/* -------------------------------------------------------------------------- */

const FRESHNESS_FIELDS: Array<{
  key: keyof Freshness;
  label: string;
  render: (f: Freshness) => ReactNode;
}> = [
  {
    key: 'latestImplementedYear',
    label: 'Latest year implemented',
    render: (f) => fmtYear(f.latestImplementedYear),
  },
  {
    key: 'forwardYearsThrough',
    label: 'Forward years through',
    render: (f) => fmtYear(f.forwardYearsThrough),
  },
  {
    key: 'handlesFutureDatedLegislation',
    label: 'Future-dated legislation',
    render: (f) => <TristateBadge value={f.handlesFutureDatedLegislation} />,
  },
  {
    key: 'updateCadence',
    label: 'Update cadence',
    render: (f) => CADENCE_LABEL[f.updateCadence],
  },
  {
    key: 'lastMajorRefresh',
    label: 'Last major refresh',
    render: (f) => f.lastMajorRefresh ?? '—',
  },
];

function FreshnessCompareTable({
  models,
  rows,
}: {
  models: Model[];
  rows: Freshness[];
}) {
  return (
    <div style={tableWrapperStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...thStyle, minWidth: 200 }}>Signal</th>
            {models.map((m) => (
              <th key={m.id} style={thStyle}>
                {m.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FRESHNESS_FIELDS.map((f) => (
            <tr key={String(f.key)}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600 }}>{f.label}</div>
              </td>
              {models.map((m) => {
                const row = rows.find((r) => r.model === m.id);
                if (!row) {
                  return (
                    <td key={m.id} style={tdStyle}>
                      —
                    </td>
                  );
                }
                const cellSources = sourcesFor(row.sources, String(f.key));
                return (
                  <td key={m.id} style={tdStyle}>
                    <CellWithSources sources={cellSources}>
                      {f.render(row)}
                    </CellWithSources>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           PANEL: RULE MECHANICS                            */
/* -------------------------------------------------------------------------- */

function RuleMechanicsTable({
  models,
  rows,
}: {
  models: Model[];
  rows: ModelingMechanic[];
}) {
  if (rows.length === 0) {
    return <div style={{ color: colors.text.tertiary }}>—</div>;
  }

  const modelOrder = new Map(models.map((m, i) => [m.id, i]));
  const categoryOrder = new Map(
    ABOUT_MECHANIC_CATEGORIES.map((category, i) => [category, i]),
  );
  const sortedRows = [...rows].sort((a, b) => {
    const categoryDiff =
      (categoryOrder.get(a.category as AboutMechanicCategory) ?? Infinity) -
      (categoryOrder.get(b.category as AboutMechanicCategory) ?? Infinity);
    if (categoryDiff !== 0) return categoryDiff;
    return (
      (modelOrder.get(a.model) ?? Infinity) -
      (modelOrder.get(b.model) ?? Infinity)
    );
  });
  const modelById = new Map(models.map((m) => [m.id, m]));

  return (
    <div style={tableWrapperStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...thStyle, minWidth: 180 }}>Model</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Mechanic</th>
            <th style={thStyle}>Scope</th>
            <th style={thStyle}>Sources</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr key={`${row.model}-${row.category}-${row.label}-${i}`}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600 }}>
                  {modelById.get(row.model)?.name ?? row.model}
                </div>
              </td>
              <td style={tdStyle}>
                {ABOUT_MECHANIC_CATEGORY_LABELS[
                  row.category as AboutMechanicCategory
                ] ?? row.category}
              </td>
              <td style={{ ...tdStyle, maxWidth: 520 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {row.label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: colors.text.secondary,
                    lineHeight: 1.55,
                  }}
                >
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
  );
}

/* -------------------------------------------------------------------------- */
/*                              PANEL: ARTIFACTS                              */
/* -------------------------------------------------------------------------- */

function ArtifactsCompareTables({
  models,
  artifactsByModel,
}: {
  models: Model[];
  artifactsByModel: Map<string, Artifact[]>;
}) {
  // Sub-table per artifact type, rows = (model, artifact). Skip types
  // that have no artifacts across any active model.
  const typesPresent = ARTIFACT_TYPE_ORDER.filter((type) =>
    models.some((m) =>
      (artifactsByModel.get(m.id) ?? []).some((a) => a.type === type),
    ),
  );

  if (typesPresent.length === 0) {
    return <div style={{ color: colors.text.tertiary }}>—</div>;
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}
    >
      {typesPresent.map((type) => (
        <div key={type}>
          <h4
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: colors.primary[800],
              margin: 0,
              marginBottom: spacing.sm,
            }}
          >
            {ARTIFACT_TYPE_LABELS[type]}
          </h4>
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, minWidth: 200 }}>Model</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Public</th>
                  <th style={thStyle}>License</th>
                  <th style={thStyle}>Link</th>
                </tr>
              </thead>
              <tbody>
                {models.flatMap((m) => {
                  const items = (artifactsByModel.get(m.id) ?? []).filter(
                    (a) => a.type === type,
                  );
                  if (items.length === 0) {
                    return [
                      <tr key={`${m.id}-empty`}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>{m.name}</div>
                        </td>
                        <td
                          style={{ ...tdStyle, color: colors.text.tertiary }}
                          colSpan={4}
                        >
                          —
                        </td>
                      </tr>,
                    ];
                  }
                  return items.map((a, i) => (
                    <tr key={`${m.id}-${i}`}>
                      <td style={tdStyle}>
                        {i === 0 ? (
                          <div style={{ fontWeight: 600 }}>{m.name}</div>
                        ) : (
                          <div style={{ color: colors.text.tertiary }}>↳</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{a.name}</div>
                        {a.description && (
                          <div style={subTextStyle}>{a.description}</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <TristateBadge value={a.public} />
                      </td>
                      <td style={tdStyle}>{a.license}</td>
                      <td style={tdStyle}>
                        <ExternalLink url={a.url} />
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                PANEL: USAGE                                */
/* -------------------------------------------------------------------------- */

const USAGE_FIELDS: Array<{ key: keyof UsageMetric; label: string }> = [
  { key: 'academicCitations', label: 'Academic citations' },
  { key: 'governmentReports', label: 'Government reports' },
  { key: 'pressMentions', label: 'Press mentions' },
  { key: 'monthlyActiveUsers', label: 'Monthly active users' },
  { key: 'monthlyComputations', label: 'Monthly computations' },
  { key: 'organizationUsers', label: 'Organization users' },
];

function UsageCompareTable({
  models,
  rows,
}: {
  models: Model[];
  rows: UsageMetric[];
}) {
  return (
    <div style={tableWrapperStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...thStyle, minWidth: 200 }}>Signal</th>
            {models.map((m) => (
              <th key={m.id} style={thStyle}>
                {m.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {USAGE_FIELDS.map((f) => (
            <tr key={String(f.key)}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600 }}>{f.label}</div>
              </td>
              {models.map((m) => {
                const row = rows.find((r) => r.model === m.id);
                return (
                  <td key={m.id} style={tdStyle}>
                    {row
                      ? fmtCount(
                          row[f.key] as number | 'unknown' | undefined,
                        )
                      : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td style={tdStyle}>
              <div style={{ fontWeight: 600 }}>Notes</div>
            </td>
            {models.map((m) => {
              const row = rows.find((r) => r.model === m.id);
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
                  {row?.notes ?? '—'}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

export interface AboutThisModelProps {
  /**
   * Active models for this view. First entry is the host PE model (always
   * present); remaining entries are peers from `?compare=`. When length
   * is 1 the block renders compact PE-only strips; with more it renders
   * the side-by-side tables.
   */
  activeModelIds: string[];
}

export default function AboutThisModel({ activeModelIds }: AboutThisModelProps) {
  const data: ComparisonData = loadComparisonData();
  const modelLookup = new Map(data.models.map((m) => [m.id, m]));
  const activeModels = activeModelIds
    .map((id) => modelLookup.get(id))
    .filter((m): m is Model => Boolean(m));

  // Caller (app/page.tsx) gates this block on `parsed.compareMode`, so
  // activeModels always contains the host PE row plus at least one peer
  // when rendered. We guard against the empty case for safety only.
  if (activeModels.length < 2) return null;

  const host = activeModels[0];
  const activeIdSet = new Set(activeModelIds);
  const activeTransparency = data.transparency.filter((r) =>
    activeIdSet.has(r.model),
  );
  const activeFreshness = data.freshness.filter((r) =>
    activeIdSet.has(r.model),
  );
  const aboutMechanicCategorySet = new Set<ModelingMechanicCategory>(
    ABOUT_MECHANIC_CATEGORIES,
  );
  const activeMechanics = data.modeling.filter(
    (r) => activeIdSet.has(r.model) && aboutMechanicCategorySet.has(r.category),
  );
  const activeUsage = data.usage.filter((r) => activeIdSet.has(r.model));
  const artifactsByModel = new Map<string, Artifact[]>();
  for (const id of activeModelIds) {
    artifactsByModel.set(
      id,
      data.artifacts.filter((a) => a.model === id),
    );
  }

  const peerCount = activeModels.length - 1;
  const title = `${host.name} compared to ${peerCount} peer${
    peerCount === 1 ? '' : 's'
  }`;

  return (
    <section style={blockStyle}>
      <div style={blockHeaderStyle}>About this model</div>
      <h2 style={blockTitleStyle}>{title}</h2>
      <p style={blockSubtitleStyle}>{host.summary}</p>

      {/* ------------------------- Transparency ------------------------- */}
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Transparency</h3>
        <p style={panelDescriptionStyle}>
          Code, license, documentation, tests, dataset, and reproducible
          builds — the legs of model verifiability.
        </p>
        <TransparencyCompareTable
          models={activeModels}
          rows={activeTransparency}
        />
      </div>

      {/* -------------------------- Freshness -------------------------- */}
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Freshness</h3>
        <p style={panelDescriptionStyle}>
          How current policy parameters are, whether the model implements
          enacted-but-not-yet-effective legislation, and how often it
          refreshes.
        </p>
        <FreshnessCompareTable models={activeModels} rows={activeFreshness} />
      </div>

      {/* ----------------------- Rule mechanics ------------------------ */}
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Rule Mechanics</h3>
        <p style={panelDescriptionStyle}>
          Publicly documented architecture and policy-rule mechanics, including
          tax and benefit engines, healthcare eligibility pathways, simulation
          units, geographic coverage, and model horizons.
        </p>
        <RuleMechanicsTable models={activeModels} rows={activeMechanics} />
      </div>

      {/* -------------------------- Artifacts -------------------------- */}
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Artifacts</h3>
        <p style={panelDescriptionStyle}>
          Concrete deliverables an outside reader can verify exist:
          codebases, datasets, APIs, web apps, documentation, and papers.
        </p>
        <ArtifactsCompareTables
          models={activeModels}
          artifactsByModel={artifactsByModel}
        />
      </div>

      {/* ---------------------------- Usage ---------------------------- */}
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Usage</h3>
        <p style={panelDescriptionStyle}>
          Academic citations, government reports, press mentions, and
          active users. Many cells read &quot;—&quot; because incumbents
          do not publish usage metrics.
        </p>
        <UsageCompareTable models={activeModels} rows={activeUsage} />
      </div>
    </section>
  );
}
