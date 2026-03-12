import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSearch, IconChevronDown, IconChevronRight, IconArrowLeft } from '@tabler/icons-react';
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

type Level = 'federal' | 'state' | 'local' | 'territory' | 'contrib' | 'household';

/** Categorize a variable by its moduleName prefix. */
function getLevel(v: Variable): Level {
  const m = v.moduleName;
  if (!m) return 'household';
  if (m.startsWith('gov.local')) return 'local';
  if (m.startsWith('gov.states')) return 'state';
  if (m.startsWith('gov.territories')) return 'territory';
  if (m.startsWith('contrib')) return 'contrib';
  if (m.startsWith('household') || m.startsWith('input')) return 'household';
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

const LEVEL_CONFIG: Record<Level, { label: string; description: string; color: string; order: number }> = {
  federal:   { label: 'Federal',            description: 'IRS, HHS, USDA, SSA, HUD, and other federal agencies',            color: '#1D4ED8', order: 0 },
  state:     { label: 'State',              description: 'State-level tax and benefit programs across all 50 states + DC',   color: '#7C3AED', order: 1 },
  local:     { label: 'Local',              description: 'City and county programs',                                          color: '#059669', order: 2 },
  territory: { label: 'Territories',        description: 'Puerto Rico and other US territories',                              color: '#0891B2', order: 3 },
  contrib:   { label: 'Contributed / Reform', description: 'TAXSIM validation, UBI proposals, and congressional reforms',     color: '#D97706', order: 4 },
  household: { label: 'Household inputs',   description: 'Demographics, income, expenses, and geographic inputs',             color: '#6B7280', order: 5 },
};

const LEVELS_ORDERED: Level[] = ['federal', 'state', 'local', 'territory', 'contrib', 'household'];

// ─── Sub-group section (collapsible list of variables) ───────────────────────

function SubGroupSection({
  label,
  color,
  vars,
  allVariables: allVars,
  parameters,
  country,
  selectedVar,
  onSelect,
}: {
  label: string;
  color: string;
  vars: Variable[];
  allVariables: Record<string, Variable>;
  parameters: Record<string, Parameter>;
  country: string;
  selectedVar: string | null;
  onSelect: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? vars : vars.slice(0, PAGE_SIZE);

  return (
    <div style={{ marginBottom: spacing.sm }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="tw:flex tw:items-center tw:w-full tw:text-left tw:cursor-pointer"
        style={{
          gap: spacing.sm,
          padding: `${spacing.sm} ${spacing.md}`,
          borderRadius: spacing.radius.lg,
          border: 'none',
          backgroundColor: expanded ? `${color}08` : 'transparent',
          fontFamily: typography.fontFamily.primary,
          transition: 'background-color 0.15s ease',
        }}
      >
        {expanded ? (
          <IconChevronDown size={14} stroke={1.5} style={{ color, flexShrink: 0 }} />
        ) : (
          <IconChevronRight size={14} stroke={1.5} style={{ color, flexShrink: 0 }} />
        )}
        <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
          {label}
        </span>
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
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
            <div className="tw:flex tw:flex-col" style={{ gap: spacing.sm, padding: `${spacing.sm} 0 0 ${spacing.lg}` }}>
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
                Show all {vars.length}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main explorer ───────────────────────────────────────────────────────────

export default function VariableExplorer({ variables, parameters, country }: VariableExplorerProps) {
  const [search, setSearch] = useState('');
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 200);
  const isSearching = !!debouncedSearch;

  // All variables (hidden_input excluded), sorted
  const allVariables = useMemo(() => {
    return Object.values(variables)
      .filter((v) => !v.hidden_input)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [variables]);

  // Count per level
  const levelCounts = useMemo(() => {
    const counts: Record<Level, number> = { federal: 0, state: 0, local: 0, territory: 0, contrib: 0, household: 0 };
    for (const v of allVariables) counts[getLevel(v)]++;
    return counts;
  }, [allVariables]);

  // Filtered list (search + kind + entity + active level)
  const filtered = useMemo(() => {
    let result = allVariables;

    if (debouncedSearch) {
      const words = debouncedSearch.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((v) => {
        const haystack = [v.name, v.label, v.documentation || '', v.moduleName || '', v.entity, v.valueType, v.unit || ''].join(' ').toLowerCase();
        return words.every((w) => haystack.includes(w));
      });
    }

    if (activeLevel) result = result.filter((v) => getLevel(v) === activeLevel);

    return result;
  }, [allVariables, debouncedSearch, activeLevel]);

  // Sub-groups for the active level
  const subGroups = useMemo(() => {
    if (!activeLevel && !isSearching) return [];
    const map = new Map<string, Variable[]>();
    for (const v of filtered) {
      const key = getSubGroup(v);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, activeLevel, isSearching]);

  // Reset on filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearch, activeLevel]);

  // Infinite scroll for search mode
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

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: spacing.lg }}>
        <IconSearch
          size={18}
          stroke={1.5}
          style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.text.tertiary }}
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

      {/* Filters row (shown when drilling in or searching) */}
      {(activeLevel || isSearching) && (
        <div className="tw:flex tw:flex-wrap tw:items-center" style={{ gap: spacing.lg, marginBottom: spacing.xl }}>
          {/* Level filter pills */}
          {isSearching && (
            <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.xs }}>
              {([null, ...LEVELS_ORDERED] as (Level | null)[]).map((level) => {
                const label = level ? LEVEL_CONFIG[level].label : 'All';
                const color = level ? LEVEL_CONFIG[level].color : colors.text.secondary;
                const isActive = activeLevel === level;
                return (
                  <button
                    key={level ?? 'all'}
                    onClick={() => setActiveLevel(level)}
                    className="tw:cursor-pointer"
                    style={{
                      padding: `${spacing.xs} ${spacing.md}`,
                      borderRadius: spacing.radius.lg,
                      border: `1px solid ${isActive ? color : colors.border.light}`,
                      backgroundColor: isActive ? `${color}12` : colors.white,
                      color: isActive ? color : colors.text.tertiary,
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.semibold,
                      fontFamily: typography.fontFamily.primary,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Count */}
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
            {filtered.length.toLocaleString()} variable{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ─── View: Search results (flat) ─── */}
      {isSearching && (
        <>
          <div className="tw:flex tw:flex-col" style={{ gap: spacing.sm }}>
            {visibleFlat.map((v) => (
              <div key={v.name}>
                <VariableCard variable={v} isSelected={selectedVar === v.name} onClick={() => handleSelect(v.name)} />
                <AnimatePresence>
                  {selectedVar === v.name && (
                    <VariableDetail variable={v} variables={variables} parameters={parameters} country={country} />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          {visibleCount < filtered.length && <div ref={sentinelRef} style={{ height: '1px' }} />}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: spacing['4xl'], color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
              No variables match your search.
            </div>
          )}
        </>
      )}

      {/* ─── View: Level overview cards (default) ─── */}
      {!isSearching && !activeLevel && (
        <div
          className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
          style={{ gap: spacing.lg }}
        >
          {LEVELS_ORDERED.map((level) => {
            const config = LEVEL_CONFIG[level];
            const count = levelCounts[level];
            if (!count) return null;
            return (
              <motion.button
                key={level}
                onClick={() => setActiveLevel(level)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: config.order * 0.05 }}
                className="tw:text-left tw:cursor-pointer"
                style={{
                  padding: spacing.xl,
                  borderRadius: spacing.radius.xl,
                  border: `1px solid ${colors.border.light}`,
                  backgroundColor: colors.white,
                  fontFamily: typography.fontFamily.primary,
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                whileHover={{
                  borderColor: config.color,
                  boxShadow: `0 0 0 1px ${config.color}25`,
                }}
              >
                <div style={{ marginBottom: spacing.md }}>
                  <span style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: config.color,
                  }}>
                    {config.label}
                  </span>
                </div>
                <div style={{
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}>
                  {count.toLocaleString()}
                </div>
                <div style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.secondary,
                  lineHeight: 1.5,
                }}>
                  {config.description}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ─── View: Drilled into a level (sub-groups) ─── */}
      {!isSearching && activeLevel && (
        <div>
          {/* Back button + level header */}
          <button
            onClick={() => { setActiveLevel(null); setSelectedVar(null); }}
            className="tw:flex tw:items-center tw:cursor-pointer"
            style={{
              gap: spacing.sm,
              padding: `${spacing.xs} 0`,
              border: 'none',
              backgroundColor: 'transparent',
              fontFamily: typography.fontFamily.primary,
              marginBottom: spacing.lg,
              color: colors.primary[600],
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            <IconArrowLeft size={16} stroke={1.5} />
            Back to overview
          </button>

          <div style={{ marginBottom: spacing.xl }}>
              <h2 style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: LEVEL_CONFIG[activeLevel].color,
                margin: 0,
              }}>
                {LEVEL_CONFIG[activeLevel].label}
              </h2>
              <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                {filtered.length.toLocaleString()} variables
              </span>
          </div>

          {/* Sub-groups */}
          {subGroups.map(([label, vars]) => (
            <SubGroupSection
              key={label}
              label={label}
              color={LEVEL_CONFIG[activeLevel].color}
              vars={vars}
              allVariables={variables}
              parameters={parameters}
              country={country}
              selectedVar={selectedVar}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
