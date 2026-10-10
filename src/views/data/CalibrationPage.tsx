import { useState, useMemo } from 'react';
import { colors, typography, spacing } from '../../designTokens';
import {
  describeLevels,
  formatPercent,
  joinList,
  usCalibration,
} from '../../data/calibrationTargets';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/layout/SearchInput';
import CalibrationTargetsTable from './CalibrationTargetsTable';
import { formatDate, formatSourceFamily, groupLabel } from './calibrationFormat';
import type { Country } from '../../hooks/useCountry';

export const DASHBOARD_URL = 'https://microcosm.institute/calibration/dashboard/microcosm?country=us';

const prose = {
  fontSize: typography.fontSize.base,
  color: colors.text.secondary,
  lineHeight: 1.7,
  marginBottom: spacing.xl,
  maxWidth: '720px',
};

export default function CalibrationPage({ country }: { country: Country }) {
  const [search, setSearch] = useState('');
  const data = usCalibration;

  const allRows = useMemo(
    () => (country === 'us' ? [...data.targets].sort((a, b) => b.targetCount - a.targetCount) : []),
    [country, data.targets],
  );

  const filtered = useMemo(() => {
    if (!search) return allRows;
    const q = search.toLowerCase();
    return allRows.filter((r) =>
      [groupLabel(r), r.concept, formatSourceFamily(r.sourceFamily), r.sourceTable].some((s) =>
        s.toLowerCase().includes(q),
      ),
    );
  }, [allRows, search]);

  if (country !== 'us') {
    return (
      <div>
        <PageHeader
          category="Data"
          title="Calibration targets"
          description="Calibration target details are currently available for the US model only."
        />
      </div>
    );
  }

  const levels = data.levelCounts;
  const internal = levels.other;
  const calibratedOn = formatDate(data.calibratedAt);
  const inherited = data.calibrationReleaseId !== data.releaseId;
  const calibrationYear = joinList(
    [...new Set(data.targets.flatMap((g) => g.periods))].sort((a, b) => a - b).map(String),
  );

  return (
    <div>
      <PageHeader
        category="Data"
        title="Calibration targets"
        description={`PolicyEngine’s default US dataset is reweighted so its weighted totals match ${describeLevels(levels)} derived from statistics published by the IRS, Census Bureau, CMS, USDA, SSA, and other agencies${internal > 0 ? `, plus ${internal === 1 ? 'one build-internal constraint' : `${internal} build-internal constraints`}` : ''}. ${formatPercent(data.withinTenPctShare)} of all ${data.totalTargets.toLocaleString()} targets land within 10% of their target value.`}
      />

      <div
        style={{
          padding: `${spacing.md} ${spacing.lg}`,
          borderRadius: spacing.radius.lg,
          border: `1px solid ${colors.border.light}`,
          backgroundColor: colors.gray[50],
          marginBottom: spacing.xl,
          maxWidth: '720px',
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          lineHeight: 1.6,
        }}
      >
        {data.households.toLocaleString()} households in release{' '}
        <code style={{ fontFamily: typography.fontFamily.mono }}>{data.releaseId}</code>
        {data.policyenginePackageVersion
          ? `, the US default in the policyengine Python package ${data.policyenginePackageVersion}`
          : ''}
        .{' '}
        {inherited ? (
          <>
            Its weights are those of{' '}
            <code style={{ fontFamily: typography.fontFamily.mono }}>{data.calibrationReleaseId}</code>
            {calibratedOn ? `, calibrated ${calibratedOn}` : ''}, unchanged.{' '}
          </>
        ) : calibratedOn ? (
          `Calibrated ${calibratedOn}. `
        ) : null}
        <a href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary[600] }}>
          See the fit for every target on the Microcosm dashboard
        </a>
        .
      </div>

      <p style={prose}>
        Congressional districts are a filter on this same file, not separate datasets: every household carries one of
        the 436 districts, and a district analysis selects those households and keeps their weights.{' '}
        {levels.district > 0
          ? `This release calibrates ${levels.district.toLocaleString()} district-level targets alongside the national and state rows.`
          : 'This release calibrates national and state targets; it has no district-level target rows.'}{' '}
        District-level targets exist in two places. Microcosm’s local-area build calibrates a 2020 Census population
        target for each of the 436 districts. The Microcosm build spec compiles one target surface that includes IRS
        income targets by district alongside the national and state rows, and a release can calibrate a subset of it.
      </p>

      <SearchInput value={search} onChange={setSearch} placeholder="Search targets and sources..." />

      <p
        style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.tertiary,
          marginBottom: spacing.md,
          marginTop: `-${spacing.sm}`,
        }}
      >
        {filtered.length} target group{filtered.length !== 1 ? 's' : ''} shown
        {search ? ` (filtered from ${allRows.length})` : ''}. A group is one measured concept from one source table;
        the release has {data.totalTargets.toLocaleString()} targets across all groups. Values are calibration targets
        for {calibrationYear}; some source figures from earlier years are uprated to it.
      </p>

      {filtered.length === 0 ? (
        <p style={{ color: colors.text.tertiary }}>No calibration targets found.</p>
      ) : (
        <CalibrationTargetsTable rows={filtered} />
      )}
    </div>
  );
}
