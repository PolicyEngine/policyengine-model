import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSearch, IconArrowLeft } from '@tabler/icons-react';
import type { Parameter, ParameterLeaf } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';
import { useDebounce } from '../../hooks/useDebounce';
import {
  getLevel, getSubGroup, getSubGroupLabel, getSubGroupDescription,
  LEVEL_CONFIG, LEVELS_ORDERED,
  type Level,
} from '../shared/categoryUtils';
import ParameterCard from './ParameterCard';
import ParameterDetail from './ParameterDetail';

const PAGE_SIZE = 50;

interface ParameterExplorerProps {
  parameters: Record<string, Parameter>;
  country: string;
}

/** Strip trailing ALL_CAPS enum values and numeric indices to find the parameter group. */
function getParameterGroup(path: string): string {
  const parts = path.split('.');
  while (parts.length > 1 && (/^[A-Z_]+$/.test(parts[parts.length - 1]) || /^\d+$/.test(parts[parts.length - 1]))) {
    parts.pop();
  }
  return parts.join('.');
}

/** Get a display label for a parameter group, using the parameterNode if available. */
function getGroupLabel(groupKey: string, allParameters: Record<string, Parameter>): string {
  const node = allParameters[groupKey];
  if (node && node.label) return node.label;
  // Fallback: use the last meaningful segment
  const parts = groupKey.split('.');
  return parts[parts.length - 1].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getGroupDescription(groupKey: string, allParameters: Record<string, Parameter>): string | null {
  const node = allParameters[groupKey];
  return node?.description || null;
}

// ─── Parameter list (shown after selecting a group) ─────────────────────────

function ParameterList({
  params,
  country,
  selectedParam,
  onSelect,
}: {
  params: Parameter[];
  country: string;
  selectedParam: string | null;
  onSelect: (name: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? params : params.slice(0, PAGE_SIZE);

  return (
    <div>
      <div className="tw:flex tw:flex-col" style={{ gap: spacing.sm }}>
        {visible.map((p) => (
          <div key={p.parameter}>
            <ParameterCard
              parameter={p}
              isSelected={selectedParam === p.parameter}
              onClick={() => onSelect(p.parameter)}
            />
            <AnimatePresence>
              {selectedParam === p.parameter && (
                <ParameterDetail parameter={p} country={country} />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      {params.length > PAGE_SIZE && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="tw:cursor-pointer"
          style={{
            display: 'block',
            margin: `${spacing.lg} auto`,
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
          Show all {params.length.toLocaleString()}
        </button>
      )}
    </div>
  );
}

// ─── State tile grid ─────────────────────────────────────────────────────────

function StateTileGrid({
  subGroups,
  levelColor,
  onSelect,
}: {
  subGroups: [string, ParameterLeaf[]][];
  levelColor: string;
  onSelect: (key: string) => void;
}) {
  const states = subGroups.filter(([k]) => k !== 'Cross-state' && k.length === 2);
  const other = subGroups.filter(([k]) => k === 'Cross-state' || k.length !== 2);
  const maxCount = Math.max(...states.map(([, v]) => v.length), 1);

  return (
    <div>
      <div
        className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(64px,1fr))]"
        style={{ gap: spacing.sm }}
      >
        {states.map(([key, params]) => {
          const intensity = Math.max(0.15, params.length / maxCount);
          return (
            <motion.button
              key={key}
              onClick={() => onSelect(key)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="tw:cursor-pointer tw:text-center"
              style={{
                padding: spacing.md,
                borderRadius: spacing.radius.lg,
                border: `1px solid ${colors.border.light}`,
                backgroundColor: colors.white,
                fontFamily: typography.fontFamily.primary,
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              whileHover={{
                borderColor: levelColor,
                boxShadow: `0 0 0 1px ${levelColor}25`,
              }}
            >
              <div style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: levelColor,
                opacity: 0.4 + intensity * 0.6,
              }}>
                {key}
              </div>
              <div style={{
                fontSize: '10px',
                color: colors.text.tertiary,
                marginTop: '2px',
              }}>
                {params.length.toLocaleString()}
              </div>
            </motion.button>
          );
        })}
      </div>
      {other.length > 0 && (
        <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {other.map(([key, params]) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="tw:cursor-pointer"
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                borderRadius: spacing.radius.lg,
                border: `1px solid ${colors.border.light}`,
                backgroundColor: colors.white,
                fontFamily: typography.fontFamily.primary,
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
              }}
            >
              {getSubGroupLabel(key, 'state')} ({params.length.toLocaleString()})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-group card grid ──────────────────────────────────────────────────────

function SubGroupCardGrid({
  subGroups,
  level,
  levelColor,
  onSelect,
}: {
  subGroups: [string, ParameterLeaf[]][];
  level: Level;
  levelColor: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div
      className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]"
      style={{ gap: spacing.md }}
    >
      {subGroups.map(([key, params], i) => {
        const label = getSubGroupLabel(key, level);
        const desc = getSubGroupDescription(key, level);
        return (
          <motion.button
            key={key}
            onClick={() => onSelect(key)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            className="tw:text-left tw:cursor-pointer"
            style={{
              padding: spacing.lg,
              borderRadius: spacing.radius.xl,
              border: `1px solid ${colors.border.light}`,
              backgroundColor: colors.white,
              fontFamily: typography.fontFamily.primary,
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            whileHover={{
              borderColor: levelColor,
              boxShadow: `0 0 0 1px ${levelColor}25`,
            }}
          >
            <div style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold,
              color: levelColor,
              marginBottom: spacing.xs,
            }}>
              {label}
            </div>
            <div style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              marginBottom: desc ? spacing.xs : 0,
            }}>
              {params.length.toLocaleString()}
            </div>
            {desc && (
              <div style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.secondary,
                lineHeight: 1.4,
              }}>
                {desc}
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Parameter group card grid ───────────────────────────────────────────────

function ParameterGroupCardGrid({
  groups,
  levelColor,
  allParameters,
  onSelect,
}: {
  groups: [string, ParameterLeaf[]][];
  levelColor: string;
  allParameters: Record<string, Parameter>;
  onSelect: (key: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? groups : groups.slice(0, PAGE_SIZE);

  return (
    <div>
      <div
        className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
        style={{ gap: spacing.sm }}
      >
        {visible.map(([key, params], i) => {
          const label = getGroupLabel(key, allParameters);
          const desc = getGroupDescription(key, allParameters);
          const isSingle = params.length === 1;
          return (
            <motion.button
              key={key}
              onClick={() => onSelect(key)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: i * 0.01 }}
              className="tw:text-left tw:cursor-pointer"
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                borderRadius: spacing.radius.lg,
                border: `1px solid ${colors.border.light}`,
                backgroundColor: colors.white,
                fontFamily: typography.fontFamily.primary,
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              whileHover={{
                borderColor: levelColor,
                boxShadow: `0 0 0 1px ${levelColor}25`,
              }}
            >
              <div className="tw:flex tw:items-start tw:justify-between" style={{ gap: spacing.md }}>
                <div className="tw:flex-1 tw:min-w-0">
                  <div style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontSize: typography.fontSize.xs,
                    fontFamily: typography.fontFamily.mono,
                    color: colors.text.tertiary,
                    marginTop: '2px',
                  }}>
                    {key}
                  </div>
                  {desc && (
                    <div className="tw:truncate" style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.secondary,
                      marginTop: spacing.xs,
                      maxWidth: '400px',
                    }}>
                      {desc}
                    </div>
                  )}
                </div>
                {!isSingle && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: typography.fontWeight.semibold,
                    padding: `1px ${spacing.xs}`,
                    borderRadius: spacing.radius.sm,
                    backgroundColor: `${levelColor}15`,
                    color: levelColor,
                    flexShrink: 0,
                  }}>
                    {params.length} values
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      {groups.length > PAGE_SIZE && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="tw:cursor-pointer"
          style={{
            display: 'block',
            margin: `${spacing.lg} auto`,
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
          Show all {groups.length.toLocaleString()} groups
        </button>
      )}
    </div>
  );
}

// ─── Main explorer ───────────────────────────────────────────────────────────

export default function ParameterExplorer({ parameters, country }: ParameterExplorerProps) {
  const [search, setSearch] = useState('');
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selectedParam, setSelectedParam] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 200);
  const isSearching = !!debouncedSearch;

  // Only show leaf parameters (actual values), exclude nodes
  const allParameters = useMemo(() => {
    return Object.values(parameters)
      .filter((p): p is ParameterLeaf => p.type === 'parameter')
      .sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''));
  }, [parameters]);

  // Count per level
  const levelCounts = useMemo(() => {
    const counts: Record<Level, number> = { federal: 0, state: 0, local: 0, territory: 0, reform: 0, household: 0 };
    for (const p of allParameters) counts[getLevel(p.parameter)]++;
    return counts;
  }, [allParameters]);

  // Filtered list
  const filtered = useMemo(() => {
    let result: ParameterLeaf[] = allParameters;

    if (debouncedSearch) {
      const words = debouncedSearch.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((p) => {
        const haystack = [p.parameter, p.label, p.description || '', p.unit || ''].join(' ').toLowerCase();
        return words.every((w) => haystack.includes(w));
      });
    }

    if (activeLevel) result = result.filter((p) => getLevel(p.parameter) === activeLevel);

    return result;
  }, [allParameters, debouncedSearch, activeLevel]);

  // Sub-groups for the active level
  const subGroups = useMemo(() => {
    if (!activeLevel) return [];
    const map = new Map<string, ParameterLeaf[]>();
    for (const p of filtered) {
      const key = getSubGroup(p.parameter);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, activeLevel]);

  // Parameters in active sub-group
  const subGroupParams = useMemo(() => {
    if (!activeSubGroup) return [];
    const entry = subGroups.find(([k]) => k === activeSubGroup);
    return entry ? entry[1] : [];
  }, [subGroups, activeSubGroup]);

  // Parameter groups within the active sub-group
  const parameterGroups = useMemo(() => {
    if (!activeSubGroup) return [];
    const map = new Map<string, ParameterLeaf[]>();
    for (const p of subGroupParams) {
      const key = getParameterGroup(p.parameter);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [subGroupParams, activeSubGroup]);

  // Parameters in active group
  const activeGroupParams = useMemo(() => {
    if (!activeGroup) return [];
    const entry = parameterGroups.find(([k]) => k === activeGroup);
    return entry ? entry[1] : [];
  }, [parameterGroups, activeGroup]);

  // Reset on filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearch, activeLevel, activeSubGroup, activeGroup]);

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
    setSelectedParam((prev) => (prev === name ? null : name));
  }, []);

  const visibleFlat = filtered.slice(0, visibleCount);

  // Navigation helpers
  const goBack = () => {
    if (activeGroup) {
      setActiveGroup(null);
      setSelectedParam(null);
    } else if (activeSubGroup) {
      setActiveSubGroup(null);
      setSelectedParam(null);
    } else {
      setActiveLevel(null);
      setSelectedParam(null);
    }
  };

  // For single-leaf groups, skip the group detail and go straight to expand
  const handleGroupSelect = (key: string) => {
    const entry = parameterGroups.find(([k]) => k === key);
    if (entry && entry[1].length === 1) {
      // Single parameter — just expand it inline
      setActiveGroup(key);
      setSelectedParam(entry[1][0].parameter);
    } else {
      setActiveGroup(key);
      setSelectedParam(null);
    }
  };

  const breadcrumb = activeLevel
    ? activeSubGroup
      ? activeGroup
        ? `${LEVEL_CONFIG[activeLevel].label} / ${getSubGroupLabel(activeSubGroup, activeLevel)} / ${getGroupLabel(activeGroup, parameters)}`
        : `${LEVEL_CONFIG[activeLevel].label} / ${getSubGroupLabel(activeSubGroup, activeLevel)}`
      : LEVEL_CONFIG[activeLevel].label
    : null;

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
          placeholder="Search parameters by name, label, or description..."
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

      {/* Search filter pills */}
      {isSearching && (
        <div className="tw:flex tw:flex-wrap tw:items-center" style={{ gap: spacing.lg, marginBottom: spacing.xl }}>
          <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.xs }}>
            {([null, ...LEVELS_ORDERED] as (Level | null)[]).map((level) => {
              const label = level ? LEVEL_CONFIG[level].label : 'All';
              const clr = level ? LEVEL_CONFIG[level].color : colors.text.secondary;
              const isActive = activeLevel === level;
              return (
                <button
                  key={level ?? 'all'}
                  onClick={() => setActiveLevel(level)}
                  className="tw:cursor-pointer"
                  style={{
                    padding: `${spacing.xs} ${spacing.md}`,
                    borderRadius: spacing.radius.lg,
                    border: `1px solid ${isActive ? clr : colors.border.light}`,
                    backgroundColor: isActive ? `${clr}12` : colors.white,
                    color: isActive ? clr : colors.text.tertiary,
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
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
            {filtered.length.toLocaleString()} parameter{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ─── View: Search results (flat) ─── */}
      {isSearching && (
        <>
          <div className="tw:flex tw:flex-col" style={{ gap: spacing.sm }}>
            {visibleFlat.map((p) => (
              <div key={p.parameter}>
                <ParameterCard parameter={p} isSelected={selectedParam === p.parameter} onClick={() => handleSelect(p.parameter)} />
                <AnimatePresence>
                  {selectedParam === p.parameter && (
                    <ParameterDetail parameter={p} country={country} />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          {visibleCount < filtered.length && <div ref={sentinelRef} style={{ height: '1px' }} />}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: spacing['4xl'], color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
              No parameters match your search.
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
                onClick={() => { setActiveLevel(level); setActiveSubGroup(null); setActiveGroup(null); }}
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

      {/* ─── View: Drilled into a level ─── */}
      {!isSearching && activeLevel && !activeSubGroup && (
        <div>
          <button
            onClick={goBack}
            className="tw:flex tw:items-center tw:cursor-pointer"
            style={{
              gap: spacing.sm, padding: `${spacing.xs} 0`, border: 'none',
              backgroundColor: 'transparent', fontFamily: typography.fontFamily.primary,
              marginBottom: spacing.lg, color: colors.primary[600],
              fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
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
              {filtered.length.toLocaleString()} parameters across {subGroups.length} groups
            </span>
          </div>

          {activeLevel === 'state' ? (
            <StateTileGrid
              subGroups={subGroups}
              levelColor={LEVEL_CONFIG[activeLevel].color}
              onSelect={setActiveSubGroup}
            />
          ) : (
            <SubGroupCardGrid
              subGroups={subGroups}
              level={activeLevel}
              levelColor={LEVEL_CONFIG[activeLevel].color}
              onSelect={setActiveSubGroup}
            />
          )}
        </div>
      )}

      {/* ─── View: Drilled into a sub-group (parameter group cards) ─── */}
      {!isSearching && activeLevel && activeSubGroup && !activeGroup && (
        <div>
          <button
            onClick={goBack}
            className="tw:flex tw:items-center tw:cursor-pointer"
            style={{
              gap: spacing.sm, padding: `${spacing.xs} 0`, border: 'none',
              backgroundColor: 'transparent', fontFamily: typography.fontFamily.primary,
              marginBottom: spacing.lg, color: colors.primary[600],
              fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
            }}
          >
            <IconArrowLeft size={16} stroke={1.5} />
            {LEVEL_CONFIG[activeLevel].label} / {getSubGroupLabel(activeSubGroup, activeLevel)}
          </button>

          <div style={{ marginBottom: spacing.xl }}>
            <h2 style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: LEVEL_CONFIG[activeLevel].color,
              margin: 0,
            }}>
              {getSubGroupLabel(activeSubGroup, activeLevel)}
            </h2>
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              {subGroupParams.length.toLocaleString()} parameters in {parameterGroups.length} groups
            </span>
          </div>

          <ParameterGroupCardGrid
            groups={parameterGroups}
            levelColor={LEVEL_CONFIG[activeLevel].color}
            allParameters={parameters}
            onSelect={handleGroupSelect}
          />
        </div>
      )}

      {/* ─── View: Drilled into a parameter group (leaf list) ─── */}
      {!isSearching && activeLevel && activeSubGroup && activeGroup && (
        <div>
          <button
            onClick={goBack}
            className="tw:flex tw:items-center tw:cursor-pointer"
            style={{
              gap: spacing.sm, padding: `${spacing.xs} 0`, border: 'none',
              backgroundColor: 'transparent', fontFamily: typography.fontFamily.primary,
              marginBottom: spacing.lg, color: colors.primary[600],
              fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
            }}
          >
            <IconArrowLeft size={16} stroke={1.5} />
            {breadcrumb}
          </button>

          <div style={{ marginBottom: spacing.xl }}>
            <h2 style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: LEVEL_CONFIG[activeLevel].color,
              margin: 0,
            }}>
              {getGroupLabel(activeGroup, parameters)}
            </h2>
            {getGroupDescription(activeGroup, parameters) && (
              <p style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                margin: `${spacing.xs} 0 0`,
                lineHeight: 1.5,
              }}>
                {getGroupDescription(activeGroup, parameters)}
              </p>
            )}
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              {activeGroupParams.length} parameter{activeGroupParams.length !== 1 ? 's' : ''}
            </span>
          </div>

          <ParameterList
            params={activeGroupParams}
            country={country}
            selectedParam={selectedParam}
            onSelect={handleSelect}
          />
        </div>
      )}
    </div>
  );
}
