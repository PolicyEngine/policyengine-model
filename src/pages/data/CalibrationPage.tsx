import { useState, useMemo } from 'react';
import { colors, typography, spacing } from '../../designTokens';
import { pipelineStages } from '../../data/pipelineStages';
import { ukPipelineStages } from '../../data/ukPipelineStages';
import type { CalibrationTarget } from '../../data/pipelineStages';
import { IconSearch } from '@tabler/icons-react';

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
      <div style={{ marginBottom: spacing['4xl'] }}>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: colors.primary[600],
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: spacing.sm,
          }}
        >
          Data
        </p>
        <h1
          style={{
            fontSize: typography.fontSize['5xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary[900],
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Calibration targets
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
            lineHeight: 1.7,
            marginTop: spacing.lg,
            maxWidth: '720px',
          }}
        >
          PolicyEngine calibrates household survey weights so that weighted aggregates match
          administrative targets from IRS, CBO, SSA, CMS, and other agencies. Below are all
          calibration targets used across pipeline stages.
        </p>
      </div>

      {/* Search */}
      <div
        style={{
          position: 'relative',
          marginBottom: spacing['3xl'],
          maxWidth: '400px',
        }}
      >
        <IconSearch
          size={18}
          stroke={1.5}
          style={{
            position: 'absolute',
            left: spacing.md,
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.text.tertiary,
          }}
        />
        <input
          type="text"
          placeholder="Search targets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: `${spacing.sm} ${spacing.lg} ${spacing.sm} ${spacing['3xl']}`,
            borderRadius: spacing.radius.lg,
            border: `1px solid ${colors.border.light}`,
            fontSize: typography.fontSize.sm,
            fontFamily: typography.fontFamily.primary,
            outline: 'none',
          }}
        />
      </div>

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
