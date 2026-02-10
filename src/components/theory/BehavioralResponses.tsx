import { useState } from 'react';
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
  const [incomeElasticity, setIncomeElasticity] = useState(cboDefaults.incomeElasticity.central);
  const [substitutionElasticities, setSubstitutionElasticities] = useState(
    cboDefaults.substitutionElasticities.map(e => e.central)
  );
  const [capGainsPersistent, setCapGainsPersistent] = useState(cboDefaults.capitalGainsPersistent);
  const [preset, setPreset] = useState<'cbo' | 'off' | 'custom'>('cbo');

  const avgSubstitution = substitutionElasticities.reduce((a, b) => a + b, 0) / substitutionElasticities.length;
  const budgetData = generateBudgetData(avgSubstitution, incomeElasticity);

  const applyPreset = (p: 'cbo' | 'off') => {
    setPreset(p);
    if (p === 'cbo') {
      setIncomeElasticity(cboDefaults.incomeElasticity.central);
      setSubstitutionElasticities(cboDefaults.substitutionElasticities.map(e => e.central));
      setCapGainsPersistent(cboDefaults.capitalGainsPersistent);
    } else {
      setIncomeElasticity(0);
      setSubstitutionElasticities(Array(10).fill(0));
      setCapGainsPersistent(0);
    }
  };

  const handleSubElasticityChange = (index: number, value: number) => {
    const next = [...substitutionElasticities];
    next[index] = value;
    setSubstitutionElasticities(next);
    setPreset('custom');
  };

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
              {(incomeElasticity !== 0 || avgSubstitution !== 0) && (
                <Line type="monotone" dataKey="behavioral" stroke={colors.warning} strokeWidth={2} dot={false} name={country === 'uk' ? 'Reform (behavioural)' : 'Reform (behavioral)'} strokeDasharray="5 5" />
              )}
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
            {(incomeElasticity !== 0 || avgSubstitution !== 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <div style={{ width: '20px', height: '3px', backgroundColor: colors.warning, borderRadius: '2px', borderTop: '1px dashed transparent' }} />
                <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>{country === 'uk' ? 'Reform (behavioural)' : 'Reform (behavioral)'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, marginBottom: spacing['2xl'], flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary[900], margin: 0 }}>
          Elasticity parameters
        </h3>
        <div style={{ display: 'flex', gap: spacing.sm }}>
          {(['cbo', 'off'] as const).map(p => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              style={{
                padding: `${spacing.xs} ${spacing.lg}`,
                borderRadius: spacing.radius.md,
                border: `1px solid ${preset === p ? colors.primary[500] : colors.border.light}`,
                backgroundColor: preset === p ? colors.primary[50] : colors.white,
                color: preset === p ? colors.primary[700] : colors.text.secondary,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                fontFamily: typography.fontFamily.primary,
                cursor: 'pointer',
              }}
            >
              {p === 'cbo' ? 'CBO defaults' : 'Off (all zero)'}
            </button>
          ))}
          {preset === 'custom' && (
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, padding: `${spacing.xs} ${spacing.md}`, backgroundColor: colors.gray[100], borderRadius: spacing.radius.md }}>
              Custom
            </span>
          )}
        </div>
      </div>

      {/* Income elasticity */}
      <div style={{ marginBottom: spacing['3xl'] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md }}>
          <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, margin: 0 }}>
            Income elasticity (all earners)
          </h4>
          <span style={{ fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.mono, color: colors.primary[700], fontWeight: typography.fontWeight.bold }}>
            {incomeElasticity.toFixed(2)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, width: '40px' }}>-0.10</span>
          <input
            type="range"
            min={-0.10}
            max={0.00}
            step={0.01}
            value={incomeElasticity}
            onChange={e => { setIncomeElasticity(parseFloat(e.target.value)); setPreset('custom'); }}
            style={{ flex: 1, accentColor: colors.primary[500] }}
          />
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, width: '30px' }}>0.00</span>
        </div>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing.xs }}>
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
                {['Decile', 'CBO lower', 'Value', 'CBO upper'].map(col => (
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
                  <td style={{ padding: `${spacing.sm} ${spacing.md}`, textAlign: 'center', fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{row.lower.toFixed(2)}</td>
                  <td style={{ padding: `${spacing.sm} ${spacing.md}`, textAlign: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={substitutionElasticities[i]}
                      onChange={e => handleSubElasticityChange(i, parseFloat(e.target.value) || 0)}
                      style={{
                        width: '60px',
                        padding: `2px ${spacing.sm}`,
                        borderRadius: spacing.radius.sm,
                        border: `1px solid ${colors.border.light}`,
                        fontSize: typography.fontSize.sm,
                        fontFamily: typography.fontFamily.mono,
                        color: colors.primary[700],
                        fontWeight: typography.fontWeight.bold,
                        textAlign: 'center',
                      }}
                    />
                  </td>
                  <td style={{ padding: `${spacing.sm} ${spacing.md}`, textAlign: 'center', fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{row.higher.toFixed(2)}</td>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md }}>
          <h4 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, margin: 0 }}>
            Capital gains elasticity (persistent)
          </h4>
          <span style={{ fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.mono, color: colors.primary[700], fontWeight: typography.fontWeight.bold }}>
            {capGainsPersistent.toFixed(2)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, width: '40px' }}>-1.50</span>
          <input
            type="range"
            min={-1.50}
            max={0}
            step={0.01}
            value={capGainsPersistent}
            onChange={e => { setCapGainsPersistent(parseFloat(e.target.value)); setPreset('custom'); }}
            style={{ flex: 1, accentColor: colors.primary[500] }}
          />
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, width: '30px' }}>0.00</span>
        </div>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing.xs }}>
          CBO central estimate: {cboDefaults.capitalGainsPersistent} (persistent), {cboDefaults.capitalGainsTransitory} (transitory). {sources.capitalGains}
        </p>
      </div>
    </div>
  );
}
