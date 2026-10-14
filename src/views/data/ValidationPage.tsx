import type { CSSProperties, ReactNode } from 'react';
import { colors, typography, spacing } from '../../designTokens';
import { IconExternalLink } from '@tabler/icons-react';
import PageHeader from '../../components/layout/PageHeader';
import { getSubGroupLabel } from '../../components/shared/categoryUtils';
import type { Country } from '../../hooks/useCountry';
import {
  TAXSIM_DASHBOARD_URL,
  TAXSIM_MATCH_RULES_URL,
  TAXSIM_REPO_URL,
  type TaxsimValidation,
  type TaxsimYearResult,
} from '../../data/fetchTaxsimValidation';

const UK_BOOK_URL = 'https://policyengine.github.io/policyengine-uk';

const bodyText: CSSProperties = {
  fontSize: typography.fontSize.base,
  color: colors.text.secondary,
  lineHeight: 1.7,
  margin: 0,
};

const sectionHeading: CSSProperties = {
  fontSize: typography.fontSize['2xl'],
  fontWeight: typography.fontWeight.bold,
  color: colors.primary[900],
  margin: `0 0 ${spacing.md}`,
};

const linkStyle: CSSProperties = {
  color: colors.primary[700],
  fontWeight: typography.fontWeight.medium,
};

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
      {children}
    </a>
  );
}

function pct(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

function yearRange(years: number[]): string {
  if (years.length === 0) return '';
  const sorted = [...years].sort((a, b) => a - b);
  const contiguous = sorted.every((y, i) => i === 0 || y === sorted[i - 1] + 1);
  if (contiguous && sorted.length > 1) return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  return sorted.join(', ');
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function listStates(codes: string[]): string {
  const names = codes.map((code) => getSubGroupLabel(code, 'state'));
  return names.length <= 2
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * One sentence per distinct set of fallback states, matching the dashboard's
 * notice that those states' TAXSIM results use the previous TAXSIM build.
 */
export function fallbackNotes(results: TaxsimYearResult[]): string[] {
  const yearsByStates = new Map<string, number[]>();
  for (const r of results) {
    if (r.taxsimFallbackStates === null) continue;
    const key = r.taxsimFallbackStates.join(',');
    yearsByStates.set(key, [...(yearsByStates.get(key) ?? []), r.year]);
  }
  return [...yearsByStates].map(
    ([key, years]) =>
      `For ${yearRange(years)}, the TAXSIM results for ${key ? listStates(key.split(',')) : 'some states'} come from the previous TAXSIM build; other states use the updated build.`,
  );
}

/** One line of provenance, collapsed when every year shares it. */
export function provenanceText(results: TaxsimYearResult[]): string | null {
  const versions = unique(results.map((r) => r.policyengineUsVersion).filter((v): v is string => !!v));
  const dates = unique(
    results.map((r) => r.generatedAt?.slice(0, 10)).filter((d): d is string => !!d),
  ).sort();
  const parts: string[] = [];
  if (versions.length) parts.push(`policyengine-us ${versions.join(', ')}`);
  if (dates.length) {
    parts.push(
      `generated ${dates.length === 1 ? dates[0] : `${dates[0]} to ${dates[dates.length - 1]}`}`,
    );
  }
  return parts.length ? `Results computed with ${parts.join(', ')}.` : null;
}

const th: CSSProperties = {
  padding: `${spacing.sm} ${spacing.md}`,
  fontSize: typography.fontSize.xs,
  fontWeight: typography.fontWeight.semibold,
  color: colors.text.secondary,
  backgroundColor: colors.gray[50],
  borderBottom: `1px solid ${colors.border.light}`,
  textAlign: 'right',
  verticalAlign: 'bottom',
};

const td: CSSProperties = {
  padding: `${spacing.sm} ${spacing.md}`,
  fontSize: typography.fontSize.sm,
  fontFamily: typography.fontFamily.mono,
  color: colors.text.primary,
  textAlign: 'right',
  whiteSpace: 'nowrap',
};

const primaryTd: CSSProperties = {
  ...td,
  fontWeight: typography.fontWeight.semibold,
  color: colors.primary[800],
};

function ResultsTable({ results }: { results: TaxsimYearResult[] }) {
  const sameRecords = unique(results.map((r) => r.records)).length === 1;
  const groupTh: CSSProperties = { ...th, textAlign: 'center', color: colors.primary[800] };

  return (
    <div
      style={{
        overflowX: 'auto',
        // The app shell's <main> is a flex item with min-width: auto; without
        // inline-size containment the table's width would widen the whole page
        // on phones instead of scrolling inside this wrapper.
        contain: 'inline-size',
        borderRadius: spacing.radius.xl,
        border: `1px solid ${colors.border.light}`,
        boxShadow: spacing.shadow.sm,
      }}
    >
      <table
        aria-label="Share of records where PolicyEngine and TAXSIM agree, by tax year"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: typography.fontFamily.primary,
        }}
      >
        <thead>
          <tr>
            <th scope="col" rowSpan={2} style={{ ...th, textAlign: 'left' }}>
              Tax year
            </th>
            {!sameRecords && (
              <th scope="col" rowSpan={2} style={th}>
                Records
              </th>
            )}
            <th scope="colgroup" colSpan={2} style={groupTh}>
              Federal income tax
            </th>
            <th scope="colgroup" colSpan={3} style={groupTh}>
              State income tax
            </th>
          </tr>
          <tr>
            <th scope="col" style={th}>Within 1% of income</th>
            <th scope="col" style={th}>Within $15</th>
            <th scope="col" style={th}>Within 1% of income</th>
            <th scope="col" style={th}>Within 1%, net of rebates</th>
            <th scope="col" style={th}>Within $15</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr
              key={r.year}
              style={{
                borderBottom:
                  i < results.length - 1 ? `1px solid ${colors.border.light}` : 'none',
              }}
            >
              <th
                scope="row"
                style={{ ...td, textAlign: 'left', fontFamily: typography.fontFamily.primary, fontWeight: typography.fontWeight.semibold }}
              >
                {r.year}
              </th>
              {!sameRecords && <td style={td}>{r.records.toLocaleString('en-US')}</td>}
              <td style={primaryTd}>{pct(r.federalWithin1Pct)}</td>
              <td style={td}>{pct(r.federalWithin15)}</td>
              <td style={primaryTd}>{pct(r.stateWithin1Pct)}</td>
              <td style={td}>{pct(r.stateWithin1PctNetOfRebates)}</td>
              <td style={td}>{pct(r.stateWithin15)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  return (
    <p
      role="note"
      style={{
        ...bodyText,
        fontSize: typography.fontSize.sm,
        padding: `${spacing.md} ${spacing.lg}`,
        borderLeft: `3px solid ${tone === 'warning' ? colors.warning : colors.primary[400]}`,
        backgroundColor: colors.background.tertiary,
        borderRadius: spacing.radius.md,
        marginTop: spacing.lg,
      }}
    >
      {children}
    </p>
  );
}

function DashboardCard() {
  return (
    <div
      style={{
        padding: spacing['2xl'],
        borderRadius: spacing.radius.xl,
        border: `1px solid ${colors.border.light}`,
        backgroundColor: colors.background.secondary,
      }}
    >
      <h3
        style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.primary[800],
          margin: `0 0 ${spacing.sm}`,
        }}
      >
        TAXSIM comparison dashboard
      </h3>
      <p style={{ ...bodyText, fontSize: typography.fontSize.sm, marginBottom: spacing.lg }}>
        State-by-state results, side-by-side outputs for a sample of households, and the complete
        comparison data for each year to download.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg }}>
        <a
          href={TAXSIM_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.sm,
            padding: `${spacing.sm} ${spacing.xl}`,
            borderRadius: spacing.radius.lg,
            backgroundColor: colors.primary[600],
            color: colors.white,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            fontFamily: typography.fontFamily.primary,
            textDecoration: 'none',
          }}
        >
          Open the TAXSIM dashboard <IconExternalLink size={16} stroke={1.5} />
        </a>
        <ExternalLink href={TAXSIM_REPO_URL}>policyengine-taxsim on GitHub</ExternalLink>
      </div>
    </div>
  );
}

