import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSearch, IconArrowLeft } from '@tabler/icons-react';
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
  onViewFlowchart?: (varName: string) => void;
}

type Level = 'federal' | 'state' | 'local' | 'territory' | 'household';

/** Categorize a variable by its moduleName prefix. */
function getLevel(v: Variable): Level {
  const m = v.moduleName;
  if (!m) return 'household';
  if (m.startsWith('gov.local')) return 'local';
  if (m.startsWith('gov.states')) return 'state';
  if (m.startsWith('gov.territories')) return 'territory';
  if (m.startsWith('contrib')) return 'household'; // filtered out upstream
  if (m.startsWith('household') || m.startsWith('input')) return 'household';
  if (m.startsWith('gov.')) return 'federal';
  return 'household';
}

/** Get a human-readable sub-group key for grouping within a level. */
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
    return `${parts[2].toUpperCase()}-${parts[3]}`;
  }
  if (m.startsWith('gov.territories.') && parts.length >= 3) {
    return parts[2].toUpperCase();
  }
  if (m.startsWith('gov.')) {
    return parts[1];
  }
  if (m.startsWith('contrib.')) {
    return parts[1];
  }
  if (m.startsWith('household.')) {
    return parts[1];
  }
  return 'Other';
}

/** Get a display label for a sub-group key. */
function getSubGroupLabel(key: string, level: Level): string {
  if (level === 'federal') {
    const agencyNames: Record<string, string> = {
      irs: 'Internal Revenue Service (IRS)', hhs: 'Health & Human Services (HHS)',
      usda: 'USDA', ssa: 'Social Security Administration (SSA)',
      hud: 'Housing & Urban Development (HUD)', ed: 'Dept. of Education',
      aca: 'Affordable Care Act (ACA)', doe: 'Dept. of Energy',
      fcc: 'Federal Communications Commission (FCC)', puf: 'IRS Public Use File',
      simulation: 'Simulation',
    };
    return agencyNames[key] || key.toUpperCase();
  }
  if (level === 'state') {
    const stateNames: Record<string, string> = {
      AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
      CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',
      HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',
      LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',
      MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
      NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
      OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
      SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
      WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
    };
    if (key === 'Cross-state') return 'Cross-state';
    return stateNames[key] || key;
  }
  if (level === 'local') {
    const [state, locality] = key.split('-');
    const localityNames: Record<string, string> = {
      la: 'Los Angeles', riv: 'Riverside', nyc: 'New York City',
      ala: 'Alameda', sf: 'San Francisco', denver: 'Denver',
      harris: 'Harris County', montgomery: 'Montgomery County',
      multnomah_county: 'Multnomah County', tax: 'Local taxes',
    };
    return `${localityNames[locality] || locality} (${state})`;
  }
  if (level === 'territory') {
    const codes: Record<string, string> = { PR: 'Puerto Rico', GU: 'Guam', VI: 'US Virgin Islands' };
    return codes[key] || key;
  }
  if (level === 'household') {
    const names: Record<string, string> = {
      demographic: 'Demographics', income: 'Income', expense: 'Expenses',
      assets: 'Assets', marginal_tax_rate: 'Marginal tax rates', cliff: 'Cliff analysis',
    };
    return names[key] || key;
  }
  return key;
}

/** Description for federal agency sub-groups. */
function getSubGroupDescription(key: string, level: Level): string | null {
  if (level === 'federal') {
    const desc: Record<string, string> = {
      irs: 'Income tax, credits, deductions, and filing rules',
      hhs: 'Medicaid, CHIP, ACA subsidies, and poverty guidelines',
      usda: 'SNAP, school meals, WIC, and CSFP',
      ssa: 'Social Security benefits and payroll taxes',
      hud: 'Housing assistance and rental subsidies',
      ed: 'Pell grants and student aid',
      aca: 'Marketplace eligibility and premium subsidies',
      doe: 'Energy efficiency rebates and credits',
      fcc: 'Affordable Connectivity Program',
    };
    return desc[key] || null;
  }
  if (level === 'household') {
    const desc: Record<string, string> = {
      demographic: 'Age, marital status, disability, and household composition',
      income: 'Employment, self-employment, investment, and other income sources',
      expense: 'Childcare, medical, housing, and other deductible expenses',
      assets: 'Savings, property, and other asset holdings',
      marginal_tax_rate: 'Effective marginal rates on additional income',
      cliff: 'Benefit cliffs from income changes',
    };
    return desc[key] || null;
  }
  return null;
}

