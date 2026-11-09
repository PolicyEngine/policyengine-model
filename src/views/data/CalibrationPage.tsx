import { useState, useMemo } from 'react';
import { colors, typography, spacing } from '../../designTokens';
import {
  describeLevels,
  formatPercent,
  joinList,
  usCalibration,
} from '../../data/calibrationTargets';
import { usLocalAreaFile, usLocalAreaTargets } from '../../data/usLocalAreaFile';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/layout/SearchInput';
import CalibrationTargetsTable from './CalibrationTargetsTable';
import { formatDate, formatSourceFamily, groupLabel } from './calibrationFormat';
import type { Country } from '../../hooks/useCountry';
import UkCalibrationPage from './UkCalibrationPage';

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
    return <UkCalibrationPage />;
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
        description={`Microcosm reweights PolicyEngine’s default US dataset so its weighted totals match ${describeLevels(levels)} derived from statistics published by the IRS, Census Bureau, CMS, USDA, SSA, and other agencies${internal > 0 ? `, plus ${internal === 1 ? 'one build-internal constraint' : `${internal} build-internal constraints`}` : ''}. ${formatPercent(data.withinTenPctShare)} of all ${data.totalTargets.toLocaleString()} targets land within 10% of their target value.`}
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
        {data.households.toLocaleString()} households in Microcosm’s national file
        {data.policyenginePackageVersion
          ? `, the default US dataset in version ${data.policyenginePackageVersion} of the policyengine Python package`
          : ''}
        .{' '}
        {inherited
          ? `Its weights come unchanged from the build that fit them${calibratedOn ? `, calibrated ${calibratedOn}` : ''}.`
          : calibratedOn
            ? `Calibrated ${calibratedOn}.`
            : null}{' '}
        The release publishes the fit for every target in calibration_diagnostics.json.
      </div>

      <p style={prose}>
        {levels.district > 0
          ? `This file calibrates ${levels.district.toLocaleString()} congressional district targets alongside the national and state rows.`
          : 'This file calibrates national and state targets; it has no congressional district target rows.'}{' '}
        policyengine.py runs national analyses on it, and state and congressional district analyses on Microcosm’s
        local-area file. That file adds {usLocalAreaFile.acsHouseholdsRounded} households from the{' '}
        {usLocalAreaFile.acsSurvey} to this file’s households and fits all of their weights to{' '}
        {usLocalAreaTargets.total.toLocaleString()} targets of its own: {usLocalAreaTargets.state.toLocaleString()} for
        states and a 2020 Census population target for each of the {usLocalAreaTargets.district.toLocaleString()}{' '}
        districts. The table below lists the national file’s targets.
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
        for {calibrationYear}; the build uprates some source figures from earlier years to it.
      </p>

      {filtered.length === 0 ? (
        <p style={{ color: colors.text.tertiary }}>No calibration targets found.</p>
      ) : (
        <CalibrationTargetsTable rows={filtered} />
      )}
    </div>
  );
}
