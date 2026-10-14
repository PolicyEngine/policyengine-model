import { colors, typography, spacing } from '../../designTokens';
import {
  UK_MODEL_VERSION,
  capitalGainsParameters,
  labourSupplyParameters,
  obrElasticities,
  ukSourceLinks,
  type ParameterRow,
} from '../../data/ukBehaviouralResponses';
import { DataTable, ExternalLink, bodyText, cell, sectionHeading } from '../../views/data/ukTables';

const fmtElasticity = (x: number) => (x === 0 ? '0' : x < 0 ? `−${Math.abs(x).toFixed(3).replace(/0+$/, '')}` : x.toFixed(3).replace(/0+$/, ''));

function ParameterTable({ rows }: { rows: ParameterRow[] }) {
  return (
    <DataTable head={['Parameter', 'Default']} minWidth={520}>
      {rows.map((r) => (
        <tr key={r.path}>
          <td style={cell('left')}>
            <div style={{ fontWeight: typography.fontWeight.medium }}>{r.label}</div>
            <div style={{ fontFamily: typography.fontFamily.mono, fontSize: typography.fontSize.xs, color: colors.text.tertiary, wordBreak: 'break-all' }}>
              {r.path}
            </div>
          </td>
          <td style={cell('right', { whiteSpace: 'nowrap' })}>{r.value}</td>
        </tr>
      ))}
    </DataTable>
  );
}

/** PolicyEngine UK's behavioural responses, from policyengine-uk's own parameters and code. */
export default function UkBehaviouralResponses() {
  return (
    <div>
      <p style={{ ...bodyText, fontSize: typography.fontSize.lg }}>
        PolicyEngine UK simulates reforms statically by default: earnings and capital gains stay as they were before
        the reform. policyengine-uk {UK_MODEL_VERSION}, the version policyengine.py 6.3.4 pins, offers three optional
        behavioural responses.
      </p>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Labour supply</h2>
        <p style={bodyText}>
          Two elasticities set how employment income responds to a reform, and both are 0 by default. When either is
          set, each person’s employment income changes by
        </p>
        <p
          style={{
            fontFamily: typography.fontFamily.mono,
            fontSize: typography.fontSize.sm,
            color: colors.text.primary,
            backgroundColor: colors.gray[50],
            border: `1px solid ${colors.border.light}`,
            borderRadius: spacing.radius.lg,
            padding: spacing.lg,
            margin: `0 0 ${spacing.lg}`,
            maxWidth: '760px',
            overflowWrap: 'anywhere',
          }}
        >
          employment income × (income elasticity × change in household net income + substitution elasticity × change
          in marginal wage)
        </p>
        <p style={bodyText}>
          Each change compares the reform with the baseline and stops at 100%. Employment income means the amount
          before the response, and the marginal wage means one minus the person’s marginal tax rate. The response
          feeds into the reform’s taxes and benefits.
        </p>
        <ParameterTable rows={labourSupplyParameters} />
      </section>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Labour supply, the OBR’s way</h2>
        <p style={bodyText}>
          A module in policyengine-uk’s Python interface (<code>Simulation.apply_dynamics</code>) estimates how
          working hours respond to a reform with elasticities that vary by family type and the age of the youngest
          child, which it takes from the OBR’s note on{' '}
          <ExternalLink href={ukSourceLinks.obrNote}>the labour supply effects of the Autumn 2023 National Insurance cut</ExternalLink>.
          It covers the two eldest adults in each household, except the self-employed, full-time students and people
          aged 60 or over, and models hours only: the participation response is not yet switched on. It reports the
          change in earnings and in full-time-equivalent employment alongside the reform, without feeding it back
          into the reform’s taxes and benefits.
        </p>
        <DataTable head={['Group', 'Youngest child', 'Substitution elasticity', 'Income elasticity']} minWidth={600}>
          {obrElasticities.map((r) => (
            <tr key={`${r.group}-${r.youngestChild}`}>
              <td style={cell('left', { fontWeight: typography.fontWeight.medium })}>{r.group}</td>
              <td style={cell()}>{r.youngestChild}</td>
              <td style={cell()}>{fmtElasticity(r.substitution)}</td>
              <td style={cell()}>{fmtElasticity(r.income)}</td>
            </tr>
          ))}
        </DataTable>
        <p style={{ ...bodyText, fontSize: typography.fontSize.sm, marginTop: spacing.md }}>
          Married means married or in a civil partnership; children are members of the benefit unit under 18. The module
          gives no elasticity to unmarried men with children.
        </p>
      </section>

      <section style={{ marginBottom: spacing['3xl'] }}>
        <h2 style={sectionHeading}>Capital gains</h2>
        <p style={bodyText}>
          An elasticity of realised gains with respect to the retention rate, the share of a marginal pound of gains
          kept after tax, sets how gains respond, and it is 0 by default. Under a reform, each person’s gains scale by
          the ratio of their reform to baseline retention rates, raised to the elasticity. Gains that qualify for
          Business Asset Disposal Relief can take their own elasticity, 1.4, the value the OBR used for those gains in
          its <ExternalLink href={ukSourceLinks.obrCgt}>January 2025 capital gains tax costing</ExternalLink>; until that
          switch is on, they take the main elasticity.
        </p>
        <ParameterTable rows={capitalGainsParameters} />
      </section>

      <p style={{ ...bodyText, fontSize: typography.fontSize.sm }}>
        Sources: policyengine-uk {UK_MODEL_VERSION}{' '}
        <ExternalLink href={ukSourceLinks.parameters}>simulation parameters</ExternalLink> and{' '}
        <ExternalLink href={ukSourceLinks.dynamics}>labour supply module</ExternalLink>.
      </p>
    </div>
  );
}