function MatchDefinitions() {
  const item: CSSProperties = { ...bodyText, marginBottom: spacing.md };
  return (
    <section style={{ marginTop: spacing['4xl'] }}>
      <h2 style={sectionHeading}>How agreement is measured</h2>
      <p style={{ ...bodyText, marginBottom: spacing.lg }}>
        Each test compares PolicyEngine with TAXSIM for one record at a time, separately for
        federal income tax and state income tax. A cell in the table is the share of records that
        pass.
      </p>
      <ul style={{ paddingLeft: spacing.xl, margin: 0 }}>
        <li style={item}>
          <strong>Within 1% of income</strong>{' '}
          (the dashboard&apos;s default view): the two
          amounts differ by less than 1% of the record&apos;s gross income. Gross income here is
          wages, self-employment income, interest, dividends, other property income, non-property
          income, pensions and unemployment compensation, plus short- and long-term capital gains
          when positive and 85% of Social Security benefits. Records with zero or negative gross
          income use the $15 test instead.
        </li>
        <li style={item}>
          <strong>Within 1%, net of rebates</strong>{' '}
          (state only): the same test applied to state income tax plus one-time state rebates on
          both sides. It is meant to remove a timing difference: TAXSIM counts a rebate in the year
          it is paid and PolicyEngine in the tax year it relates to. It is not exact, because
          TAXSIM also reports some rebates that its state tax does not reflect (Virginia&apos;s in
          2022 and 2025, for example), so this column can be lower than the plain 1% column.
        </li>
        <li style={item}>
          <strong>Within $15</strong>: the two amounts differ by $15 or less.
        </li>
      </ul>
      <p style={{ ...bodyText, fontSize: typography.fontSize.sm }}>
        These rules are implemented in <code>match_flags</code> in{' '}
        <ExternalLink href={TAXSIM_MATCH_RULES_URL}>scripts/refresh_dashboard.py</ExternalLink>.
        Each year&apos;s published summary records the commit and script hash that produced it.
      </p>
    </section>
  );
}

