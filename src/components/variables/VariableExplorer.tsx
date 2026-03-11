import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSearch, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { Variable, Parameter } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';
import { useDebounce } from '../../hooks/useDebounce';
import VariableCard from './VariableCard';
import VariableDetail from './VariableDetail';

const PAGE_SIZE = 50;

interface VariableExplorerProps {
  variables: Record<string, Variable>;
  parameters: Record<string, Parameter>;
  country: string;
}

type KindFilter = 'all' | 'input' | 'computed';
type LevelFilter = 'all' | 'federal' | 'state' | 'local' | 'territory' | 'contrib' | 'household';

interface VariableGroup {
  key: string;
  label: string;
  description: string;
  color: string;
  variables: Variable[];
}

/** Categorize a variable by its moduleName prefix. */
function getLevel(v: Variable): LevelFilter {
  const m = v.moduleName;
  if (!m) return 'household';
  if (m.startsWith('gov.local')) return 'local';
  if (m.startsWith('gov.states')) return 'state';
  if (m.startsWith('gov.territories')) return 'territory';
  if (m.startsWith('contrib')) return 'contrib';
  if (m.startsWith('household') || m.startsWith('input')) return 'household';
  // Everything else under gov.* is federal
  if (m.startsWith('gov.')) return 'federal';
  return 'household';
}

/** Get a human-readable sub-group label for grouping within a level. */
function getSubGroup(v: Variable): string {
  const m = v.moduleName;
  if (!m) return 'Other';
  const parts = m.split('.');

  if (m.startsWith('gov.states.tax') || m.startsWith('gov.states.general') ||
      m.startsWith('gov.states.unemployment') || m.startsWith('gov.states.workers')) {
    return 'Cross-state';
  }
  if (m.startsWith('gov.states.') && parts.length >= 3 && parts[2].length === 2) {
    return parts[2].toUpperCase();
  }
  if (m.startsWith('gov.local.') && parts.length >= 4) {
    const state = parts[2].toUpperCase();
    const locality = parts[3];
    const localityNames: Record<string, string> = {
      la: 'Los Angeles', riv: 'Riverside', nyc: 'New York City',
      ala: 'Alameda', sf: 'San Francisco', denver: 'Denver',
      harris: 'Harris County', montgomery: 'Montgomery County',
      multnomah_county: 'Multnomah County',
    };
    return `${localityNames[locality] || locality} (${state})`;
  }
  if (m.startsWith('gov.territories.') && parts.length >= 3) {
    const codes: Record<string, string> = { pr: 'Puerto Rico', gu: 'Guam', vi: 'US Virgin Islands' };
    return codes[parts[2]] || parts[2].toUpperCase();
  }
  if (m.startsWith('gov.')) {
    const agencyNames: Record<string, string> = {
      irs: 'IRS', hhs: 'HHS', usda: 'USDA', ssa: 'SSA', hud: 'HUD',
      ed: 'Dept. of Education', aca: 'ACA', doe: 'Dept. of Energy',
      fcc: 'FCC', puf: 'IRS PUF', simulation: 'Simulation',
    };
    return agencyNames[parts[1]] || parts[1].toUpperCase();
  }
  if (m.startsWith('contrib.')) {
    const names: Record<string, string> = {
      taxsim: 'TAXSIM', ubi_center: 'UBI Center', congress: 'Congressional proposals',
    };
    return names[parts[1]] || parts[1];
  }
  if (m.startsWith('household.')) {
    const names: Record<string, string> = {
      demographic: 'Demographics', income: 'Income', expense: 'Expenses',
      assets: 'Assets', marginal_tax_rate: 'Marginal tax rates', cliff: 'Cliff analysis',
    };
    return names[parts[1]] || parts[1];
  }
  return 'Other';
}

const LEVEL_CONFIG: Record<LevelFilter, { label: string; description: string; color: string; order: number }> = {
  federal:   { label: 'Federal',           description: 'IRS, HHS, USDA, SSA, HUD, and other federal agencies',     color: '#1D4ED8', order: 0 },
  state:     { label: 'State',             description: 'State-level tax and benefit programs across all 50 states + DC', color: '#7C3AED', order: 1 },
  local:     { label: 'Local',             description: 'City and county programs',                                   color: '#059669', order: 2 },
  territory: { label: 'Territories',       description: 'Puerto Rico and other US territories',                       color: '#0891B2', order: 3 },
  contrib:   { label: 'Contributed/Reform', description: 'TAXSIM validation, UBI proposals, and congressional reforms', color: '#D97706', order: 4 },
  household: { label: 'Household inputs',  description: 'Demographics, income, expenses, and geographic inputs',       color: '#6B7280', order: 5 },
  all:       { label: 'All',               description: '',                                                           color: '#000',    order: -1 },
};

