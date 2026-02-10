import { motion } from 'framer-motion';
import { colors, typography, spacing } from '../../designTokens';
import { cboDefaults, BLOG_URL, sources } from '../../data/elasticities';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function generateBudgetData(substitutionElasticity: number, incomeElasticity: number) {
  const data = [];
  const wage = 25;
  const baselineHours = 40;
  for (let hours = 0; hours <= 60; hours += 2) {
    const grossIncome = hours * wage;
    const baselineTaxRate = grossIncome > 50000 * (hours / baselineHours) ? 0.22 : 0.1;
    const reformTaxRate = Math.max(0, baselineTaxRate - 0.05);
    const baselineNet = Math.round(grossIncome * (1 - baselineTaxRate));
    const reformNetStatic = Math.round(grossIncome * (1 - reformTaxRate));
    const ntrChange = (1 - reformTaxRate) / (1 - baselineTaxRate) - 1;
    const incomeChange = (reformNetStatic - baselineNet) / Math.max(baselineNet, 1);
    const earningsChange = substitutionElasticity * ntrChange + incomeElasticity * incomeChange;
    const reformNetBehavioral = Math.round(reformNetStatic * (1 + earningsChange));
    data.push({ hours, baseline: baselineNet, reform: reformNetStatic, behavioral: reformNetBehavioral });
  }
  return data;
}