/** The results block: table, provenance, notices, or a failure message. */
export function TaxsimResults({ taxsim }: { taxsim: TaxsimValidation | null }) {
  const results = taxsim?.results ?? [];
  if (results.length === 0) {
    return (
      <p style={{ ...bodyText, marginBottom: spacing.lg }}>
        The latest results could not be loaded here. See the TAXSIM dashboard below.
      </p>
    );
  }
  const records = unique(results.map((r) => r.records));
  const provenance = provenanceText(results);
  return (
    <>
      <p style={{ ...bodyText, marginBottom: spacing.lg }}>
        Share of records where the two models agree, for tax years{' '}
        {yearRange(results.map((r) => r.year))}.
        {records.length === 1 &&
          ` Each year compares ${records[0].toLocaleString('en-US')} records, one per household.`}
      </p>
      <ResultsTable results={results} />
      {provenance && (
        <p style={{ ...bodyText, fontSize: typography.fontSize.sm, marginTop: spacing.md }}>
          {provenance}
        </p>
      )}
      {fallbackNotes(results).map((note) => (
        <Note key={note}>{note}</Note>
      ))}
      {taxsim && taxsim.failedYears.length > 0 && (
        <Note tone="warning">
          Results for {yearRange(taxsim.failedYears)} could not be loaded here. See the TAXSIM
          dashboard below.
        </Note>
      )}
    </>
  );
}

export function TaxsimResultsLoading() {
  return (
    <p role="status" style={{ ...bodyText, marginBottom: spacing.lg }}>
      Loading the latest results from the TAXSIM dashboard…
    </p>
  );
}

function UsValidation({ results }: { results: ReactNode }) {
  return (
    <div>
      <PageHeader
        category="Data"
        title="Validation"
        description="PolicyEngine compares the federal and state income tax that its model and NBER's TAXSIM calculate for the same Enhanced CPS households. Each household contributes one record: the tax unit that contains the household head."
      />

      <div style={{ maxWidth: '880px' }}>
        <section style={{ marginBottom: spacing['3xl'] }}>
          <h2 style={sectionHeading}>TAXSIM comparison results</h2>
          {results}
        </section>

        <DashboardCard />
        <MatchDefinitions />
      </div>
    </div>
  );
}

function UkValidation() {
  return (
    <div>
      <PageHeader category="Data" title="Validation" />

      <div style={{ maxWidth: '720px' }}>
        <p
          style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
            lineHeight: 1.7,
            marginBottom: spacing['2xl'],
          }}
        >
          PolicyEngine validates its tax calculations against NBER&apos;s TAXSIM model, comparing
          results across thousands of household configurations. The full interactive comparison
          is available in our Jupyter Book documentation.
        </p>

        <div
          style={{
            padding: spacing['2xl'],
            borderRadius: spacing.radius.xl,
            border: `1px solid ${colors.border.light}`,
            backgroundColor: colors.background.secondary,
          }}
        >
          <h3
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.primary[800],
              marginBottom: spacing.sm,
            }}
          >
            TAXSIM validation book
          </h3>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: 1.6,
              marginBottom: spacing.lg,
            }}
          >
            Detailed comparison of PolicyEngine calculations vs. TAXSIM across federal income
            tax, payroll taxes, state income taxes, and credits for multiple filing statuses,
            income levels, and years.
          </p>
          <a
            href={UK_BOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.sm} ${spacing.xl}`,
              borderRadius: spacing.radius.lg,
              backgroundColor: colors.primary[600],
              color: colors.white,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              fontFamily: typography.fontFamily.primary,
              textDecoration: 'none',
            }}
          >
            View full validation <IconExternalLink size={16} stroke={1.5} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ValidationPage({
  country,
  taxsim = null,
  results,
}: {
  country: Country;
  /** Loaded results, rendered in place when `results` is not given. */
  taxsim?: TaxsimValidation | null;
  /** The results block to render instead, e.g. a streamed Suspense boundary. */
  results?: ReactNode;
}) {
  if (country === 'uk') return <UkValidation />;
  return <UsValidation results={results ?? <TaxsimResults taxsim={taxsim} />} />;
}
