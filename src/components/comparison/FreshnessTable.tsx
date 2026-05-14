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
import type { ComparisonData, UpdateCadence } from '../../types/comparison';

const CADENCE_LABEL: Record<UpdateCadence, string> = {
  continuous: 'Continuous',
  quarterly: 'Quarterly',
  annual: 'Annual',
  'as-funded': 'As funded',
  unknown: 'Unknown',
};

export default function FreshnessTable({ data }: { data: ComparisonData }) {
  return (
    <div>
      <PageHeader
        category="Comparison"
        title="Freshness"
        description="How current each model's policy parameters are, whether it implements legislation enacted but not yet in effect, and how quickly it absorbs new statute. This is one of the most visible differences between continuously-maintained open-source models and annually-refreshed contract-funded ones."
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
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Latest implemented year</div>
                  <div style={subTextStyle}>Most recent policy year fully encoded.</div>
                </td>
                {data.models.map((m) => {
                  const f = data.freshness.find((x) => x.model === m.id);
                  return (
                    <td key={m.id} style={tdStyle}>
                      {f?.latestImplementedYear === 'unknown' || f?.latestImplementedYear == null
                        ? '—'
                        : f.latestImplementedYear}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Forward years through</div>
                  <div style={subTextStyle}>
                    Latest year through which scheduled future-dated changes are tracked.
                  </div>
                </td>
                {data.models.map((m) => {
                  const f = data.freshness.find((x) => x.model === m.id);
                  const v = f?.forwardYearsThrough;
                  return (
                    <td key={m.id} style={tdStyle}>
                      {v === 'unknown' || v == null ? '—' : v}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Handles future-dated legislation</div>
                  <div style={subTextStyle}>
                    Implements legislation enacted but not yet effective.
                  </div>
                </td>
                {data.models.map((m) => {
                  const f = data.freshness.find((x) => x.model === m.id);
                  return (
                    <td key={m.id} style={tdStyle}>
                      <TristateBadge value={f?.handlesFutureDatedLegislation ?? 'unknown'} />
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Update cadence</div>
                  <div style={subTextStyle}>How often parameters refresh.</div>
                </td>
                {data.models.map((m) => {
                  const f = data.freshness.find((x) => x.model === m.id);
                  return (
                    <td key={m.id} style={tdStyle}>
                      {f ? CADENCE_LABEL[f.updateCadence] : '—'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Update lag</div>
                  <div style={subTextStyle}>Typical delay from legislation to encoding.</div>
                </td>
                {data.models.map((m) => {
                  const f = data.freshness.find((x) => x.model === m.id);
                  return (
                    <td
                      key={m.id}
                      style={{ ...tdStyle, fontSize: 13, color: colors.text.secondary, maxWidth: 280 }}
                    >
                      {f?.updateLag ?? '—'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Last major refresh</div>
                  <div style={subTextStyle}>Most recent documented release or update.</div>
                </td>
                {data.models.map((m) => {
                  const f = data.freshness.find((x) => x.model === m.id);
                  return (
                    <td key={m.id} style={tdStyle}>
                      {f?.lastMajorRefresh ?? '—'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>Notable regimes tracked</div>
                  <div style={subTextStyle}>Specific tax/benefit eras handled.</div>
                </td>
                {data.models.map((m) => {
                  const f = data.freshness.find((x) => x.model === m.id);
                  return (
                    <td
                      key={m.id}
                      style={{ ...tdStyle, fontSize: 13, color: colors.text.secondary, maxWidth: 320 }}
                    >
                      {f?.notableRegimes ?? '—'}
                    </td>
                  );
                })}
              </tr>
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
                  <div style={{ fontWeight: 600 }}>Sources</div>
                </td>
                {data.models.map((m) => {
                  const f = data.freshness.find((x) => x.model === m.id);
                  return (
                    <td key={m.id} style={tdStyle}>
                      <SourceList sources={f?.sources ?? []} />
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
