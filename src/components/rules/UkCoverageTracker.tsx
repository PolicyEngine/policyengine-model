'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { IconCalendar, IconExternalLink, IconMapPin } from '@tabler/icons-react';
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
const REGISTRY_URL = `https://github.com/${REPO}/blob/main/policyengine_uk/programs.yaml`;

export type UkLevel = 'uk' | 'devolved' | 'local' | 'other';

/**
 * The body behind each `agency` in policyengine-uk's programs.yaml, and its
 * level of government. An agency missing here shows under "Other programmes"
 * until it is added.
 */
const AGENCIES: Record<string, { level: Exclude<UkLevel, 'other'>; name: string }> = {
  HMRC: { level: 'uk', name: 'HM Revenue and Customs' },
  DWP: { level: 'uk', name: 'Department for Work and Pensions' },
  DfE: { level: 'uk', name: 'Department for Education' },
  DfT: { level: 'uk', name: 'Department for Transport' },
  DCMS: { level: 'uk', name: 'Department for Culture, Media and Sport' },
  Treasury: { level: 'uk', name: 'HM Treasury' },
  Ofgem: { level: 'uk', name: 'Ofgem' },
  'Revenue Scotland': { level: 'devolved', name: 'Revenue Scotland' },
  'Social Security Scotland': { level: 'devolved', name: 'Social Security Scotland' },
  'Welsh Government': { level: 'devolved', name: 'Welsh Government' },
  Local: { level: 'local', name: 'Local authorities' },
};

const AGENCY_ORDER = Object.keys(AGENCIES);

const LEVELS: { level: UkLevel; heading: string }[] = [
  { level: 'uk', heading: 'UK government programmes' },
  { level: 'devolved', heading: 'Devolved programmes' },
  { level: 'local', heading: 'Local authority programmes' },
  { level: 'other', heading: 'Other programmes' },
];

const STATUS_ORDER: CoverageStatus[] = ['complete', 'partial', 'inProgress', 'notStarted'];

export function ukAgency(program: Program): { level: UkLevel; name: string } {
  const agency = program.agency ?? '';
  return AGENCIES[agency] ?? { level: 'other', name: agency || 'Other' };
}

export interface AgencyGroup {
  name: string;
  programs: Program[];
}

export interface LevelSection {
  level: UkLevel;
  heading: string;
  count: number;
  groups: AgencyGroup[];
  /** False when the whole registry has one known body at this level, so the heading says enough. */
  showAgencies: boolean;
}

/**
 * The visible programmes by level of government, then by the body that runs
 * them. Whether a level names its bodies depends on the whole registry, so
 * headings don't come and go while searching.
 */
export function groupByGovernment(all: Program[], visible: Program[]): LevelSection[] {
  const rank = (p: Program) => {
    const index = AGENCY_ORDER.indexOf(p.agency ?? '');
    return index === -1 ? AGENCY_ORDER.length : index;
  };
  return LEVELS.flatMap(({ level, heading }) => {
    const bodies = new Set(all.filter((p) => ukAgency(p).level === level).map((p) => ukAgency(p).name));
    const programs = visible
      .filter((p) => ukAgency(p).level === level)
      .sort((a, b) => rank(a) - rank(b)
        || ukAgency(a).name.localeCompare(ukAgency(b).name, 'en-GB')
        || a.name.localeCompare(b.name, 'en-GB'));
    if (programs.length === 0) return [];
    const groups: AgencyGroup[] = [];
    for (const program of programs) {
      const name = ukAgency(program).name;
      const last = groups[groups.length - 1];
      if (last && last.name === name) last.programs.push(program);
      else groups.push({ name, programs: [program] });
    }
    return [{ level, heading, count: programs.length, groups, showAgencies: level === 'other' || bodies.size > 1 }];
  });
}

/**
 * A GitHub link for a registry parameter_prefix, given only when the
 * parameter tree snapshotted with the registry has that folder or file.
 */
export function parameterUrl(
  prefix: string | undefined,
  tree: ReadonlySet<string> | null,
  commit: string,
): string | undefined {
  if (!prefix || !tree) return undefined;
  const path = prefix.replace(/\./g, '/');
  const root = `https://github.com/${REPO}`;
  for (const file of tree) {
    if (file.startsWith(`${path}/`)) return `${root}/tree/${commit}/policyengine_uk/parameters/${path}`;
  }
  // A parameter node can also be a whole YAML file, or a key inside one.
  const parts = path.split('/');
  for (let i = parts.length; i > 0; i--) {
    const file = `${parts.slice(0, i).join('/')}.yaml`;
    if (tree.has(file)) return `${root}/blob/${commit}/policyengine_uk/parameters/${file}`;
  }
  return undefined;
}

