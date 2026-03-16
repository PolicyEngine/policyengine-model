import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSearch, IconArrowLeft, IconFolder, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
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

// ─── Pagination ─────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPageChange }: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build page numbers: always show first, last, current ± 2, with ellipsis gaps
  const pages: (number | '...')[] = [];
  const addPage = (p: number) => {
    if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p);
  };

  addPage(1);
  for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) {
    addPage(i);
  }
  addPage(totalPages);

  // Insert ellipsis where there are gaps
  const withEllipsis: (number | '...')[] = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (i > 0 && typeof p === 'number' && typeof pages[i - 1] === 'number' && p - (pages[i - 1] as number) > 1) {
      withEllipsis.push('...');
    }
    withEllipsis.push(p);
  }

  const btnBase: React.CSSProperties = {
    minWidth: '32px',
    height: '32px',
    borderRadius: spacing.radius.md,
    border: `1px solid ${colors.border.light}`,
    backgroundColor: colors.white,
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `0 ${spacing.sm}`,
  };

  return (
    <div className="tw:flex tw:items-center tw:justify-center" style={{ gap: spacing.xs, marginTop: spacing.xl }}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="tw:cursor-pointer tw:disabled:cursor-default"
        style={{
          ...btnBase,
          color: page === 1 ? colors.text.tertiary : colors.text.primary,
          opacity: page === 1 ? 0.4 : 1,
        }}
      >
        <IconChevronLeft size={14} stroke={1.5} />
      </button>
      {withEllipsis.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, padding: `0 ${spacing.xs}` }}>
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className="tw:cursor-pointer"
            style={{
              ...btnBase,
              backgroundColor: p === page ? colors.primary[600] : colors.white,
              color: p === page ? colors.white : colors.text.primary,
              borderColor: p === page ? colors.primary[600] : colors.border.light,
            }}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="tw:cursor-pointer tw:disabled:cursor-default"
        style={{
          ...btnBase,
          color: page === totalPages ? colors.text.tertiary : colors.text.primary,
          opacity: page === totalPages ? 0.4 : 1,
        }}
      >
        <IconChevronRight size={14} stroke={1.5} />
      </button>
    </div>
  );
}

// ─── Breadcrumb navigation ──────────────────────────────────────────────────