const LEVEL_CONFIG: Record<Level, { label: string; description: string; color: string; order: number }> = {
  federal:   { label: 'Federal',          description: 'IRS, HHS, USDA, SSA, HUD, and other federal agencies',            color: '#1D4ED8', order: 0 },
  state:     { label: 'State',            description: 'State-level tax and benefit programs across all 50 states + DC',   color: '#7C3AED', order: 1 },
  local:     { label: 'Local',            description: 'City and county programs',                                          color: '#059669', order: 2 },
  territory: { label: 'Territories',      description: 'Puerto Rico and other US territories',                              color: '#0891B2', order: 3 },
  household: { label: 'Household inputs', description: 'Demographics, income, expenses, and geographic inputs',             color: '#6B7280', order: 5 },
};

const LEVELS_ORDERED: Level[] = ['federal', 'state', 'local', 'territory', 'household'];

// ─── Variable list (shown after selecting a sub-group) ──────────────────────

function VariableList({
  vars,
  allVariables,
  parameters,
  country,
  selectedVar,
  onSelect,
  onViewFlowchart,
}: {
  vars: Variable[];
  allVariables: Record<string, Variable>;
  parameters: Record<string, Parameter>;
  country: string;
  selectedVar: string | null;
  onSelect: (name: string) => void;
  onViewFlowchart?: (varName: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? vars : vars.slice(0, PAGE_SIZE);

  return (
    <div>
      <div className="tw:flex tw:flex-col" style={{ gap: spacing.sm }}>
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
                  variables={allVariables}
                  parameters={parameters}
                  country={country}
                  onViewFlowchart={onViewFlowchart}
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
          Show all {vars.length}
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
  subGroups: [string, Variable[]][];
  levelColor: string;
  onSelect: (key: string) => void;
}) {
  // Separate Cross-state from actual states
  const states = subGroups.filter(([k]) => k !== 'Cross-state' && k.length === 2);
  const other = subGroups.filter(([k]) => k === 'Cross-state' || k.length !== 2);
  const maxCount = Math.max(...states.map(([, v]) => v.length), 1);

  return (
    <div>
      <div
        className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(64px,1fr))]"
        style={{ gap: spacing.sm }}
      >
        {states.map(([key, vars]) => {
          const intensity = Math.max(0.15, vars.length / maxCount);
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
                {vars.length}
              </div>
            </motion.button>
          );
        })}
      </div>
      {other.length > 0 && (
        <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {other.map(([key, vars]) => (
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
              {getSubGroupLabel(key, 'state')} ({vars.length})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-group card grid (for federal, local, household, territory) ──────────

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
    <div
      className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]"
      style={{ gap: spacing.md }}
    >
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
              {vars.length}
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

// ─── Main explorer ───────────────────────────────────────────────────────────

export default function VariableExplorer({ variables, parameters, country, onViewFlowchart }: VariableExplorerProps) {
  const [search, setSearch] = useState('');
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(search, 200);
  const isSearching = !!debouncedSearch;

  // All variables (hidden_input + contrib excluded), sorted
  const allVariables = useMemo(() => {
    return Object.values(variables)
      .filter((v) => !v.hidden_input && !v.moduleName?.startsWith('contrib'))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [variables]);

  // Count per level
  const levelCounts = useMemo(() => {
    const counts: Record<Level, number> = { federal: 0, state: 0, local: 0, territory: 0, household: 0 };
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

  // Navigation helpers
  const goBack = () => {
    if (activeSubGroup) {
      setActiveSubGroup(null);
      setSelectedVar(null);
    } else {
      setActiveLevel(null);
      setSelectedVar(null);
    }
  };

  const breadcrumb = activeLevel
    ? activeSubGroup
      ? `${LEVEL_CONFIG[activeLevel].label} / ${getSubGroupLabel(activeSubGroup, activeLevel)}`
      : LEVEL_CONFIG[activeLevel].label
    : null;

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
                onClick={() => { setActiveLevel(level); setActiveSubGroup(null); }}
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
              {filtered.length.toLocaleString()} variables across {subGroups.length} groups
            </span>
          </div>

          {/* State level: tile grid */}
          {activeLevel === 'state' && (
            <StateTileGrid
              subGroups={subGroups}
              levelColor={LEVEL_CONFIG[activeLevel].color}
              onSelect={setActiveSubGroup}
            />
          )}

          {/* Other levels: card grid */}
          {activeLevel !== 'state' && (
            <SubGroupCardGrid
              subGroups={subGroups}
              level={activeLevel}
              levelColor={LEVEL_CONFIG[activeLevel].color}
              onSelect={setActiveSubGroup}
            />
          )}
        </div>
      )}

      {/* ─── View: Drilled into a sub-group (variable list) ─── */}
      {!isSearching && activeLevel && activeSubGroup && (
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
              {getSubGroupLabel(activeSubGroup, activeLevel)}
            </h2>
            <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              {subGroupVars.length} variables
            </span>
          </div>

          <VariableList
            vars={subGroupVars}
            allVariables={variables}
            parameters={parameters}
            country={country}
            selectedVar={selectedVar}
            onSelect={handleSelect}
            onViewFlowchart={onViewFlowchart}
          />
        </div>
      )}
    </div>
  );
}