function GroupSection({
  group,
  variables: vars,
  allVariables: allVars,
  parameters,
  country,
  selectedVar,
  onSelect,
  defaultExpanded,
}: {
  group: { key: string; label: string; color: string };
  variables: Variable[];
  allVariables: Record<string, Variable>;
  parameters: Record<string, Parameter>;
  country: string;
  selectedVar: string | null;
  onSelect: (name: string) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? vars : vars.slice(0, PAGE_SIZE);

  return (
    <div style={{ marginBottom: spacing.xl }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="tw:flex tw:items-center tw:w-full tw:text-left tw:cursor-pointer"
        style={{
          gap: spacing.sm,
          padding: `${spacing.sm} ${spacing.md}`,
          borderRadius: spacing.radius.lg,
          border: 'none',
          backgroundColor: expanded ? `${group.color}08` : 'transparent',
          fontFamily: typography.fontFamily.primary,
          transition: 'background-color 0.15s ease',
        }}
      >
        {expanded ? (
          <IconChevronDown size={16} stroke={1.5} style={{ color: group.color, flexShrink: 0 }} />
        ) : (
          <IconChevronRight size={16} stroke={1.5} style={{ color: group.color, flexShrink: 0 }} />
        )}
        <span style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: group.color,
        }}>
          {group.label}
        </span>
        <span style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.tertiary,
          fontWeight: typography.fontWeight.medium,
        }}>
          ({vars.length})
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="tw:flex tw:flex-col" style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
              {visible.map((v) => (
                <div key={v.name}>
                  <VariableCard
                    variable={v}
                    isSelected={selectedVar === v.name}
                    onClick={() => onSelect(v.name)}
                  />
                  <AnimatePresence>
                    {selectedVar === v.name && (
                      <VariableDetail
                        variable={v}
                        variables={allVars}
                        parameters={parameters}
                        country={country}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
            {vars.length > PAGE_SIZE && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="tw:cursor-pointer"
                style={{
                  display: 'block',
                  margin: `${spacing.md} auto`,
                  padding: `${spacing.xs} ${spacing.xl}`,
                  border: `1px solid ${colors.border.light}`,
                  borderRadius: spacing.radius.lg,
                  backgroundColor: colors.white,
                  color: colors.primary[600],
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.medium,
                  fontFamily: typography.fontFamily.primary,
                }}
              >
                Show all {vars.length} variables
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VariableExplorer({ variables, parameters, country }: VariableExplorerProps) {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 200);

  // Derive available entity types from data
  const entityTypes = useMemo(() => {
    const types = new Set<string>();
    for (const v of Object.values(variables)) {
      types.add(v.entity);
    }
    return Array.from(types).sort();
  }, [variables]);

  // All variables as a flat sorted array (hidden_input excluded)
  const allVariables = useMemo(() => {
    return Object.values(variables)
      .filter((v) => !v.hidden_input)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [variables]);

  // Level counts for filter badges
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of allVariables) {
      const level = getLevel(v);
      counts[level] = (counts[level] || 0) + 1;
    }
    return counts;
  }, [allVariables]);

  // Filtered list
  const filtered = useMemo(() => {
    let result = allVariables;

    if (debouncedSearch) {
      const words = debouncedSearch.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((v) => {
        // Build a single searchable string from all fields
        const haystack = [
          v.name,
          v.label,
          v.documentation || '',
          v.moduleName || '',
          v.entity,
          v.valueType,
          v.unit || '',
        ].join(' ').toLowerCase();
        // Every word must appear somewhere
        return words.every((w) => haystack.includes(w));
      });
    }

    if (entityFilter !== 'all') {
      result = result.filter((v) => v.entity === entityFilter);
    }

    if (kindFilter === 'input') {
      result = result.filter((v) => v.isInputVariable);
    } else if (kindFilter === 'computed') {
      result = result.filter((v) => !v.isInputVariable);
    }

    if (levelFilter !== 'all') {
      result = result.filter((v) => getLevel(v) === levelFilter);
    }

    return result;
  }, [allVariables, debouncedSearch, entityFilter, kindFilter, levelFilter]);

  // Group filtered variables by level, then sub-group
  const groupedByLevel = useMemo((): VariableGroup[] => {
    const levelMap = new Map<LevelFilter, Map<string, Variable[]>>();

    for (const v of filtered) {
      const level = getLevel(v);
      if (!levelMap.has(level)) levelMap.set(level, new Map());
      const subGroup = getSubGroup(v);
      const sub = levelMap.get(level)!;
      if (!sub.has(subGroup)) sub.set(subGroup, []);
      sub.get(subGroup)!.push(v);
    }

    const groups: VariableGroup[] = [];
    const sortedLevels = [...levelMap.entries()].sort(
      ([a], [b]) => (LEVEL_CONFIG[a]?.order ?? 99) - (LEVEL_CONFIG[b]?.order ?? 99),
    );

    for (const [level, subMap] of sortedLevels) {
      const config = LEVEL_CONFIG[level];
      const sortedSubs = [...subMap.entries()].sort(([a], [b]) => a.localeCompare(b));
      for (const [subKey, vars] of sortedSubs) {
        groups.push({
          key: `${level}-${subKey}`,
          label: `${config.label} — ${subKey}`,
          description: config.description,
          color: config.color,
          variables: vars,
        });
      }
    }

    return groups;
  }, [filtered]);

  // For flat search results (when searching), use infinite scroll
  const isSearching = !!debouncedSearch;

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearch, entityFilter, kindFilter, levelFilter]);

  // Infinite scroll for flat search mode
  useEffect(() => {
    if (!isSearching) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length, isSearching]);

  const handleSelect = useCallback((name: string) => {
    setSelectedVar((prev) => (prev === name ? null : name));
  }, []);

  const visibleFlat = filtered.slice(0, visibleCount);

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: spacing.lg }}>
        <IconSearch
          size={18}
          stroke={1.5}
          style={{
            position: 'absolute',
            left: spacing.md,
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.text.tertiary,
          }}
        />
        <input
          type="text"
          placeholder="Search variables by name, label, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: `${spacing.md} ${spacing.lg} ${spacing.md} ${spacing['3xl']}`,
            borderRadius: spacing.radius.lg,
            border: `1px solid ${colors.border.light}`,
            fontSize: typography.fontSize.sm,
            fontFamily: typography.fontFamily.primary,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Level filter pills */}
      <div
        className="tw:flex tw:flex-wrap"
        style={{ gap: spacing.sm, marginBottom: spacing.lg }}
      >
        {(['all', 'federal', 'state', 'local', 'territory', 'contrib', 'household'] as LevelFilter[]).map((level) => {
          const config = LEVEL_CONFIG[level];
          const count = level === 'all' ? allVariables.length : (levelCounts[level] || 0);
          if (level !== 'all' && !count) return null;
          const isActive = levelFilter === level;
          return (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className="tw:cursor-pointer"
              style={{
                padding: `${spacing.xs} ${spacing.lg}`,
                borderRadius: spacing.radius.lg,
                border: `1px solid ${isActive ? config.color : colors.border.light}`,
                backgroundColor: isActive ? `${config.color}12` : colors.white,
                color: isActive ? config.color : colors.text.secondary,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                fontFamily: typography.fontFamily.primary,
              }}
            >
              {config.label} ({count.toLocaleString()})
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div
        className="tw:flex tw:flex-wrap tw:items-center"
        style={{ gap: spacing.lg, marginBottom: spacing.xl }}
      >
        {/* Kind toggle */}
        <div
          className="tw:flex tw:overflow-hidden"
          style={{
            borderRadius: spacing.radius.lg,
            border: `1px solid ${colors.border.light}`,
          }}
        >
          {(['all', 'input', 'computed'] as KindFilter[]).map((kind) => (
            <button
              key={kind}
              onClick={() => setKindFilter(kind)}
              className="tw:cursor-pointer"
              style={{
                padding: `${spacing.xs} ${spacing.lg}`,
                border: 'none',
                backgroundColor: kindFilter === kind ? colors.primary[500] : colors.white,
                color: kindFilter === kind ? colors.white : colors.text.secondary,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                fontFamily: typography.fontFamily.primary,
                textTransform: 'capitalize',
              }}
            >
              {kind}
            </button>
          ))}
        </div>

        {/* Entity dropdown */}
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="tw:cursor-pointer"
          style={{
            padding: `${spacing.xs} ${spacing.lg}`,
            borderRadius: spacing.radius.lg,
            border: `1px solid ${colors.border.light}`,
            fontSize: typography.fontSize.xs,
            fontFamily: typography.fontFamily.primary,
            outline: 'none',
            backgroundColor: colors.white,
            color: colors.text.primary,
          }}
        >
          <option value="all">All entities</option>
          {entityTypes.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        {/* Result count */}
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
          {filtered.length.toLocaleString()} variable{filtered.length !== 1 ? 's' : ''}
          {levelFilter !== 'all' && ` in ${LEVEL_CONFIG[levelFilter].label.toLowerCase()}`}
        </span>
      </div>

      {/* Results: grouped when browsing, flat when searching */}
      {isSearching ? (
        <>
          <div className="tw:flex tw:flex-col" style={{ gap: spacing.sm }}>
            {visibleFlat.map((v) => (
              <div key={v.name}>
                <VariableCard
                  variable={v}
                  isSelected={selectedVar === v.name}
                  onClick={() => handleSelect(v.name)}
                />
                <AnimatePresence>
                  {selectedVar === v.name && (
                    <VariableDetail
                      variable={v}
                      variables={variables}
                      parameters={parameters}
                      country={country}
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          {visibleCount < filtered.length && (
            <div ref={sentinelRef} style={{ height: '1px' }} />
          )}
        </>
      ) : (
        <div>
          {groupedByLevel.map((group) => (
            <GroupSection
              key={group.key}
              group={group}
              variables={group.variables}
              allVariables={variables}
              parameters={parameters}
              country={country}
              selectedVar={selectedVar}
              onSelect={handleSelect}
              defaultExpanded={groupedByLevel.length <= 5}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: spacing['4xl'],
            color: colors.text.tertiary,
            fontSize: typography.fontSize.sm,
          }}
        >
          No variables match your search.
        </div>
      )}
    </div>
  );
}
