import { colors, typography, spacing } from '../../designTokens';
import {
  UK_MODEL_VERSION,
  capitalGainsParameters,
  labourSupplyParameters,
  obrElasticities,
  payParameters,
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
        In policyengine-uk {UK_MODEL_VERSION}, the version policyengine.py 6.3.4 pins, the labour supply and capital
        gains responses below are off by default. Two modelling assumptions do change pay by default, under reforms
        to employer National Insurance or to salary sacrifice.
      </p>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Pay under employer National Insurance and salary sacrifice reforms</h2>
        <p style={bodyText}>
          When a reform changes employer National Insurance, through its rate, its threshold or its treatment of
          employer pension contributions, the model holds what each employer pays for each employee fixed, and by
          default passes the whole change through to pay. Pay below the employer threshold stays as it was.
        </p>
        <p style={bodyText}>
          When a cap on salary-sacrificed pension contributions free of National Insurance applies, as the model’s
          current law has it from April 2029, contributions above the cap return to pay, and every worker’s pay falls
          by 0.16%, the parameter’s estimate of employers spreading the extra National Insurance across all staff.
        </p>
        <ParameterTable rows={payParameters} />
      </section>

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
          employment income before the response × (income elasticity × relative change in household net income +
          substitution elasticity × relative change in the marginal wage)
        </p>
        <p style={bodyText}>
          Each relative change compares the reform with the baseline and is capped at 100% either way. The marginal
          wage is one minus the person’s marginal tax rate. Negative employment income counts as zero, household net
          income below £1 counts as £1, and a marginal wage of zero counts as 0.01. The response feeds into the
          reform’s taxes and benefits.
        </p>
        <ParameterTable rows={labourSupplyParameters} />
      </section>

      <section style={{ marginBottom: spacing['4xl'] }}>
        <h2 style={sectionHeading}>Labour supply, the OBR’s way</h2>
        <p style={bodyText}>
          A module in policyengine-uk’s Python interface (<code>Simulation.apply_dynamics</code>), when called,
          estimates how working hours respond to a reform, with elasticities that vary by family type and the age of
          the youngest child. Its parameter file cites the OBR’s note on{' '}
          <ExternalLink href={ukSourceLinks.obrNote}>the labour supply effects of the Autumn 2023 National Insurance cut</ExternalLink>.
          It covers the two eldest adults in each household, except people whose employment status is self-employed
          or student and people aged 60 or over, and models hours only: the participation response is not yet
          switched on. It writes the change in earnings into the reform simulation, so taxes and benefits calculated
          afterwards include it, and reports the change in earnings and in full-time-equivalent employment.
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
          Married means married or in a civil partnership, as the survey records it; without that input, the model
          treats every couple as married. Children are members of the benefit unit under 18. The module gives no
          elasticity to unmarried men with children.
        </p>
      </section>

      <section style={{ marginBottom: spacing['3xl'] }}>
        <h2 style={sectionHeading}>Capital gains</h2>
        <p style={bodyText}>
          An elasticity of realised gains with respect to the retention rate sets how gains respond, and it is 0 by
          default. The retention rate is one minus the person’s marginal rate on gains, which the model measures as
          the rise in household net income from £1,000 more gains (or 0.1% of their gains, if larger), for the two
          adults in each household with the largest gains before the response; it counts as at least 0.001. Under a
          reform, each person’s gains scale by the ratio of their reform to baseline retention rates, raised to the
          elasticity. Gains that qualify for Business Asset Disposal Relief can take their own elasticity, 1.4, which
          the parameter cites to the OBR’s{' '}
          <ExternalLink href={ukSourceLinks.obrCgt}>January 2025 capital gains tax costing</ExternalLink>; until that
          switch is on, they take the main elasticity. A tax-rate elasticity offers the same response in another
          convention, and the model refuses to run with both set.
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
