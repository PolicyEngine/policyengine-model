'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconCalendar, IconX } from '@tabler/icons-react';
import { colors, typography, spacing, statusColors } from '../../designTokens';
import { fetchProgramsWithSource, type ProgramsWithSource } from '../../data/fetchPrograms';
import { publicBasePrefixFromPath } from '../../hooks/usePublicBasePrefix';
import type { CoverageStatus, Program } from '../../types/Program';
import CoverageProvenance from './CoverageProvenance';
import {
  StatCard,
  StatusDot,
  collectAllYears,
  programIncludesYear,
  statusLabels,
} from './coverageParts';

const REPO = 'PolicyEngine/policyengine-uk';

type Section = 'UK government' | 'Devolved' | 'Local authorities' | 'Other';

/** Who runs each `agency` in policyengine-uk's programs.yaml. */
const AGENCIES: Record<string, { section: Section; label: string }> = {
  HMRC: { section: 'UK government', label: 'HM Revenue and Customs (HMRC)' },
  DWP: { section: 'UK government', label: 'Department for Work and Pensions (DWP)' },
  DfE: { section: 'UK government', label: 'Department for Education (DfE)' },
  DfT: { section: 'UK government', label: 'Department for Transport (DfT)' },
  DCMS: { section: 'UK government', label: 'Department for Culture, Media and Sport (DCMS)' },
  Treasury: { section: 'UK government', label: 'HM Treasury' },
  Ofgem: { section: 'UK government', label: 'Ofgem' },
  'Revenue Scotland': { section: 'Devolved', label: 'Revenue Scotland' },
  'Social Security Scotland': { section: 'Devolved', label: 'Social Security Scotland' },
  Local: { section: 'Local authorities', label: 'Local authorities' },
};
const SECTIONS: Section[] = ['UK government', 'Devolved', 'Local authorities', 'Other'];

export function agencyOf(program: Program): { section: Section; label: string } {
  return AGENCIES[program.agency ?? ''] ?? { section: 'Other', label: program.agency || 'Other' };
}

interface SourceTrees {
  parameterPaths: Set<string>;
  variablePaths: Map<string, string | null>;
}

/** A programme's links, kept only where the pinned snapshot has the file or folder. */
export function verifiedLinks(
  program: Program,
  parameterPrefix: string | undefined,
  trees: SourceTrees | null,
  ref: string,
): { parameters?: string; source?: string } {
  if (!trees) return {};
  const links: { parameters?: string; source?: string } = {};
  if (parameterPrefix) {
    const dir = parameterPrefix.replace(/\./g, '/');
    const base = `https://github.com/${REPO}`;
    if (trees.parameterPaths.has(`${dir}.yaml`)) {
      links.parameters = `${base}/blob/${ref}/policyengine_uk/parameters/${dir}.yaml`;
    } else if ([...trees.parameterPaths].some((p) => p.startsWith(`${dir}/`))) {
      links.parameters = `${base}/tree/${ref}/policyengine_uk/parameters/${dir}`;
    }
  }
  const file = program.variable ? trees.variablePaths.get(program.variable) : null;
  if (file) links.source = `https://github.com/${REPO}/blob/${ref}/policyengine_uk/variables/${file}`;
  return links;
}

