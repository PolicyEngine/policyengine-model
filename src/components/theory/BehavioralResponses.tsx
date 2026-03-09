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
      <p className="tw:text-lg tw:text-[#5A5A5A] tw:leading-[1.7] tw:mb-3 tw:max-w-[720px]">
        Tax and benefit reforms change incentives to work and earn. PolicyEngine models these
        {country === 'uk' ? ' behavioural' : ' behavioral'} responses using the elasticity of taxable income framework, capturing both
        substitution effects (changing work effort) and income effects (adjusting for changes in after-tax income).
      </p>
      <p className="tw:text-sm tw:text-pe-primary-600 tw:mb-8">
        <a href={BLOG_URL} target="_blank" rel="noopener noreferrer" className="tw:text-pe-primary-600 tw:underline">
          Read our full methodology →
        </a>
      </p>

      {/* Concepts + chart */}
      <div className="tw:grid tw:grid-cols-2 tw:gap-8 tw:mb-12">
        <div className="tw:flex tw:flex-col tw:gap-6">
          <div className="tw:p-6 tw:rounded-xl tw:border tw:border-[#E2E8F0] tw:bg-white">
            <h4 className="tw:text-lg tw:font-bold tw:text-pe-primary-800 tw:mb-2">
              Substitution effect
            </h4>
            <p className="tw:text-sm tw:text-[#5A5A5A] tw:leading-[1.6]">
              When tax rates fall, each hour of work yields more after-tax income. This encourages people to substitute toward more labor and less leisure, increasing earnings.
            </p>
          </div>
          <div className="tw:p-6 tw:rounded-xl tw:border tw:border-[#E2E8F0] tw:bg-white">
            <h4 className="tw:text-lg tw:font-bold tw:text-pe-primary-800 tw:mb-2">
              Income effect
            </h4>
            <p className="tw:text-sm tw:text-[#5A5A5A] tw:leading-[1.6]">
              When after-tax income rises (e.g., from a new tax credit), people can afford to work less while maintaining their standard of living, slightly decreasing earnings.
            </p>
          </div>
        </div>

        <div className="tw:p-6 tw:rounded-xl tw:border tw:border-[#E2E8F0] tw:bg-white">
          <h4 className="tw:text-base tw:font-semibold tw:text-black tw:mb-4">
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
          <div className="tw:flex tw:gap-6 tw:justify-center tw:mt-3 tw:flex-wrap">
            <div className="tw:flex tw:items-center tw:gap-2">
              <div className="tw:w-5 tw:h-[3px] tw:rounded-sm" style={{ backgroundColor: colors.gray[400] }} />
              <span className="tw:text-xs tw:text-[#5A5A5A]">Baseline</span>
            </div>
            <div className="tw:flex tw:items-center tw:gap-2">
              <div className="tw:w-5 tw:h-[3px] tw:rounded-sm" style={{ backgroundColor: colors.primary[500] }} />
              <span className="tw:text-xs tw:text-[#5A5A5A]">Reform (static)</span>
            </div>
            <div className="tw:flex tw:items-center tw:gap-2">
              <div className="tw:w-5 tw:h-[3px] tw:rounded-sm" style={{ backgroundColor: colors.warning }} />
              <span className="tw:text-xs tw:text-[#5A5A5A]">{country === 'uk' ? 'Reform (behavioural)' : 'Reform (behavioral)'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CBO default parameters */}
      <div className="tw:mb-6">
        <h3 className="tw:text-2xl tw:font-bold tw:text-pe-primary-900 tw:mb-2">
          Default elasticity parameters
        </h3>
        <p className="tw:text-sm tw:text-[#5A5A5A] tw:leading-[1.6] tw:mb-6 tw:max-w-[720px]">
          PolicyEngine uses CBO elasticity estimates by default, but all parameters are fully adjustable in the model. Users can set custom values or disable
          {country === 'uk' ? ' behavioural' : ' behavioral'} responses entirely.
        </p>
      </div>

      {/* Income elasticity */}
      <div className="tw:mb-8">
        <h4 className="tw:text-base tw:font-semibold tw:text-black tw:mb-3">
          Income elasticity (all earners)
        </h4>
        <div className="tw:flex tw:gap-6 tw:flex-wrap">
          {[
            { label: 'Lower', value: cboDefaults.incomeElasticity.lower },
            { label: 'Central', value: cboDefaults.incomeElasticity.central },
            { label: 'Upper', value: cboDefaults.incomeElasticity.higher },
          ].map(({ label, value }) => (
            <div
              key={label}
              className={`tw:py-3 tw:px-5 tw:rounded-lg tw:border tw:text-center tw:min-w-[100px] ${
                label === 'Central'
                  ? 'tw:border-pe-primary-300 tw:bg-pe-primary-50'
                  : 'tw:border-[#E2E8F0] tw:bg-white'
              }`}
            >
              <div className="tw:text-xs tw:text-pe-gray-400 tw:mb-1">{label}</div>
              <div className={`tw:text-lg tw:font-mono tw:font-bold ${
                label === 'Central' ? 'tw:text-pe-primary-700' : 'tw:text-black'
              }`}>{value.toFixed(2)}</div>
            </div>
          ))}
        </div>
        <p className="tw:text-xs tw:text-pe-gray-400 tw:mt-2">
          {sources.laborSupply}
        </p>
      </div>

      {/* Substitution elasticities by decile */}
      <div className="tw:mb-8">
        <h4 className="tw:text-base tw:font-semibold tw:text-black tw:mb-4">
          Substitution elasticity by income decile
        </h4>
        <div className="tw:rounded-xl tw:border tw:border-[#E2E8F0] tw:overflow-x-auto tw:shadow-sm">
          <table className="tw:w-full tw:min-w-[400px] tw:border-collapse tw:font-primary">
            <thead>
              <tr>
                {['Decile', 'Lower', 'Central', 'Upper'].map(col => (
                  <th
                    key={col}
                    className={`tw:py-2 tw:px-3 tw:text-xs tw:font-semibold tw:text-[#5A5A5A] tw:bg-pe-gray-50 tw:border-b tw:border-[#E2E8F0] tw:whitespace-nowrap ${
                      col === 'Decile' ? 'tw:text-left' : 'tw:text-center'
                    }`}
                  >
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
                  <td className="tw:py-2 tw:px-3 tw:text-sm tw:font-medium tw:text-black">{row.decile}</td>
                  <td className="tw:py-2 tw:px-3 tw:text-center tw:text-sm tw:text-pe-gray-400">{row.lower.toFixed(2)}</td>
                  <td className="tw:py-2 tw:px-3 tw:text-center tw:text-sm tw:font-mono tw:text-pe-primary-700 tw:font-bold">{row.central.toFixed(2)}</td>
                  <td className="tw:py-2 tw:px-3 tw:text-center tw:text-sm tw:text-pe-gray-400">{row.higher.toFixed(2)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tw:text-xs tw:text-pe-gray-400 tw:mt-2">
          {sources.elasticityReview}
        </p>
      </div>

      {/* Capital gains */}
      <div className="tw:mb-8">
        <h4 className="tw:text-base tw:font-semibold tw:text-black tw:mb-3">
          Capital gains elasticity
        </h4>
        <div className="tw:flex tw:gap-6 tw:flex-wrap">
          {[
            { label: 'Persistent', value: cboDefaults.capitalGainsPersistent },
            { label: 'Transitory', value: cboDefaults.capitalGainsTransitory },
          ].map(({ label, value }) => (
            <div key={label} className="tw:py-3 tw:px-5 tw:rounded-lg tw:border tw:border-[#E2E8F0] tw:bg-white tw:text-center tw:min-w-[120px]">
              <div className="tw:text-xs tw:text-pe-gray-400 tw:mb-1">{label}</div>
              <div className="tw:text-lg tw:font-mono tw:text-black tw:font-bold">{value.toFixed(2)}</div>
            </div>
          ))}
        </div>
        <p className="tw:text-xs tw:text-pe-gray-400 tw:mt-2">
          {sources.capitalGains}
        </p>
      </div>
    </div>
  );
}
