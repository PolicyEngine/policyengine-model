import { motion } from 'framer-motion';
import { colors, typography, spacing } from '../../designTokens';
import { elasticityParams } from '../../data/elasticities';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// Generate budget constraint data
function generateBudgetData() {
  const data = [];
  for (let hours = 0; hours <= 60; hours += 2) {
    const wage = 25;
    const grossIncome = hours * wage;
    const baselineTaxRate = grossIncome > 50000 * (hours / 40) ? 0.22 : 0.1;
    const reformTaxRate = Math.max(0, baselineTaxRate - 0.05);
    data.push({
      hours,
      baseline: Math.round(grossIncome * (1 - baselineTaxRate)),
      reform: Math.round(grossIncome * (1 - reformTaxRate)),
    });
  }
  return data;
}

const budgetData = generateBudgetData();

export default function BehavioralResponses() {
  return (
    <div>
      <p
        style={{
          fontSize: typography.fontSize.lg,
          color: colors.text.secondary,
          lineHeight: 1.7,
          marginBottom: spacing['3xl'],
          maxWidth: '720px',
        }}
      >
        Tax and benefit reforms change incentives to work and earn. PolicyEngine models these
        behavioral responses using the elasticity of taxable income framework, which captures both
        substitution effects (changing work effort) and income effects (adjusting for changes in
        after-tax income).
      </p>

      {/* Two-column: concepts + chart */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing['3xl'],
          marginBottom: spacing['4xl'],
        }}
      >
        {/* Concepts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['2xl'] }}>
          <div
            style={{
              padding: spacing['2xl'],
              borderRadius: spacing.radius.xl,
              border: `1px solid ${colors.border.light}`,
              backgroundColor: colors.white,
            }}
          >
            <h4
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.primary[800],
                margin: `0 0 ${spacing.sm} 0`,
              }}
            >
              Substitution effect
            </h4>
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              When tax rates fall, each hour of work yields more after-tax income. This encourages
              people to substitute toward more labor and less leisure, increasing earnings.
            </p>
          </div>
          <div
            style={{
              padding: spacing['2xl'],
              borderRadius: spacing.radius.xl,
              border: `1px solid ${colors.border.light}`,
              backgroundColor: colors.white,
            }}
          >
            <h4
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.primary[800],
                margin: `0 0 ${spacing.sm} 0`,
              }}
            >
              Income effect
            </h4>
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              When after-tax income rises (e.g., from a new tax credit), people can afford to work
              less while maintaining their standard of living, slightly decreasing earnings.
            </p>
          </div>
        </div>

        {/* Budget constraint chart */}
        <div
          style={{
            padding: spacing['2xl'],
            borderRadius: spacing.radius.xl,
            border: `1px solid ${colors.border.light}`,
            backgroundColor: colors.white,
          }}
        >
          <h4
            style={{
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.lg,
            }}
          >
            Budget constraint: baseline vs. reform
          </h4>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border.light} />
              <XAxis
                dataKey="hours"
                label={{
                  value: 'Hours worked per week',
                  position: 'bottom',
                  offset: -5,
                  style: {
                    fontSize: 12,
                    fill: colors.text.secondary,
                    fontFamily: typography.fontFamily.primary,
                  },
                }}
                tick={{ fontSize: 11, fill: colors.text.tertiary }}
              />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: colors.text.tertiary }}
                label={{
                  value: 'After-tax income',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: {
                    fontSize: 12,
                    fill: colors.text.secondary,
                    fontFamily: typography.fontFamily.primary,
                  },
                }}
              />
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                contentStyle={{
                  borderRadius: spacing.radius.md,
                  border: `1px solid ${colors.border.light}`,
                  fontFamily: typography.fontFamily.primary,
                  fontSize: 12,
                }}
              />
              <ReferenceLine x={40} stroke={colors.gray[300]} strokeDasharray="5 5" />
              <Line
                type="monotone"
                dataKey="baseline"
                stroke={colors.gray[400]}
                strokeWidth={2}
                dot={false}
                name="Baseline"
              />
              <Line
                type="monotone"
                dataKey="reform"
                stroke={colors.primary[500]}
                strokeWidth={2}
                dot={false}
                name="Reform"
              />
            </LineChart>
          </ResponsiveContainer>
          <div
            style={{
              display: 'flex',
              gap: spacing['2xl'],
              justifyContent: 'center',
              marginTop: spacing.md,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <div
                style={{
                  width: '20px',
                  height: '3px',
                  backgroundColor: colors.gray[400],
                  borderRadius: '2px',
                }}
              />
              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                Baseline
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <div
                style={{
                  width: '20px',
                  height: '3px',
                  backgroundColor: colors.primary[500],
                  borderRadius: '2px',
                }}
              />
              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                Reform
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Elasticity parameters table */}
      <h3
        style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.primary[900],
          marginBottom: spacing['2xl'],
        }}
      >
        Elasticity parameters
      </h3>
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
              {['Parameter', 'Value', 'Description', 'Source'].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    textAlign: 'left',
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.secondary,
                    backgroundColor: colors.gray[50],
                    borderBottom: `1px solid ${colors.border.light}`,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {elasticityParams.map((param, i) => (
              <motion.tr
                key={param.parameter}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  borderBottom:
                    i < elasticityParams.length - 1
                      ? `1px solid ${colors.border.light}`
                      : 'none',
                }}
              >
                <td
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                  }}
                >
                  {param.parameter}
                </td>
                <td
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    fontSize: typography.fontSize.sm,
                    color: colors.primary[700],
                    fontWeight: typography.fontWeight.bold,
                    fontFamily: typography.fontFamily.mono,
                  }}
                >
                  {param.value}
                </td>
                <td
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    fontSize: typography.fontSize.xs,
                    color: colors.text.secondary,
                    maxWidth: '300px',
                    lineHeight: 1.5,
                  }}
                >
                  {param.description}
                </td>
                <td
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    fontSize: typography.fontSize.xs,
                    color: colors.text.tertiary,
                    fontStyle: 'italic',
                  }}
                >
                  {param.source}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