function BreadcrumbNav({ items, onBack }: {
  items: { label: string; onClick: () => void }[];
  onBack: () => void;
}) {
  return (
    <div className="tw:flex tw:items-center tw:flex-wrap" style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
      <button
        onClick={onBack}
        className="tw:flex tw:items-center tw:cursor-pointer"
        style={{
          border: 'none',
          backgroundColor: 'transparent',
          color: colors.primary[600],
          padding: `${spacing.xs} ${spacing.xs} ${spacing.xs} 0`,
          fontFamily: typography.fontFamily.primary,
          fontSize: typography.fontSize.sm,
        }}
      >
        <IconArrowLeft size={16} stroke={1.5} />
      </button>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="tw:flex tw:items-center" style={{ gap: spacing.xs }}>
            {i > 0 && (
              <span style={{ color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>/</span>
            )}
            {isLast ? (
              <span style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
              }}>
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="tw:cursor-pointer"
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  padding: `${spacing.xs} 0`,
                  fontFamily: typography.fontFamily.primary,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.primary[600],
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = 'none'; }}
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

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

/** Get a display label for a parameter group or folder, using the parameterNode if available. */
function getGroupLabel(groupKey: string, allParameters: Record<string, Parameter>): string {
  const node = allParameters[groupKey];
  if (node && node.label) return node.label;
  const parts = groupKey.split('.');
  return parts[parts.length - 1].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getGroupDescription(groupKey: string, allParameters: Record<string, Parameter>): string | null {
  const node = allParameters[groupKey];
  return node?.description || null;
}

// ─── Folder tree helpers ────────────────────────────────────────────────────

/** Find the longest common dot-separated prefix of a list of paths. */
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

/**
 * At a given folder prefix, compute sub-folders and direct parameter groups.
 * If a segment appears both as a direct group and has deeper groups, it becomes a folder.
 */
function getFolderContents(
  groups: [string, ParameterLeaf[]][],
  prefix: string,
): {
  folders: { segment: string; fullPath: string; paramCount: number; groupCount: number }[];
  directGroups: [string, ParameterLeaf[]][];
} {
  const prefixDot = prefix + '.';

  // Collect all groups by their next segment
  const bySegment = new Map<string, {
    direct: [string, ParameterLeaf[]] | null;
    deeper: [string, ParameterLeaf[]][];
  }>();

  for (const [groupKey, params] of groups) {
    if (!groupKey.startsWith(prefixDot)) continue;
    const remaining = groupKey.slice(prefixDot.length);
    const segments = remaining.split('.');
    const segment = segments[0];

    if (!bySegment.has(segment)) bySegment.set(segment, { direct: null, deeper: [] });
    const entry = bySegment.get(segment)!;

    if (segments.length === 1) {
      entry.direct = [groupKey, params];
    } else {
      entry.deeper.push([groupKey, params]);
    }
  }

  const folders: { segment: string; fullPath: string; paramCount: number; groupCount: number }[] = [];
  const directGroups: [string, ParameterLeaf[]][] = [];

  // Also include a group that exactly matches the prefix (params at this node level)
  const exactGroup = groups.find(([k]) => k === prefix);
  if (exactGroup) {
    directGroups.push(exactGroup);
  }

  for (const [segment, entry] of [...bySegment.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const fullPath = `${prefix}.${segment}`;

    if (entry.deeper.length > 0) {
      // It's a folder — include any direct group params in the count
      let paramCount = entry.deeper.reduce((sum, [, p]) => sum + p.length, 0);
      let groupCount = entry.deeper.length;
      if (entry.direct) {
        paramCount += entry.direct[1].length;
        groupCount += 1;
      }
      folders.push({ segment, fullPath, paramCount, groupCount });
    } else if (entry.direct) {
      directGroups.push(entry.direct);
    }
  }

  return { folders, directGroups };
}

/** Auto-collapse: skip folder levels that have exactly 1 sub-folder and 0 direct groups. */
function autoCollapseFolder(
  groups: [string, ParameterLeaf[]][],
  prefix: string,
): string {
  let current = prefix;
  for (let i = 0; i < 10; i++) {
    const { folders, directGroups } = getFolderContents(groups, current);
    if (folders.length === 1 && directGroups.length === 0) {
      current = folders[0].fullPath;
    } else {
      break;
    }
  }
  return current;
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
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(params.length / PAGE_SIZE);
  const visible = params.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
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
  return (
    <div>
      <div
        className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(64px,1fr))]"
        style={{ gap: spacing.sm }}
      >
        {states.map(([key, params]) => {
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

// ─── Folder contents grid (sub-folders + direct parameter groups) ───────────

function FolderContentsGrid({
  folders,
  directGroups,
  levelColor,
  allParameters,
  onFolderSelect,
  onGroupSelect,
}: {
  folders: { segment: string; fullPath: string; paramCount: number; groupCount: number }[];
  directGroups: [string, ParameterLeaf[]][];
  levelColor: string;
  allParameters: Record<string, Parameter>;
  onFolderSelect: (fullPath: string) => void;
  onGroupSelect: (key: string) => void;
}) {
  const [page, setPage] = useState(1);
  const totalItems = folders.length + directGroups.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const allItems: ({ kind: 'folder' } & typeof folders[number] | { kind: 'group'; key: string; params: ParameterLeaf[] })[] = [
    ...folders.map(f => ({ kind: 'folder' as const, ...f })),
    ...directGroups.map(([key, params]) => ({ kind: 'group' as const, key, params })),
  ];
  const visible = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div
        className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
        style={{ gap: spacing.sm }}
      >
        {visible.map((item, i) => {
          if (item.kind === 'folder') {
            const label = getGroupLabel(item.fullPath, allParameters);
            const desc = getGroupDescription(item.fullPath, allParameters);
            return (
              <motion.button
                key={item.fullPath}
                onClick={() => onFolderSelect(item.fullPath)}
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
                    <div className="tw:flex tw:items-center" style={{ gap: spacing.xs }}>
                      <IconFolder size={14} stroke={1.5} style={{ color: levelColor, flexShrink: 0 }} />
                      <div style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                      }}>
                        {label}
                      </div>
                    </div>
                    {desc && (
                      <div className="tw:truncate" style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.secondary,
                        marginTop: spacing.xs,
                        paddingLeft: '18px',
                        maxWidth: '400px',
                      }}>
                        {desc}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: typography.fontWeight.semibold,
                    padding: `1px ${spacing.xs}`,
                    borderRadius: spacing.radius.sm,
                    backgroundColor: `${levelColor}15`,
                    color: levelColor,
                    flexShrink: 0,
                  }}>
                    {item.paramCount} params
                  </span>
                </div>
              </motion.button>
            );
          } else {
            const label = getGroupLabel(item.key, allParameters);
            const desc = getGroupDescription(item.key, allParameters);
            const isSingle = item.params.length === 1;
            return (
              <motion.button
                key={item.key}
                onClick={() => onGroupSelect(item.key)}
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
                    <div className="tw:truncate" style={{
                      fontSize: typography.fontSize.xs,
                      fontFamily: typography.fontFamily.mono,
                      color: colors.text.tertiary,
                      marginTop: '2px',
                    }}>
                      {item.key}
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
                      {item.params.length} values
                    </span>
                  )}
                </div>
              </motion.button>
            );
          }
        })}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// ─── Main explorer ───────────────────────────────────────────────────────────

export default function ParameterExplorer({ parameters, country }: ParameterExplorerProps) {
  const [search, setSearch] = useState('');
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selectedParam, setSelectedParam] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 200);
  const isSearching = !!debouncedSearch;

  // Only show leaf parameters (actual values), exclude nodes and abolitions
  const allParameters = useMemo(() => {
    return Object.values(parameters)
      .filter((p): p is ParameterLeaf => p.type === 'parameter' && !p.parameter.includes('.abolition'))
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

  // Root folder prefix: common prefix of all groups, auto-collapsed
  const rootFolderPrefix = useMemo(() => {
    if (parameterGroups.length === 0) return '';
    const prefix = commonPrefix(parameterGroups.map(([k]) => k));
    return autoCollapseFolder(parameterGroups, prefix);
  }, [parameterGroups]);

  // Current folder: last in stack, or root
  const currentFolder = folderStack.length > 0 ? folderStack[folderStack.length - 1] : rootFolderPrefix;

  // Folder contents at current level
  const folderContents = useMemo(() => {
    if (!activeSubGroup || !currentFolder) return { folders: [], directGroups: [] };
    return getFolderContents(parameterGroups, currentFolder);
  }, [parameterGroups, currentFolder, activeSubGroup]);

  // Parameters in active group
  const activeGroupParams = useMemo(() => {
    if (!activeGroup) return [];
    const entry = parameterGroups.find(([k]) => k === activeGroup);
    return entry ? entry[1] : [];
  }, [parameterGroups, activeGroup]);

  // Reset folder stack when sub-group changes
  useEffect(() => {
    setFolderStack([]);
    setActiveGroup(null);
    setSelectedParam(null);
  }, [activeSubGroup]);

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
    } else if (folderStack.length > 0) {
      setFolderStack((prev) => prev.slice(0, -1));
    } else if (activeSubGroup) {
      setActiveSubGroup(null);
      setSelectedParam(null);
    } else {
      setActiveLevel(null);
      setSelectedParam(null);
    }
  };

  const handleFolderSelect = (fullPath: string) => {
    const collapsed = autoCollapseFolder(parameterGroups, fullPath);
    setFolderStack((prev) => [...prev, collapsed]);
  };

  const handleGroupSelect = (key: string) => {
    const entry = parameterGroups.find(([k]) => k === key);
    if (entry && entry[1].length === 1) {
      setActiveGroup(key);
      setSelectedParam(entry[1][0].parameter);
    } else {
      setActiveGroup(key);
      setSelectedParam(null);
    }
  };

  // Breadcrumb: each entry has a label and navigation action
  const breadcrumbItems = useMemo(() => {
    const items: { label: string; onClick: () => void }[] = [];

    if (activeLevel) {
      items.push({
        label: LEVEL_CONFIG[activeLevel].label,
        onClick: () => { setActiveLevel(activeLevel); setActiveSubGroup(null); setFolderStack([]); setActiveGroup(null); setSelectedParam(null); },
      });
    }
    if (activeSubGroup && activeLevel) {
      items.push({
        label: getSubGroupLabel(activeSubGroup, activeLevel),
        onClick: () => { setFolderStack([]); setActiveGroup(null); setSelectedParam(null); },
      });
    }
    for (let i = 0; i < folderStack.length; i++) {
      const stackIndex = i;
      items.push({
        label: getGroupLabel(folderStack[i], parameters),
        onClick: () => { setFolderStack((prev) => prev.slice(0, stackIndex + 1)); setActiveGroup(null); setSelectedParam(null); },
      });
    }
    if (activeGroup) {
      items.push({
        label: getGroupLabel(activeGroup, parameters),
        onClick: () => {},
      });
    }
    return items;
  }, [activeLevel, activeSubGroup, folderStack, activeGroup, parameters]);

  // Current heading label
  const currentHeadingLabel = activeGroup
    ? getGroupLabel(activeGroup, parameters)
    : folderStack.length > 0
      ? getGroupLabel(currentFolder, parameters)
      : activeSubGroup && activeLevel
        ? getSubGroupLabel(activeSubGroup, activeLevel)
        : '';

  // Param count summary for folder view
  const currentFolderTotalParams = folderContents.folders.reduce((s, f) => s + f.paramCount, 0)
    + folderContents.directGroups.reduce((s, [, p]) => s + p.length, 0);
  const currentFolderTotalItems = folderContents.folders.length + folderContents.directGroups.length;

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
                onClick={() => { setActiveLevel(level); setActiveSubGroup(null); setActiveGroup(null); setFolderStack([]); }}
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
          <BreadcrumbNav items={breadcrumbItems} onBack={goBack} />

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

      {/* ─── View: Folder navigation (sub-group drill-in) ─── */}
      {!isSearching && activeLevel && activeSubGroup && !activeGroup && (
        <div>
          <BreadcrumbNav items={breadcrumbItems} onBack={goBack} />

          <div style={{ marginBottom: spacing.xl }}>
            <h2 style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: LEVEL_CONFIG[activeLevel].color,
              margin: 0,
            }}>
              {currentHeadingLabel}
            </h2>
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              {currentFolderTotalParams.toLocaleString()} parameters
              {currentFolderTotalItems > 1 && ` across ${currentFolderTotalItems} ${folderContents.folders.length > 0 ? 'programs' : 'groups'}`}
            </span>
          </div>

          <FolderContentsGrid
            folders={folderContents.folders}
            directGroups={folderContents.directGroups}
            levelColor={LEVEL_CONFIG[activeLevel].color}
            allParameters={parameters}
            onFolderSelect={handleFolderSelect}
            onGroupSelect={handleGroupSelect}
          />
        </div>
      )}

      {/* ─── View: Drilled into a parameter group (leaf list) ─── */}
      {!isSearching && activeLevel && activeSubGroup && activeGroup && (
        <div>
          <BreadcrumbNav items={breadcrumbItems} onBack={goBack} />

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