async function loadTrees(): Promise<SourceTrees | null> {
  const prefix = publicBasePrefixFromPath(window.location.pathname);
  try {
    const [params, vars] = await Promise.all([
      fetch(`${prefix}/param-tree-uk.json`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${prefix}/variable-tree-uk.json`).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (!Array.isArray(params) || !Array.isArray(vars?.paths)) return null;
    const variablePaths = new Map<string, string | null>();
    for (const path of vars.paths as string[]) {
      const stem = path.split('/').pop()!.replace(/\.py$/, '');
      variablePaths.set(stem, variablePaths.has(stem) ? null : path);
    }
    return { parameterPaths: new Set(params as string[]), variablePaths };
  } catch {
    return null;
  }
}

function ProgrammeDetail({
  program,
  links,
  onClose,
}: {
  program: Program;
  links: { parameters?: string; source?: string };
  onClose: () => void;
}) {
  const linkStyle = {
    fontSize: typography.fontSize.xs,
    color: colors.primary[600],
    textDecoration: 'none',
    padding: `${spacing.xs} ${spacing.md}`,
    border: `1px solid ${colors.primary[200]}`,
    borderRadius: spacing.radius.md,
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        padding: spacing['2xl'],
        borderRadius: spacing.radius.xl,
        border: `1px solid ${colors.border.light}`,
        backgroundColor: colors.white,
        boxShadow: spacing.shadow.md,
      }}
    >
      <div className="tw:flex tw:justify-between tw:items-start" style={{ marginBottom: spacing.lg }}>
        <div>
          <h3 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary[900], margin: 0 }}>
            {program.name}
          </h3>
          {program.fullName && program.fullName !== program.name && (
            <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs }}>{program.fullName}</div>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close programme details"
          className="tw:flex tw:items-center tw:cursor-pointer"
          style={{ background: 'none', border: 'none', color: colors.text.tertiary, padding: spacing.sm }}
        >
          <IconX size={20} stroke={1.5} />
        </button>
      </div>

      <div className="tw:flex tw:flex-wrap tw:items-center" style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
        <div className="tw:flex tw:items-center" style={{ gap: spacing.sm }}>
          <StatusDot status={program.status} size={14} />
          <span style={{ fontSize: typography.fontSize.sm, color: statusColors[program.status], fontWeight: typography.fontWeight.semibold }}>
            {statusLabels[program.status]}
          </span>
        </div>
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, backgroundColor: colors.gray[100], padding: `2px ${spacing.sm}`, borderRadius: spacing.radius.sm }}>
          {agencyOf(program).label}
        </span>
        {program.coverage && (
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Applies in: {program.coverage}</span>
        )}
        {program.verifiedYears && (
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Verified years: {program.verifiedYears}</span>
        )}
      </div>

      {program.notes && (
        <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.lg, borderLeft: `3px solid ${colors.primary[200]}`, paddingLeft: spacing.md }}>
          {program.notes.replace(/\. Years: .*$/, '').replace(/^Years: .*$/, '')}
        </div>
      )}

      <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.md }}>
        {links.parameters && (
          <a href={links.parameters} target="_blank" rel="noopener noreferrer" style={linkStyle}>Parameters</a>
        )}
        {links.source && (
          <a href={links.source} target="_blank" rel="noopener noreferrer" style={linkStyle}>Source code</a>
        )}
        {program.variable && (
          <a
            href={`https://policyengine.github.io/flowchart/?variable=${program.variable}&country=UK`}
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            Computation tree
          </a>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Coverage of policyengine-uk's own programme registry (`programs.yaml`), read
 * from the snapshot pinned at build time. Status, coverage and verified years
 * are the registry's; nothing here is typed in by hand.
 */
export default function UkCoverageTracker() {
  const [loaded, setLoaded] = useState<ProgramsWithSource | null>(null);
  const [trees, setTrees] = useState<SourceTrees | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchProgramsWithSource('uk').then((result) => { if (active) setLoaded(result); });
    loadTrees().then((result) => { if (active) setTrees(result); });
    return () => { active = false; };
  }, []);

  const programs = useMemo(() => loaded?.programs ?? [], [loaded]);
  const ref = loaded?.source.kind === 'snapshot' ? loaded.source.commit : 'main';
  const availableYears = useMemo(() => collectAllYears(programs), [programs]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return programs.filter((p) =>
      (yearFilter === null || programIncludesYear(p, yearFilter)) &&
      (!q || [p.name, p.fullName, p.notes ?? '', p.coverage ?? '', agencyOf(p).label]
        .some((field) => field.toLowerCase().includes(q))),
    );
  }, [programs, search, yearFilter]);

  const counts = useMemo(() => {
    const c: Record<CoverageStatus, number> = { complete: 0, partial: 0, inProgress: 0, notStarted: 0 };
    for (const p of visible) c[p.status]++;
    return c;
  }, [visible]);

  const grouped = useMemo(() => {
    const bySection = new Map<Section, Map<string, Program[]>>();
    for (const p of visible) {
      const { section, label } = agencyOf(p);
      if (!bySection.has(section)) bySection.set(section, new Map());
      const departments = bySection.get(section)!;
      if (!departments.has(label)) departments.set(label, []);
      departments.get(label)!.push(p);
    }
    return SECTIONS.filter((s) => bySection.has(s)).map((s) => ({
      section: s,
      departments: [...bySection.get(s)!.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])),
    }));
  }, [visible]);

  if (!loaded) {
    return <p style={{ color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>Loading programmes…</p>;
  }

  if (programs.length === 0) {
    return (
      <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 1.7 }}>
        The UK programme registry could not be loaded. See{' '}
        <a href={`https://github.com/${REPO}/blob/main/policyengine_uk/programs.yaml`} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary[600] }}>
          programs.yaml in policyengine-uk
        </a>
        .
      </p>
    );
  }

  const selectedProgram = programs.find((p) => p.id === selected) ?? null;

  return (
    <div>
      <CoverageProvenance source={loaded.source} />
      <p style={{ fontSize: typography.fontSize.base, color: colors.text.secondary, lineHeight: 1.7, maxWidth: '760px', marginTop: 0, marginBottom: spacing['2xl'] }}>
        Each programme below is an entry in PolicyEngine UK&apos;s programme registry, shown with the status,
        coverage, verified years and notes the registry records.
      </p>

      <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.md, marginBottom: spacing['3xl'] }}>
        <StatCard label="Programmes" count={visible.length} color={colors.primary[900]} delay={0} />
        <StatCard label="Complete" count={counts.complete} color={statusColors.complete} delay={0.1} />
        <StatCard label="Partial" count={counts.partial} color={statusColors.partial} delay={0.15} />
        <StatCard label="In progress" count={counts.inProgress} color={statusColors.inProgress} delay={0.2} />
      </div>

      <div className="tw:flex tw:flex-wrap tw:items-center" style={{ gap: spacing.lg, marginBottom: spacing['2xl'] }}>
        <input
          type="text"
          placeholder="Search programmes..."
          aria-label="Search programmes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="tw:flex-1"
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            borderRadius: spacing.radius.lg,
            border: `1px solid ${colors.border.light}`,
            fontSize: typography.fontSize.sm,
            fontFamily: typography.fontFamily.primary,
            outline: 'none',
            minWidth: '200px',
            maxWidth: '400px',
          }}
        />
        {availableYears.length > 0 && (
          <div className="tw:flex tw:items-center" style={{ gap: spacing.xs }}>
            <IconCalendar size={16} stroke={1.5} style={{ color: colors.text.tertiary }} />
            <select
              aria-label="Filter by verified year"
              value={yearFilter ?? ''}
              onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="tw:cursor-pointer"
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                borderRadius: spacing.radius.lg,
                border: `1px solid ${colors.border.light}`,
                fontSize: typography.fontSize.sm,
                fontFamily: typography.fontFamily.primary,
                backgroundColor: colors.white,
                color: colors.text.primary,
              }}
            >
              <option value="">All years</option>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedProgram && (
          <div style={{ marginBottom: spacing['2xl'] }}>
            <ProgrammeDetail
              program={selectedProgram}
              links={verifiedLinks(selectedProgram, selectedProgram.parameterPrefix, trees, ref)}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </AnimatePresence>

      {grouped.length === 0 && (
        <p style={{ color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>No programmes match.</p>
      )}

      {grouped.map(({ section, departments }) => (
        <section key={section} style={{ marginBottom: spacing['3xl'] }}>
          <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary[900], marginBottom: spacing.lg }}>
            {section}
            {departments.length === 1 && departments[0][0] === section ? ` (${departments[0][1].length})` : ''}
          </h2>
          {departments.map(([label, list]) => (
            <div key={label} style={{ marginBottom: spacing['2xl'] }}>
              {label !== section && (
                <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.primary[800], marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottom: `2px solid ${colors.primary[100]}` }}>
                  {label} ({list.length})
                </h3>
              )}
              <div className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]" style={{ gap: spacing.md }}>
                {list.map((program) => {
                  const isSelected = selected === program.id;
                  return (
                    <button
                      key={program.id}
                      onClick={() => setSelected(isSelected ? null : program.id)}
                      aria-pressed={isSelected}
                      className="tw:cursor-pointer tw:text-left"
                      style={{
                        padding: spacing.lg,
                        borderRadius: spacing.radius.lg,
                        border: `1px solid ${isSelected ? colors.primary[400] : colors.border.light}`,
                        backgroundColor: isSelected ? colors.primary[50] : colors.white,
                        fontFamily: typography.fontFamily.primary,
                      }}
                    >
                      <div className="tw:flex tw:items-start" style={{ gap: spacing.md }}>
                        <div style={{ paddingTop: '3px' }}><StatusDot status={program.status} /></div>
                        <div className="tw:flex-1">
                          <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                            {program.name}
                          </div>
                          {program.fullName && program.fullName !== program.name && (
                            <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: '2px' }}>{program.fullName}</div>
                          )}
                          {program.coverage && program.coverage !== 'UK' && (
                            <div style={{ fontSize: typography.fontSize.xs, color: colors.primary[600], marginTop: spacing.xs }}>{program.coverage}</div>
                          )}
                        </div>
                        <div className="tw:whitespace-nowrap" style={{ fontSize: typography.fontSize.xs, color: statusColors[program.status], fontWeight: typography.fontWeight.medium }}>
                          {statusLabels[program.status]}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
