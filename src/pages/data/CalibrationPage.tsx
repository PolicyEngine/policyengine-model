import { useState, useMemo } from 'react';
import { colors, typography, spacing } from '../../designTokens';
import { pipelineStages } from '../../data/pipelineStages';
import { ukPipelineStages } from '../../data/ukPipelineStages';
import type { CalibrationTarget } from '../../data/pipelineStages';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/layout/SearchInput';

interface AggregatedTarget extends CalibrationTarget {
  stage: string;
}

export default function CalibrationPage({ country }: { country: string }) {
  const [search, setSearch] = useState('');
  const stages = country === 'uk' ? ukPipelineStages : pipelineStages;

  const allTargets: AggregatedTarget[] = useMemo(() => {
    const targets: AggregatedTarget[] = [];
    for (const stage of stages) {
      if (stage.calibrationTargets) {
        for (const t of stage.calibrationTargets) {
          targets.push({ ...t, stage: stage.title });
        }
      }
    }
    return targets;
  }, [stages]);

  const filtered = useMemo(() => {
    if (!search) return allTargets;
    const q = search.toLowerCase();
    return allTargets.filter(
      (t) =>
        t.variable.toLowerCase().includes(q) ||
        t.source.toLowerCase().includes(q) ||
        t.stage.toLowerCase().includes(q),
    );
  }, [allTargets, search]);

  return (
    <div>
      <PageHeader
        category="Data"
        title="Calibration targets"
        description="PolicyEngine calibrates household survey weights so that weighted aggregates match administrative targets from IRS, CBO, SSA, CMS, and other agencies. Below are all calibration targets used across pipeline stages."
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Search targets..." />

      {filtered.length === 0 ? (
        <p style={{ color: colors.text.tertiary }}>No calibration targets found.</p>
      ) : (
        <div
          style={{
            borderRadius: spacing.radius.xl,
            border: `1px solid ${colors.border.light}`,
            overflow: 'hidden',
            boxShadow: spacing.shadow.sm,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: typography.fontFamily.primary,
            }}
          >
            <thead>
              <tr>
                {['Variable', 'Target', 'Source', 'Pipeline stage'].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: `${spacing.sm} ${spacing.lg}`,
                      textAlign: 'left',
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.secondary,
                      backgroundColor: colors.gray[50],
                      borderBottom: `1px solid ${colors.border.light}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr
                  key={`${t.variable}-${t.stage}-${i}`}
                  style={{
                    borderBottom:
                      i < filtered.length - 1
                        ? `1px solid ${colors.border.light}`
                        : 'none',
                  }}
                >
                  <td
                    style={{
                      padding: `${spacing.sm} ${spacing.lg}`,
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                    }}
                  >
                    {t.variable}
                  </td>
                  <td
                    style={{
                      padding: `${spacing.sm} ${spacing.lg}`,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.primary,
                      fontFamily: typography.fontFamily.mono,
                    }}
                  >
                    {t.target}
                  </td>
                  <td
                    style={{
                      padding: `${spacing.sm} ${spacing.lg}`,
                      fontSize: typography.fontSize.xs,
                      color: colors.text.secondary,
                    }}
                  >
                    {t.source}
                  </td>
                  <td
                    style={{
                      padding: `${spacing.sm} ${spacing.lg}`,
                      fontSize: typography.fontSize.xs,
                      color: colors.text.tertiary,
                    }}
                  >
                    {t.stage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