/** "2019+" reads "2019 onwards" and "2023-2025" reads "2023 to 2025". */
export function describeVerifiedYears(verifiedYears?: string): string | undefined {
  if (!verifiedYears) return undefined;
  const openEnded = verifiedYears.match(/^(\d{4})\+$/);
  if (openEnded) return `${openEnded[1]} onwards`;
  const range = verifiedYears.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (range) return range[1] === range[2] ? range[1] : `${range[1]} to ${range[2]}`;
  return verifiedYears;
}

function matchesSearch(program: Program, query: string): boolean {
  return [
    program.name,
    program.fullName,
    program.registryNotes,
    program.coverage,
    program.agency,
    ukAgency(program).name,
    program.variable,
  ].some((field) => field?.toLowerCase().includes(query));
}

/** The parameter file paths the build snapshotted from the registry's commit. */
async function loadParameterTree(): Promise<Set<string> | null> {
  try {
    const prefix = publicBasePrefixFromPath(window.location.pathname);
    const response = await fetch(`${prefix}/param-tree-uk.json`);
    if (!response.ok) return null;
    const paths: unknown = await response.json();
    if (!Array.isArray(paths) || !paths.every((path) => typeof path === 'string')) return null;
    return new Set(paths);
  } catch {
    return null;
  }
}

