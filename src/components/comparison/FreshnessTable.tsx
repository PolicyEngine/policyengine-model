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
  sectionStyle,
} from './comparisonStyles';
import ModelSelector from './ModelSelector';
import {
  sourcesFor,
  sourceKinds,
  type ComparisonData,
  type Freshness,
  type Model,
  type SourceKind,
  type UpdateCadence,
} from '../../types/comparison';

const CADENCE_LABEL: Record<UpdateCadence, string> = {
  continuous: 'Continuous',
  quarterly: 'Quarterly',
  annual: 'Annual',
  'as-funded': 'As funded',
  unknown: 'Unknown',
};

type RowSpec = {
  key: keyof Freshness;
  label: string;
  description: string;
  render: (f: Freshness | undefined) => React.ReactNode;
};

const ROWS: RowSpec[] = [
  {
    key: 'latestImplementedYear',
    label: 'Latest implemented year',
    description: 'Most recent policy year fully encoded.',
    render: (f) => {
      const v = f?.latestImplementedYear;
      return v == null || v === 'unknown' ? '—' : v;
    },
  },
  {
    key: 'forwardYearsThrough',
    label: 'Forward years through',
    description: 'Latest year through which scheduled future-dated changes are tracked.',
    render: (f) => {
      const v = f?.forwardYearsThrough;
      return v == null || v === 'unknown' ? '—' : v;
    },
  },
  {
    key: 'handlesFutureDatedLegislation',
    label: 'Handles future-dated legislation',
    description: 'Implements legislation enacted but not yet effective.',
    render: (f) => <TristateBadge value={f?.handlesFutureDatedLegislation ?? 'unknown'} />,
  },
  {
    key: 'updateCadence',
    label: 'Update cadence',
    description: 'How often parameters refresh.',
    render: (f) => (f ? CADENCE_LABEL[f.updateCadence] : '—'),
  },
  {
    key: 'updateLag',
    label: 'Update lag',
    description: 'Typical delay from legislation to encoding.',
    render: (f) => f?.updateLag ?? '—',
  },
  {
    key: 'lastMajorRefresh',
    label: 'Last major refresh',
    description: 'Most recent documented release or update.',
    render: (f) => f?.lastMajorRefresh ?? '—',
  },
  {
    key: 'notableRegimes',
    label: 'Notable regimes tracked',
    description: 'Specific tax/benefit eras handled.',
    render: (f) => f?.notableRegimes ?? '—',
  },
];

export default function FreshnessTable({
  data,
  countryModels,
}: {
  data: ComparisonData;
  countryModels: Model[];
}) {
  return (
    <div>
      <PageHeader
        category="Comparison"
        title="Freshness"
        description="How current each model's policy parameters are, whether it implements legislation enacted but not yet in effect, and how quickly it absorbs new statute. Each cell carries its own corroborating sources."
      />

      <ModelSelector countryModels={countryModels} />

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
                    const f = data.freshness.find((x) => x.model === m.id);
                    const cellSources = f ? sourcesFor(f.sources, String(row.key)) : [];
                    return (
                      <td
                        key={m.id}
                        style={{ ...tdStyle, fontSize: 13, color: colors.text.secondary, maxWidth: 320 }}
                      >
                        <div style={{ color: colors.text.primary }}>{row.render(f)}</div>
                        {cellSources.length > 0 && (
                          <div style={{ marginTop: spacing.xs }}>
                            <SourceList sources={cellSources} compact />
                          </div>
                        )}
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
                  const f = data.freshness.find((x) => x.model === m.id);
                  return (
                    <td
                      key={m.id}
                      style={{ ...tdStyle, fontSize: 12, color: colors.text.secondary, maxWidth: 320 }}
                    >
                      {f?.notes ?? '—'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Corroboration</div>
                  <div style={subTextStyle}>
                    Total source count and distinct kinds across this row.
                  </div>
                </td>
                {data.models.map((m) => {
                  const f = data.freshness.find((x) => x.model === m.id);
                  const total = f?.sources.length ?? 0;
                  const kinds = f ? sourceKinds(f.sources) : new Set<SourceKind>();
                  const labels = Array.from(kinds)
                    .filter((k) => k !== 'other')
                    .join(', ');
                  return (
                    <td key={m.id} style={tdStyle}>
                      <span style={{ fontSize: 12, color: colors.text.tertiary }}>
                        {total} sources
                        {labels ? ` · ${labels}` : ''}
                      </span>
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