export default function BehavioralResponses({ country = 'us' }: { country?: string }) {
  const currencySymbol = country === 'uk' ? '£' : '$';
  const avgSubstitution = cboDefaults.substitutionElasticities.reduce((a, b) => a + b.central, 0) / cboDefaults.substitutionElasticities.length;
  const budgetData = generateBudgetData(avgSubstitution, cboDefaults.incomeElasticity.central);

  return (
    <div>
      <p style={{ fontSize: typography.fontSize.lg, color: colors.text.secondary, lineHeight: 1.7, marginBottom: spacing.md, maxWidth: '720px' }}>
        Tax and benefit reforms change incentives to work and earn. PolicyEngine models these
        {country === 'uk' ? ' behavioural' : ' behavioral'} responses using the elasticity of taxable income framework, capturing both
        substitution effects (changing work effort) and income effects (adjusting for changes in after-tax income).
      </p>
      <p style={{ fontSize: typography.fontSize.sm, color: colors.primary[600], marginBottom: spacing['3xl'] }}>
        <a href={BLOG_URL} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary[600], textDecoration: 'underline' }}>
          Read our full methodology →
        </a>
      </p>

      {/* Concepts + chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing['3xl'], marginBottom: spacing['4xl'] }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['2xl'] }}>
          <div style={{ padding: spacing['2xl'], borderRadius: spacing.radius.xl, border: `1px solid ${colors.border.light}`, backgroundColor: colors.white }}>
            <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.primary[800], margin: `0 0 ${spacing.sm} 0` }}>
              Substitution effect
            </h4>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.6, margin: 0 }}>
              When tax rates fall, each hour of work yields more after-tax income. This encourages people to substitute toward more labor and less leisure, increasing earnings.
            </p>
          </div>
          <div style={{ padding: spacing['2xl'], borderRadius: spacing.radius.xl, border: `1px solid ${colors.border.light}`, backgroundColor: colors.white }}>
            <h4 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.primary[800], margin: `0 0 ${spacing.sm} 0` }}>
              Income effect
            </h4>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.6, margin: 0 }}>
              When after-tax income rises (e.g., from a new tax credit), people can afford to work less while maintaining their standard of living, slightly decreasing earnings.
            </p>
          </div>
        </div>

        <div style={{ padding: spacing['2xl'], borderRadius: spacing.radius.xl, border: `1px solid ${colors.border.light}`, backgroundColor: colors.white }}>
          <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.lg }}>
            Budget constraint: baseline vs. reform
          </h4>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border.light} />
              <XAxis dataKey="hours" label={{ value: 'Hours worked per week', position: 'bottom', offset: -5, style: { fontSize: 12, fill: colors.text.secondary, fontFamily: typography.fontFamily.primary } }} tick={{ fontSize: 11, fill: colors.text.tertiary }} />
              <YAxis tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: colors.text.tertiary }} label={{ value: 'After-tax income', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12, fill: colors.text.secondary, fontFamily: typography.fontFamily.primary } }} />
              <Tooltip formatter={(value) => [`${currencySymbol}${Number(value).toLocaleString()}`, '']} contentStyle={{ borderRadius: spacing.radius.md, border: `1px solid ${colors.border.light}`, fontFamily: typography.fontFamily.primary, fontSize: 12 }} />
              <ReferenceLine x={40} stroke={colors.gray[300]} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="baseline" stroke={colors.gray[400]} strokeWidth={2} dot={false} name="Baseline" />
              <Line type="monotone" dataKey="reform" stroke={colors.primary[500]} strokeWidth={2} dot={false} name="Reform (static)" />
              <Line type="monotone" dataKey="behavioral" stroke={colors.warning} strokeWidth={2} dot={false} name={country === 'uk' ? 'Reform (behavioural)' : 'Reform (behavioral)'} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: spacing['2xl'], justifyContent: 'center', marginTop: spacing.md, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <div style={{ width: '20px', height: '3px', backgroundColor: colors.gray[400], borderRadius: '2px' }} />
              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Baseline</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <div style={{ width: '20px', height: '3px', backgroundColor: colors.primary[500], borderRadius: '2px' }} />
              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Reform (static)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <div style={{ width: '20px', height: '3px', backgroundColor: colors.warning, borderRadius: '2px', borderTop: '1px dashed transparent' }} />
              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>{country === 'uk' ? 'Reform (behavioural)' : 'Reform (behavioral)'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CBO default parameters */}
      <div style={{ marginBottom: spacing['2xl'] }}>
        <h3 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary[900], margin: `0 0 ${spacing.sm} 0` }}>
          Default elasticity parameters
        </h3>
        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.6, marginBottom: spacing['2xl'], maxWidth: '720px' }}>
          PolicyEngine uses CBO elasticity estimates by default, but all parameters are fully adjustable in the model. Users can set custom values or disable
          {country === 'uk' ? ' behavioural' : ' behavioral'} responses entirely.
        </p>
      </div>

      {/* Income elasticity */}
      <div style={{ marginBottom: spacing['3xl'] }}>
        <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.md }}>
          Income elasticity (all earners)
        </h4>
        <div style={{ display: 'flex', gap: spacing['2xl'], flexWrap: 'wrap' }}>
          {[
            { label: 'Lower', value: cboDefaults.incomeElasticity.lower },
            { label: 'Central', value: cboDefaults.incomeElasticity.central },
            { label: 'Upper', value: cboDefaults.incomeElasticity.higher },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: `${spacing.md} ${spacing.xl}`, borderRadius: spacing.radius.lg, border: `1px solid ${label === 'Central' ? colors.primary[300] : colors.border.light}`, backgroundColor: label === 'Central' ? colors.primary[50] : colors.white, textAlign: 'center', minWidth: '100px' }}>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing.xs }}>{label}</div>
              <div style={{ fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.mono, color: label === 'Central' ? colors.primary[700] : colors.text.primary, fontWeight: typography.fontWeight.bold }}>{value.toFixed(2)}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing.sm }}>
          {sources.laborSupply}
        </p>
      </div>

      {/* Substitution elasticities by decile */}
      <div style={{ marginBottom: spacing['3xl'] }}>
        <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.lg }}>
          Substitution elasticity by income decile
        </h4>
        <div style={{ borderRadius: spacing.radius.xl, border: `1px solid ${colors.border.light}`, overflowX: 'auto', boxShadow: spacing.shadow.sm }}>
          <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', fontFamily: typography.fontFamily.primary }}>
            <thead>
              <tr>
                {['Decile', 'Lower', 'Central', 'Upper'].map(col => (
                  <th key={col} style={{ padding: `${spacing.sm} ${spacing.md}`, textAlign: col === 'Decile' ? 'left' : 'center', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, backgroundColor: colors.gray[50], borderBottom: `1px solid ${colors.border.light}`, whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cboDefaults.substitutionElasticities.map((row, i) => (
                <motion.tr
                  key={row.decile}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ borderBottom: i < 9 ? `1px solid ${colors.border.light}` : 'none' }}
                >
                  <td style={{ padding: `${spacing.sm} ${spacing.md}`, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>{row.decile}</td>
                  <td style={{ padding: `${spacing.sm} ${spacing.md}`, textAlign: 'center', fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>{row.lower.toFixed(2)}</td>
                  <td style={{ padding: `${spacing.sm} ${spacing.md}`, textAlign: 'center', fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.mono, color: colors.primary[700], fontWeight: typography.fontWeight.bold }}>{row.central.toFixed(2)}</td>
                  <td style={{ padding: `${spacing.sm} ${spacing.md}`, textAlign: 'center', fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>{row.higher.toFixed(2)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing.sm }}>
          {sources.elasticityReview}
        </p>
      </div>

      {/* Capital gains */}
      <div style={{ marginBottom: spacing['3xl'] }}>
        <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.md }}>
          Capital gains elasticity
        </h4>
        <div style={{ display: 'flex', gap: spacing['2xl'], flexWrap: 'wrap' }}>
          {[
            { label: 'Persistent', value: cboDefaults.capitalGainsPersistent },
            { label: 'Transitory', value: cboDefaults.capitalGainsTransitory },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: `${spacing.md} ${spacing.xl}`, borderRadius: spacing.radius.lg, border: `1px solid ${colors.border.light}`, backgroundColor: colors.white, textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing.xs }}>{label}</div>
              <div style={{ fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.mono, color: colors.text.primary, fontWeight: typography.fontWeight.bold }}>{value.toFixed(2)}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing.sm }}>
          {sources.capitalGains}
        </p>
      </div>
    </div>
  );
}