function ProgrammeCard({
  program,
  expanded,
  onToggle,
  parameterHref,
}: {
  program: Program;
  expanded: boolean;
  onToggle: () => void;
  parameterHref?: string;
}) {
  const detailsId = useId();
  const showFullName = program.fullName.toLowerCase() !== program.name.toLowerCase();
  const nation = program.coverage && program.coverage !== 'UK' ? program.coverage : null;
  const years = describeVerifiedYears(program.verifiedYears);
  const detail = (label: string, value: ReactNode) => (
    <div>
      <dt className="tw:inline" style={{ color: colors.text.secondary }}>{label}: </dt>
      <dd className="tw:inline" style={{ margin: 0, color: colors.text.primary, overflowWrap: 'anywhere' }}>{value}</dd>
    </div>
  );

  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: spacing.radius.lg,
        border: `1px solid ${expanded ? colors.primary[400] : colors.border.light}`,
        backgroundColor: expanded ? colors.primary[50] : colors.white,
        transition: 'all 0.15s ease',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="tw:block tw:w-full tw:cursor-pointer tw:text-left"
        style={{
          padding: spacing.lg,
          background: 'none',
          border: 'none',
          fontFamily: typography.fontFamily.primary,
        }}
      >
        <span className="tw:flex tw:items-start" style={{ gap: spacing.md }}>
          <span style={{ paddingTop: '3px' }}><StatusDot status={program.status} /></span>
          <span className="tw:block tw:flex-1 tw:min-w-0">
            <span className="tw:block" style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
              {program.name}
            </span>
            {showFullName && (
              <span className="tw:block" style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: '2px' }}>
                {program.fullName}
              </span>
            )}
            {nation && (
              <span className="tw:flex tw:items-center" style={{ gap: '2px', fontSize: typography.fontSize.xs, color: colors.primary[600], marginTop: spacing.xs }}>
                <IconMapPin size={12} stroke={1.75} aria-hidden="true" />
                {nation}
              </span>
            )}
          </span>
          <span className="tw:whitespace-nowrap" style={{ fontSize: typography.fontSize.xs, color: statusColors[program.status], fontWeight: typography.fontWeight.medium }}>
            {statusLabels[program.status]}
          </span>
        </span>
      </button>
      <div id={detailsId} hidden={!expanded} style={{ padding: `0 ${spacing.lg} ${spacing.lg}`, fontSize: typography.fontSize.xs, lineHeight: 1.6 }}>
        <dl className="tw:flex tw:flex-col" style={{ gap: '2px', margin: 0 }}>
          {program.coverage && detail('Applies in', program.coverage)}
          {years && detail('Verified years', years)}
          {program.variable && detail('Variable', (
            <code style={{ fontFamily: typography.fontFamily.mono }}>{program.variable}</code>
          ))}
        </dl>
        {program.registryNotes && (
          <p style={{ margin: `${spacing.md} 0 0`, color: colors.text.secondary, borderLeft: `3px solid ${colors.primary[200]}`, paddingLeft: spacing.md }}>
            {program.registryNotes}
          </p>
        )}
        {parameterHref && (
          <a
            href={parameterHref}
            target="_blank"
            rel="noopener noreferrer"
            className="tw:inline-flex tw:items-center"
            style={{
              gap: spacing.xs,
              marginTop: spacing.md,
              color: colors.primary[600],
              textDecoration: 'none',
              padding: `${spacing.xs} ${spacing.md}`,
              border: `1px solid ${colors.primary[200]}`,
              borderRadius: spacing.radius.md,
              backgroundColor: colors.white,
            }}
          >
            Parameters on GitHub
            <IconExternalLink size={12} stroke={1.75} aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Coverage from policyengine-uk's own programme registry (`programs.yaml`),
 * read from the snapshot taken at build time. Status, coverage, verified
 * years and notes are the registry's.
 */
export default function UkCoverageTracker() {
  const [loaded, setLoaded] = useState<ProgramsWithSource | null>(null);
  const [parameterTree, setParameterTree] = useState<ReadonlySet<string> | null>(null);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    fetchProgramsWithSource('uk').then((result) => {
      if (!active) return;
      setLoaded(result);
      // Parameter links are checked against the tree built with this snapshot.
      if (result.source.kind !== 'snapshot') return;
      loadParameterTree().then((tree) => {
        if (active) setParameterTree(tree);
      });
    });
    return () => { active = false; };
  }, []);

  const programs = useMemo(() => loaded?.programs ?? [], [loaded]);
  const commit = loaded?.source.kind === 'snapshot' ? loaded.source.commit : null;
  const availableYears = useMemo(() => collectAllYears(programs), [programs]);

  const parameterLinks = useMemo(
    () => new Map(programs.map((p) => [
      p.id,
      commit ? parameterUrl(p.parameterPrefix, parameterTree, commit) : undefined,
    ])),
    [programs, parameterTree, commit],
  );

  const yearFiltered = useMemo(
    () => (yearFilter === null ? programs : programs.filter((p) => programIncludesYear(p, yearFilter))),
    [programs, yearFilter],
  );

  const counts = useMemo(() => {
    const result: Record<CoverageStatus, number> = { complete: 0, partial: 0, inProgress: 0, notStarted: 0 };
    for (const p of yearFiltered) result[p.status]++;
    return result;
  }, [yearFiltered]);

  // The registry documents complete and partial; other statuses show only once it uses them.
  const statuses = useMemo(
    () => STATUS_ORDER.filter((s) => s === 'complete' || s === 'partial' || programs.some((p) => p.status === s)),
    [programs],
  );

  const sections = useMemo(() => {
    const query = search.trim().toLowerCase();
    const visible = query ? yearFiltered.filter((p) => matchesSearch(p, query)) : yearFiltered;
    return groupByGovernment(programs, visible);
  }, [programs, yearFiltered, search]);

  if (!loaded) {
    return <p style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>Loading programmes...</p>;
  }

  if (programs.length === 0) {
    return (
      <p style={{ fontSize: typography.fontSize.base, color: colors.text.secondary, lineHeight: 1.7, maxWidth: '720px' }}>
        The UK programme registry could not be loaded. It is{' '}
        <a href={REGISTRY_URL} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary[600], textDecoration: 'underline' }}>
          programs.yaml in policyengine-uk
        </a>
        .
      </p>
    );
  }

  const toggle = (id: string) => setExpanded((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div>
      <CoverageProvenance source={loaded.source} />
      {/* Summary stats */}
      <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.md, marginBottom: spacing['3xl'] }}>
        <StatCard label="Total programmes" count={yearFiltered.length} color={colors.primary[900]} delay={0} />
        {statuses.map((status, i) => (
          <StatCard key={status} label={statusLabels[status]} count={counts[status]} color={statusColors[status]} delay={0.1 + 0.05 * i} />
        ))}
      </div>

      {/* Search, year filter and legend */}
      <div className="tw:flex tw:flex-wrap tw:items-center" style={{ gap: spacing.lg, marginBottom: spacing['2xl'] }}>
        <input
          type="search"
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
            <IconCalendar size={16} stroke={1.5} style={{ color: colors.text.tertiary }} aria-hidden="true" />
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
                outline: 'none',
                backgroundColor: colors.white,
                color: colors.text.primary,
                appearance: 'auto',
              }}
            >
              <option value="">All years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
        <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.lg }}>
          {statuses.map((status) => (
            <div key={status} className="tw:flex tw:items-center" style={{ gap: spacing.xs }}>
              <StatusDot status={status} size={10} />
              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{statusLabels[status]}</span>
            </div>
          ))}
        </div>
      </div>

      {sections.length === 0 && (
        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>No programmes match.</p>
      )}

      {sections.map((section) => (
        <section key={section.level} style={{ marginBottom: spacing['3xl'] }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.primary[800], marginTop: 0, marginBottom: spacing.lg, paddingBottom: spacing.sm, borderBottom: `2px solid ${colors.primary[100]}` }}>
            {section.heading} ({section.count})
          </h2>
          {section.groups.map((group) => (
            <div key={group.name} style={{ marginBottom: spacing['2xl'] }}>
              {section.showAgencies && (
                <h3 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginTop: 0, marginBottom: spacing.md }}>
                  {group.name} ({group.programs.length})
                </h3>
              )}
              <div className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] tw:items-start" style={{ gap: spacing.md }}>
                {group.programs.map((program) => (
                  <ProgrammeCard
                    key={program.id}
                    program={program}
                    expanded={expanded.has(program.id)}
                    onToggle={() => toggle(program.id)}
                    parameterHref={parameterLinks.get(program.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
