import PageHeader from '../layout/PageHeader';
import { colors, spacing } from '../../designTokens';
import { SourceList } from './SourceList';
import {
  tableWrapperStyle,
  tableStyle,
  thStyle,
  tdStyle,
  subTextStyle,
  proseStyle,
  sectionStyle,
} from './comparisonStyles';
import { modelById, programById } from '../../data/comparisons';
import type {
  AccuracyCheck,
  ComparisonData,
  Program,
} from '../../types/comparison';

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

function fmtValue(value: number, units: string): string {
  return units === 'usd' ? fmtUsd(value) : fmtCount(value);
}

interface BenchmarkGroup {
  key: string;
  program: Program | undefined;
  programId: string;
  metric: string;
  year: number;
  units: string;
  /** Administrative target value — taken from the first row in the group. */
  targetValue: number;
  /** Source for the administrative target. */
  targetSource: AccuracyCheck['targetSource'];
  /** One row per model that has an entry for this benchmark. */
  rows: AccuracyCheck[];
}

/**
 * Group accuracy rows by (program, metric, year). Each benchmark
 * becomes a sub-table so the host model's prediction sits next to its
 * peers' predictions for the same administrative target.
 *
 * Within each group, rows are sorted to match `activeModelIds` order
 * (host PE first, peers in URL order). Models that have no row for a
 * given benchmark are simply absent from that sub-table.
 */
function groupAccuracy(
  rows: AccuracyCheck[],
  data: ComparisonData,
  activeModelIds: string[],
): BenchmarkGroup[] {
  const modelOrder = new Map(activeModelIds.map((id, i) => [id, i]));
  const groups = new Map<string, BenchmarkGroup>();
  for (const row of rows) {
    const key = `${row.program}::${row.metric}::${row.year}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        program: programById(data, row.program),
        programId: row.program,
        metric: row.metric,
        year: row.year,
        units: row.units,
        targetValue: row.targetValue,
        targetSource: row.targetSource,
        rows: [],
      };
      groups.set(key, group);
    }
    group.rows.push(row);
  }
  for (const group of groups.values()) {
    group.rows.sort(
      (a, b) =>
        (modelOrder.get(a.model) ?? Infinity) -
        (modelOrder.get(b.model) ?? Infinity),
    );
  }
  return Array.from(groups.values()).sort((a, b) => {
    const ap = a.program?.name ?? a.programId;
    const bp = b.program?.name ?? b.programId;
    if (ap !== bp) return ap.localeCompare(bp);
    if (a.metric !== b.metric) return a.metric.localeCompare(b.metric);
    return a.year - b.year;
  });
}

/**
 * Compare-mode body for the validation page. One sub-table per
 * benchmark (program × metric × year); rows compare each active
 * model's predicted value against the shared administrative target.
 */
export default function ValidationComparison({
  data,
  activeModelIds,
}: {
  data: ComparisonData;
  activeModelIds: string[];
}) {
  const activeSet = new Set(activeModelIds);
  const filteredAccuracy = data.accuracy.filter((row) => activeSet.has(row.model));
  const groups = groupAccuracy(filteredAccuracy, data, activeModelIds);

  return (
    <div>
      <PageHeader category="Data" title="Validation" />

      {filteredAccuracy.length === 0 ? (
        <p style={proseStyle}>
          No accuracy benchmarks documented for the selected model set yet.
        </p>
      ) : (
        <section style={sectionStyle}>
          <p style={proseStyle}>
            Each block below pairs an administrative target with each
            active model&apos;s predicted value for the same program,
            metric, and year. Predicted values marked <em>unknown</em>{' '}
            are pending model runs.
          </p>
          {groups.map((group) => (
            <div key={group.key} style={{ marginTop: spacing['3xl'] }}>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.primary[800],
                  margin: 0,
                  marginBottom: spacing.xs,
                }}
              >
                {group.program?.name ?? group.programId}
              </h3>
              <div
                style={{
                  ...subTextStyle,
                  marginTop: 0,
                  marginBottom: spacing.sm,
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 600 }}>{group.metric}</span>
                {' · '}
                {group.year}
                {' · '}
                <span>
                  target{' '}
                  <strong>
                    {fmtValue(group.targetValue, group.units)}
                  </strong>{' '}
                  ({group.units})
                </span>
              </div>
              <div style={{ marginBottom: spacing.sm }}>
                <SourceList sources={[group.targetSource]} compact />
              </div>
              <div style={tableWrapperStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, minWidth: 200 }}>Model</th>
                      <th style={thStyle}>Predicted</th>
                      <th style={thStyle}>Units</th>
                      <th style={thStyle}>Notes</th>
                      <th style={thStyle}>Predicted source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, idx) => {
                      const model = modelById(data, row.model);
                      const predictedDisplay =
                        row.predictedValue === 'unknown' ||
                        row.predictedValue == null
                          ? '—'
                          : fmtValue(row.predictedValue, row.units);
                      return (
                        <tr key={`${row.model}-${idx}`}>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600 }}>
                              {model?.name ?? row.model}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <strong>{predictedDisplay}</strong>
                          </td>
                          <td style={tdStyle}>{row.units}</td>
                          <td
                            style={{
                              ...tdStyle,
                              maxWidth: 360,
                              fontSize: 13,
                            }}
                          >
                            {row.notes ?? ''}
                          </td>
                          <td style={{ ...tdStyle, maxWidth: 260 }}>
                            {row.predictedSource ? (
                              <SourceList
                                sources={[row.predictedSource]}
                                compact
                              />
                            ) : (
                              <span style={{ ...subTextStyle, marginTop: 0 }}>
                                —
                              </span>
                            )}
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
    </div>
  );
}
