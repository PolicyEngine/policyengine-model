import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSearch, IconFolder } from '@tabler/icons-react';
import type { Variable, Parameter } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';
import { useDebounce } from '../../hooks/useDebounce';
import {
  getLevel as getLevelFromPath, getSubGroup as getSubGroupFromPath,
  getSubGroupLabel, getSubGroupDescription,
  LEVEL_CONFIG, LEVELS_ORDERED,
  type Level,
} from '../shared/categoryUtils';
import VariableCard from './VariableCard';
import VariableDetail from './VariableDetail';
import Pagination from '../shared/Pagination';
import BreadcrumbNav from '../shared/BreadcrumbNav';

const PAGE_SIZE = 50;

// ─── Helpers ────────────────────────────────────────────────────────────────

interface VariableExplorerProps {
  variables: Record<string, Variable>;
  parameters: Record<string, Parameter>;
  country: string;
  onViewFlowchart?: (varName: string) => void;
}

function getLevel(v: Variable): Level {
  return getLevelFromPath(v.moduleName);
}

function getSubGroup(v: Variable): string {
  return getSubGroupFromPath(v.moduleName);
}

function getFolderLabel(fullPath: string): string {
  const parts = fullPath.split('.');
  return parts[parts.length - 1].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Find the longest common dot-separated prefix. */
function commonPrefix(paths: string[]): string {
  if (paths.length === 0) return '';
  const parts0 = paths[0].split('.');
  let len = parts0.length;
  for (const p of paths.slice(1)) {
    const parts = p.split('.');
    len = Math.min(len, parts.length);
    for (let i = 0; i < len; i++) {
      if (parts[i] !== parts0[i]) { len = i; break; }
    }
  }
  return parts0.slice(0, len).join('.');
}

/** At a given folder prefix, compute sub-folders and direct variables. */
function getVarFolderContents(
  vars: Variable[],
  prefix: string,
): {
  folders: { segment: string; fullPath: string; varCount: number }[];
  directVars: Variable[];
} {
  const prefixDot = prefix + '.';
  const folderCounts = new Map<string, number>();
  const directVars: Variable[] = [];

  for (const v of vars) {
    const path = v.moduleName || '';
    if (!path.startsWith(prefixDot)) continue;
    const remaining = path.slice(prefixDot.length);
    const segments = remaining.split('.');
    if (segments.length === 1) {
      directVars.push(v);
    } else {
      const folder = segments[0];
      folderCounts.set(folder, (folderCounts.get(folder) || 0) + 1);
    }
  }

  const folders = [...folderCounts.entries()]
    .map(([segment, varCount]) => ({ segment, fullPath: `${prefix}.${segment}`, varCount }))
    .sort((a, b) => a.segment.localeCompare(b.segment));

  return { folders, directVars: directVars.sort((a, b) => a.label.localeCompare(b.label)) };
}

/** Auto-collapse single-child folder chains. */
function autoCollapseVarFolder(vars: Variable[], prefix: string): string {
  let current = prefix;
  for (let i = 0; i < 10; i++) {
    const { folders, directVars } = getVarFolderContents(vars, current);
    if (folders.length === 1 && directVars.length === 0) {
      current = folders[0].fullPath;
    } else {
      break;
    }
  }
  return current;
}

// ─── State tile grid ─────────────────────────────────────────────────────────

function StateTileGrid({
  subGroups,
  levelColor,
  onSelect,
}: {
  subGroups: [string, Variable[]][];
  levelColor: string;
  onSelect: (key: string) => void;
}) {
  const states = subGroups.filter(([k]) => k !== 'Cross-state' && k.length === 2);
  const other = subGroups.filter(([k]) => k === 'Cross-state' || k.length !== 2);

  return (
    <div>
      <div className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(64px,1fr))]" style={{ gap: spacing.sm }}>
        {states.map(([key, vars]) => (
          <motion.button
            key={key}
            onClick={() => onSelect(key)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="tw:cursor-pointer tw:text-center"
            style={{
              padding: spacing.md, borderRadius: spacing.radius.lg,
              border: `1px solid ${colors.border.light}`, backgroundColor: colors.white,
              fontFamily: typography.fontFamily.primary,
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            whileHover={{ borderColor: levelColor, boxShadow: `0 0 0 1px ${levelColor}25` }}
          >
            <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: levelColor }}>
              {key}
            </div>
            <div style={{ fontSize: '10px', color: colors.text.tertiary, marginTop: '2px' }}>
              {vars.length}
            </div>
          </motion.button>
        ))}
      </div>
      {other.length > 0 && (
        <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {other.map(([key, vars]) => (
            <button key={key} onClick={() => onSelect(key)} className="tw:cursor-pointer"
              style={{ padding: `${spacing.sm} ${spacing.lg}`, borderRadius: spacing.radius.lg,
                border: `1px solid ${colors.border.light}`, backgroundColor: colors.white,
                fontFamily: typography.fontFamily.primary, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
              {getSubGroupLabel(key, 'state')} ({vars.length})
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
  subGroups: [string, Variable[]][];
  level: Level;
  levelColor: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]" style={{ gap: spacing.md }}>
      {subGroups.map(([key, vars], i) => {
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
              padding: spacing.lg, borderRadius: spacing.radius.xl,
              border: `1px solid ${colors.border.light}`, backgroundColor: colors.white,
              fontFamily: typography.fontFamily.primary,
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            whileHover={{ borderColor: levelColor, boxShadow: `0 0 0 1px ${levelColor}25` }}
          >
            <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: levelColor, marginBottom: spacing.xs }}>
              {label}
            </div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: desc ? spacing.xs : 0 }}>
              {vars.length}
            </div>
            {desc && (
              <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, lineHeight: 1.4 }}>
                {desc}
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Folder contents (sub-folders + direct variables) ───────────────────────

function FolderContentsView({
  folders,
  directVars,
  levelColor,
  allVariables,
  parameters,
  country,
  selectedVar,
  onFolderSelect,
  onVarSelect,
  onViewFlowchart,
}: {
  folders: { segment: string; fullPath: string; varCount: number }[];
  directVars: Variable[];
  levelColor: string;
  allVariables: Record<string, Variable>;
  parameters: Record<string, Parameter>;
  country: string;
  selectedVar: string | null;
  onFolderSelect: (fullPath: string) => void;
  onVarSelect: (name: string) => void;
  onViewFlowchart?: (varName: string) => void;
}) {
  const [folderPage, setFolderPage] = useState(1);
  const folderTotalPages = Math.ceil(folders.length / PAGE_SIZE);
  const visibleFolders = folders.slice((folderPage - 1) * PAGE_SIZE, folderPage * PAGE_SIZE);

  const [varPage, setVarPage] = useState(1);
  const varTotalPages = Math.ceil(directVars.length / PAGE_SIZE);
  const visibleVars = directVars.slice((varPage - 1) * PAGE_SIZE, varPage * PAGE_SIZE);

  return (
    <div>
      {/* Folder cards */}
      {folders.length > 0 && (
        <div>
          <div className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]" style={{ gap: spacing.sm }}>
            {visibleFolders.map((folder, i) => {
              const label = getFolderLabel(folder.fullPath);
              return (
                <motion.button
                  key={folder.fullPath}
                  onClick={() => onFolderSelect(folder.fullPath)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: i * 0.01 }}
                  className="tw:text-left tw:cursor-pointer"
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`, borderRadius: spacing.radius.lg,
                    border: `1px solid ${colors.border.light}`, backgroundColor: colors.white,
                    fontFamily: typography.fontFamily.primary,
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  whileHover={{ borderColor: levelColor, boxShadow: `0 0 0 1px ${levelColor}25` }}
                >
                  <div className="tw:flex tw:items-start tw:justify-between" style={{ gap: spacing.md }}>
                    <div className="tw:flex tw:items-start tw:flex-1 tw:min-w-0" style={{ gap: spacing.xs }}>
                      <IconFolder size={14} stroke={1.5} style={{ color: levelColor, flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0 }}>
                        {label}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: typography.fontWeight.semibold,
                      padding: `1px ${spacing.xs}`, borderRadius: spacing.radius.sm,
                      backgroundColor: `${levelColor}15`, color: levelColor, flexShrink: 0,
                    }}>
                      {folder.varCount} vars
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
          <Pagination page={folderPage} totalPages={folderTotalPages} onPageChange={setFolderPage} />
        </div>
      )}

      {/* Direct variables */}
      {directVars.length > 0 && (
        <div style={{ marginTop: folders.length > 0 ? spacing.xl : 0 }}>
          {folders.length > 0 && (
            <div style={{
              fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold,
              color: colors.text.tertiary, textTransform: 'uppercase' as const,
              letterSpacing: '0.05em', marginBottom: spacing.sm,
            }}>
              Variables ({directVars.length})
            </div>
          )}
          <div className="tw:flex tw:flex-col" style={{ gap: spacing.sm }}>
            {visibleVars.map((v) => (
              <div key={v.name}>
                <VariableCard variable={v} isSelected={selectedVar === v.name} onClick={() => onVarSelect(v.name)} />
                <AnimatePresence>
                  {selectedVar === v.name && (
                    <VariableDetail variable={v} variables={allVariables} parameters={parameters} country={country} onViewFlowchart={onViewFlowchart} />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          <Pagination page={varPage} totalPages={varTotalPages} onPageChange={setVarPage} />
        </div>
      )}
    </div>
  );
}

// ─── Main explorer ───────────────────────────────────────────────────────────

export default function VariableExplorer({ variables, parameters, country, onViewFlowchart }: VariableExplorerProps) {
  const [search, setSearch] = useState('');
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<string[]>([]);
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 200);
  const isSearching = !!debouncedSearch;

  // All variables (hidden_input + contrib excluded), sorted
  const allVariables = useMemo(() => {
    return Object.values(variables)
      .filter((v) => !v.hidden_input && !v.moduleName?.startsWith('contrib') && !v.moduleName?.startsWith('gov.puf'))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [variables]);

  // Count per level
  const levelCounts = useMemo(() => {
    const counts: Record<Level, number> = { federal: 0, state: 0, local: 0, territory: 0, reform: 0, household: 0 };
    for (const v of allVariables) counts[getLevel(v)]++;
    return counts;
  }, [allVariables]);

  // Filtered list
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
    if (!activeLevel) return [];
    const map = new Map<string, Variable[]>();
    for (const v of filtered) {
      const key = getSubGroup(v);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, activeLevel]);

  // Variables in active sub-group
  const subGroupVars = useMemo(() => {
    if (!activeSubGroup) return [];
    const entry = subGroups.find(([k]) => k === activeSubGroup);
    return entry ? entry[1] : [];
  }, [subGroups, activeSubGroup]);

  // Root folder prefix: common prefix of all module paths, auto-collapsed
  const rootFolderPrefix = useMemo(() => {
    if (subGroupVars.length === 0) return '';
    const paths = subGroupVars.map((v) => v.moduleName || '').filter(Boolean);
    if (paths.length === 0) return '';
    const prefix = commonPrefix(paths);
    // Strip the last segment (which would be partial variable name overlap)
    const parts = prefix.split('.');
    // Walk back until we find a prefix that's a proper directory (not a variable name)
    while (parts.length > 0) {
      const candidate = parts.join('.');
      const hasChildren = subGroupVars.some((v) => (v.moduleName || '').startsWith(candidate + '.') && (v.moduleName || '') !== candidate);
      if (hasChildren) break;
      parts.pop();
    }
    const dirPrefix = parts.join('.');
    return autoCollapseVarFolder(subGroupVars, dirPrefix);
  }, [subGroupVars]);

  // Current folder
  const currentFolder = folderStack.length > 0 ? folderStack[folderStack.length - 1] : rootFolderPrefix;

  // Folder contents at current level
  const folderContents = useMemo(() => {
    if (!activeSubGroup || !currentFolder) return { folders: [], directVars: [] };
    return getVarFolderContents(subGroupVars, currentFolder);
  }, [subGroupVars, currentFolder, activeSubGroup]);

  // Reset folder stack when sub-group changes
  useEffect(() => {
    setFolderStack([]);
    setSelectedVar(null);
  }, [activeSubGroup]);

  // Reset on filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearch, activeLevel, activeSubGroup]);

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

  // Navigation
  const goBack = () => {
    if (folderStack.length > 0) {
      setFolderStack((prev) => prev.slice(0, -1));
      setSelectedVar(null);
    } else if (activeSubGroup) {
      setActiveSubGroup(null);
      setSelectedVar(null);
    } else {
      setActiveLevel(null);
      setSelectedVar(null);
    }
  };

  const handleFolderSelect = (fullPath: string) => {
    const collapsed = autoCollapseVarFolder(subGroupVars, fullPath);
    setFolderStack((prev) => [...prev, collapsed]);
    setSelectedVar(null);
  };

  // Breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const items: { label: string; onClick: () => void }[] = [];
    if (activeLevel) {
      items.push({
        label: LEVEL_CONFIG[activeLevel].label,
        onClick: () => { setActiveLevel(activeLevel); setActiveSubGroup(null); setFolderStack([]); setSelectedVar(null); },
      });
    }
    if (activeSubGroup && activeLevel) {
      items.push({
        label: getSubGroupLabel(activeSubGroup, activeLevel),
        onClick: () => { setFolderStack([]); setSelectedVar(null); },
      });
    }
    for (let i = 0; i < folderStack.length; i++) {
      const stackIndex = i;
      items.push({
        label: getFolderLabel(folderStack[i]),
        onClick: () => { setFolderStack((prev) => prev.slice(0, stackIndex + 1)); setSelectedVar(null); },
      });
    }
    return items;
  }, [activeLevel, activeSubGroup, folderStack]);

  // Current heading
  const currentHeadingLabel = folderStack.length > 0
    ? getFolderLabel(currentFolder)
    : activeSubGroup && activeLevel
      ? getSubGroupLabel(activeSubGroup, activeLevel)
      : '';


  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: spacing.lg }}>
        <IconSearch size={18} stroke={1.5}
          style={{ position: 'absolute', left: spacing.md, top: '50%', transform: 'translateY(-50%)', color: colors.text.tertiary }} />
        <input
          type="text"
          placeholder="Search variables by name, label, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: `${spacing.md} ${spacing.lg} ${spacing.md} ${spacing['3xl']}`,
            borderRadius: spacing.radius.lg, border: `1px solid ${colors.border.light}`,
            fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.primary,
            outline: 'none', boxSizing: 'border-box',
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
                <button key={level ?? 'all'} onClick={() => setActiveLevel(level)} className="tw:cursor-pointer"
                  style={{
                    padding: `${spacing.xs} ${spacing.md}`, borderRadius: spacing.radius.lg,
                    border: `1px solid ${isActive ? clr : colors.border.light}`,
                    backgroundColor: isActive ? `${clr}12` : colors.white,
                    color: isActive ? clr : colors.text.tertiary,
                    fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold,
                    fontFamily: typography.fontFamily.primary,
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
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
                    <VariableDetail variable={v} variables={variables} parameters={parameters} country={country} onViewFlowchart={onViewFlowchart} />
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

      {/* ─── View: Level overview cards ─── */}
      {!isSearching && !activeLevel && (
        <div className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]" style={{ gap: spacing.lg }}>
          {LEVELS_ORDERED.map((level) => {
            const config = LEVEL_CONFIG[level];
            const count = levelCounts[level];
            if (!count) return null;
            return (
              <motion.button
                key={level}
                onClick={() => { setActiveLevel(level); setActiveSubGroup(null); setFolderStack([]); }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: config.order * 0.05 }}
                className="tw:text-left tw:cursor-pointer"
                style={{
                  padding: spacing.xl, borderRadius: spacing.radius.xl,
                  border: `1px solid ${colors.border.light}`, backgroundColor: colors.white,
                  fontFamily: typography.fontFamily.primary,
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                whileHover={{ borderColor: config.color, boxShadow: `0 0 0 1px ${config.color}25` }}
              >
                <div style={{ marginBottom: spacing.md }}>
                  <span style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: config.color }}>
                    {config.label}
                  </span>
                </div>
                <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.xs }}>
                  {count.toLocaleString()}
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, lineHeight: 1.5 }}>
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
          <BreadcrumbNav items={breadcrumbItems} onBack={goBack} />
          <div style={{ marginBottom: spacing.xl }}>
            <h2 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: LEVEL_CONFIG[activeLevel].color, margin: 0 }}>
              {LEVEL_CONFIG[activeLevel].label}
            </h2>
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              {filtered.length.toLocaleString()} variables across {subGroups.length} groups
            </span>
          </div>
          {activeLevel === 'state' ? (
            <StateTileGrid subGroups={subGroups} levelColor={LEVEL_CONFIG[activeLevel].color} onSelect={setActiveSubGroup} />
          ) : (
            <SubGroupCardGrid subGroups={subGroups} level={activeLevel} levelColor={LEVEL_CONFIG[activeLevel].color} onSelect={setActiveSubGroup} />
          )}
        </div>
      )}

      {/* ─── View: Folder navigation (sub-group drill-in) ─── */}
      {!isSearching && activeLevel && activeSubGroup && (
        <div>
          <BreadcrumbNav items={breadcrumbItems} onBack={goBack} />
          <div style={{ marginBottom: spacing.xl }}>
            <h2 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: LEVEL_CONFIG[activeLevel].color, margin: 0 }}>
              {currentHeadingLabel}
            </h2>
          </div>
          <FolderContentsView
            folders={folderContents.folders}
            directVars={folderContents.directVars}
            levelColor={LEVEL_CONFIG[activeLevel].color}
            allVariables={variables}
            parameters={parameters}
            country={country}
            selectedVar={selectedVar}
            onFolderSelect={handleFolderSelect}
            onVarSelect={handleSelect}
            onViewFlowchart={onViewFlowchart}
          />
        </div>
      )}
    </div>
  );
}
