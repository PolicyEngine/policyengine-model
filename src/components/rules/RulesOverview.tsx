import { motion } from 'framer-motion';
import { colors, typography, spacing, statusColors } from '../../designTokens';
import { programs, getStatusCounts } from '../../data/programs';
import type { CoverageStatus } from '../../types/Program';

const statusLabels: Record<CoverageStatus, string> = {
  complete: 'Complete',
  partial: 'Partial',
  inProgress: 'In progress',
  notStarted: 'Not started',
};

function StatCard({
  label,
  count,
  color,
  delay,
}: {
  label: string;
  count: number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      style={{
        flex: 1,
        minWidth: '140px',
        padding: spacing['2xl'],
        borderRadius: spacing.radius.xl,
        border: `1px solid ${colors.border.light}`,
        backgroundColor: colors.white,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: typography.fontSize['4xl'],
          fontWeight: typography.fontWeight.bold,
          color,
          marginBottom: spacing.xs,
        }}
      >
        {count}
      </div>
      <div
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          fontWeight: typography.fontWeight.medium,
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}

function StatusDot({ status }: { status: CoverageStatus }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: statusColors[status],
      }}
    />
  );
}

export default function RulesOverview() {
  const counts = getStatusCounts();
  const total = programs.length;

  // Group by agency/category
  const groups = new Map<string, typeof programs>();
  programs.forEach((p) => {
    const key = p.agency || p.category || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });

  return (
    <div>
      {/* Summary stats */}
      <div
        style={{
          display: 'flex',
          gap: spacing.lg,
          flexWrap: 'wrap',
          marginBottom: spacing['4xl'],
        }}
      >
        <StatCard label="Total programs" count={total} color={colors.primary[900]} delay={0} />
        <StatCard label="Complete" count={counts.complete} color={statusColors.complete} delay={0.1} />
        <StatCard label="Partial" count={counts.partial} color={statusColors.partial} delay={0.2} />
        <StatCard label="In progress" count={counts.inProgress} color={statusColors.inProgress} delay={0.3} />
      </div>

      {/* Program groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['3xl'] }}>
        {Array.from(groups.entries()).map(([groupName, groupPrograms]) => (
          <div key={groupName}>
            <h3
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.primary[800],
                marginBottom: spacing.lg,
                paddingBottom: spacing.sm,
                borderBottom: `2px solid ${colors.primary[100]}`,
              }}
            >
              {groupName}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: spacing.md,
              }}
            >
              {groupPrograms.map((program) => (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    padding: spacing.lg,
                    borderRadius: spacing.radius.lg,
                    border: `1px solid ${colors.border.light}`,
                    backgroundColor: colors.white,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: spacing.md,
                  }}
                >
                  <div style={{ paddingTop: '3px' }}>
                    <StatusDot status={program.status} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                      }}
                    >
                      {program.name}
                    </div>
                    {program.fullName && program.fullName !== program.name && (
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.tertiary,
                          marginTop: '2px',
                        }}
                      >
                        {program.fullName}
                      </div>
                    )}
                    {program.coverage && (
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.tertiary,
                          marginTop: '2px',
                        }}
                      >
                        {program.coverage}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: statusColors[program.status],
                      fontWeight: typography.fontWeight.medium,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusLabels[program.status]}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
