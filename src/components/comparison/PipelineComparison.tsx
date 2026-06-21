import 'server-only';
import { colors, spacing } from '../../designTokens';
import { SourceList } from './SourceList';
import {
  tableWrapperStyle,
  tableStyle,
  thStyle,
  tdStyle,
  sectionStyle,
} from './comparisonStyles';
import { modelById } from '../../data/comparisons';
import {
  isPolicyEngineModel,
  hostCellStyle,
  ThisModelChip,
} from './hostHighlight';
import type {
  ComparisonData,
  ModelingMechanic,
  ModelingMechanicCategory,
} from '../../types/comparison';

/**
 * Pipeline-relevant modeling-mechanic categories. Other categories
 * (architecture, simulation-unit, behavioral-response, macro-feedback,
 * etc.) belong to other section pages.
 */
const PIPELINE_CATEGORIES = [
  'base-data',
  'aging-uprating',
  'data-enhancement',
  'take-up',
  'calibration',
] as const satisfies readonly ModelingMechanicCategory[];

type PipelineCategory = (typeof PIPELINE_CATEGORIES)[number];

const CATEGORY_LABEL: Record<PipelineCategory, string> = {
  'base-data': 'Base data',
  'aging-uprating': 'Aging / uprating',
  'data-enhancement': 'Data enhancement',
  'take-up': 'Take-up',
  calibration: 'Calibration',
};

/**
 * Compare-mode body for the `/data/pipeline` route. Renders a small
 * model × mechanic table per pipeline-relevant category, scoped to the
 * active model set (host PE first, then peers).
 */
export default function PipelineComparison({
  data,
  activeModelIds,
}: {
  data: ComparisonData;
  activeModelIds: string[];
}) {
  const activeOrder = new Map(activeModelIds.map((id, i) => [id, i]));

  // Filter modeling rows to active models AND pipeline-relevant categories.
  const pipelineCategorySet = new Set<ModelingMechanicCategory>(
    PIPELINE_CATEGORIES,
  );
  const filteredRows = data.modeling.filter(
    (row) =>
      activeOrder.has(row.model) && pipelineCategorySet.has(row.category),
  );

  // Group by pipeline category, preserving the canonical category order.
  const byCategory = new Map<
    PipelineCategory,
    Array<{ row: ModelingMechanic; modelOrder: number }>
  >();
  for (const row of filteredRows) {
    const cat = row.category as PipelineCategory;
    const list = byCategory.get(cat) ?? [];
    list.push({ row, modelOrder: activeOrder.get(row.model) ?? Infinity });
    byCategory.set(cat, list);
  }
  // Sort each category's entries so the host PE row appears first.
  for (const entries of byCategory.values()) {
    entries.sort((a, b) => a.modelOrder - b.modelOrder);
  }

  const visibleCategories = PIPELINE_CATEGORIES.filter((c) =>
    byCategory.has(c),
  );

  if (visibleCategories.length === 0) return null;

  return (
    <section style={sectionStyle}>
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
              {CATEGORY_LABEL[cat]}
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
                  {entries.map(({ row }, i) => {
                    const model = modelById(data, row.model);
                    const isHost = isPolicyEngineModel(row.model);
                    const cellStyle = isHost
                      ? { ...tdStyle, ...hostCellStyle }
                      : tdStyle;
                    return (
                      <tr key={`${row.model}-${row.label}-${i}`}>
                        <td style={cellStyle}>
                          <div
                            style={{
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: spacing.sm,
                              flexWrap: 'wrap',
                            }}
                          >
                            {model?.name ?? row.model}
                            {isHost && <ThisModelChip />}
                          </div>
                        </td>
                        <td style={{ ...cellStyle, maxWidth: 460 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            {row.label}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: colors.text.secondary,
                            }}
                          >
                            {row.detail}
                          </div>
                        </td>
                        <td style={cellStyle}>{row.scope ?? '—'}</td>
                        <td style={{ ...cellStyle, maxWidth: 240 }}>
                          <SourceList sources={row.sources} compact />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}
