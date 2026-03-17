import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IconExternalLink, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { Parameter, ParameterLeaf } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';

interface ParameterDetailProps {
  parameter: Parameter;
  country: string;
}

function formatUnit(unit: string | null): string {
  if (!unit) return 'none';
  if (unit === 'currency-USD' || unit === 'currency_USD' || unit === 'USD') return 'USD ($)';
  if (unit === 'currency-GBP' || unit === 'currency_GBP' || unit === 'GBP') return 'GBP (£)';
  if (unit === '/1') return 'ratio (0–1)';
  if (unit === 'bool') return 'boolean';
  if (unit === 'int' || unit === 'float') return 'number';
  return unit;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="tw:flex" style={{ gap: spacing.md, padding: `${spacing.xs} 0` }}>
      <span
        style={{
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.secondary,
          minWidth: '120px',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.primary,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function formatValue(val: number | string | boolean | string[], unit: string | null): { text: string; items: string[] | null } {
  // Handle arrays (list-type parameters)
  if (Array.isArray(val)) {
    if (val.length === 0) return { text: '(empty)', items: [] };
    return { text: val.join(', '), items: val };
  }
  if (typeof val === 'boolean') return { text: val ? 'true' : 'false', items: null };
  if (typeof val === 'number') {
    if (unit === '/1') { const pct = val * 100; return { text: `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(2)}%`, items: null }; }
    if (unit?.startsWith('currency-') || unit?.startsWith('currency_') || unit === 'USD' || unit === 'GBP') return { text: val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), items: null };
    return { text: val.toLocaleString(), items: null };
  }
  const str = String(val);
  if (str.includes(',')) {
    const items = str.split(',').map(s => s.trim()).filter(Boolean);
    return { text: str, items };
  }
  return { text: str, items: null };
}

const CURRENT_YEAR = new Date().getFullYear();

function ValueRow({ date, val, nextDate, unit, isProjected }: {
  date: string;
  val: number | string | boolean | string[];
  nextDate: string | null;
  unit: string | null;
  isProjected: boolean;
  isLast?: boolean;
}) {
  const { text, items } = formatValue(val, unit);
  const dateLabel = nextDate ? `${date} → ${nextDate}` : `${date} → present`;

  return (
    <div style={{ padding: `${spacing.sm} ${spacing.sm}` }}>
      <div className="tw:flex tw:items-center tw:justify-between" style={{ marginBottom: items ? spacing.sm : 0 }}>
        <span
          style={{
            fontSize: typography.fontSize.xs,
            fontFamily: typography.fontFamily.mono,
            color: isProjected ? colors.text.tertiary : colors.text.secondary,
            fontStyle: isProjected ? 'italic' : 'normal',
          }}
        >
          {dateLabel}
        </span>
        {!items && (
          <span
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: isProjected ? colors.text.secondary : colors.text.primary,
              fontFamily: typography.fontFamily.mono,
            }}
          >
            {text}
          </span>
        )}
        {items && (
          <span style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
            {items.length} items
          </span>
        )}
      </div>
      {items && (
        <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.xs }}>
          {items.map((item) => (
            <span
              key={item}
              style={{
                fontSize: '11px',
                fontFamily: typography.fontFamily.mono,
                padding: `1px ${spacing.sm}`,
                borderRadius: spacing.radius.sm,
                backgroundColor: colors.gray[100],
                border: `1px solid ${colors.border.light}`,
                color: colors.text.secondary,
              }}
            >
              {item.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ValueTimeline({ param }: { param: ParameterLeaf }) {
  const rawEntries = Object.entries(param.values).sort(([a], [b]) => a.localeCompare(b));
  if (rawEntries.length === 0) return null;

  // Merge consecutive entries with identical values
  const allEntries: [string, number | string | boolean | string[]][] = [];
  for (const [date, val] of rawEntries) {
    if (allEntries.length > 0) {
      const prevVal = allEntries[allEntries.length - 1][1];
      if (JSON.stringify(prevVal) === JSON.stringify(val)) continue;
    }
    allEntries.push([date, val]);
  }

  // Find where uprated projections begin. Only applies to parameters that
  // extend to 2100. Within future entries (post current year), find where
  // a consecutive yearly run of 5+ starts — that's where uprating takes over.
  // Everything before that is explicitly legislated.
  const projectionStart = (() => {
    const lastDate = rawEntries.length > 0 ? rawEntries[rawEntries.length - 1][0] : '';
    if (lastDate < '2100') return null; // Not uprated

    // Use raw (un-merged) entries to detect the yearly pattern
    const futureRaw = rawEntries.filter(([d]) => parseInt(d) > CURRENT_YEAR);
    if (futureRaw.length < 5) return null;

    const years = futureRaw.map(([d]) => parseInt(d));
    for (let i = 0; i < years.length; i++) {
      let consecutive = 1;
      for (let j = i + 1; j < years.length; j++) {
        if (years[j] - years[j - 1] === 1) consecutive++;
        else break;
      }
      if (consecutive >= 5) return futureRaw[i][0];
    }
    return null;
  })();

  const legislated = projectionStart
    ? allEntries.filter(([d]) => d < projectionStart)
    : allEntries;
  const projected = projectionStart
    ? allEntries.filter(([d]) => d >= projectionStart)
    : [];
  const hasProjected = projected.length > 1;

  const [showProjected, setShowProjected] = useState(false);

  return (
    <div style={{ marginBottom: spacing.lg }}>
      <h4
        style={{
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: spacing.sm,
        }}
      >
        Value history
      </h4>
      <div
        style={{
          padding: spacing.md,
          borderRadius: spacing.radius.lg,
          border: `1px solid ${colors.border.light}`,
          backgroundColor: colors.white,
        }}
      >
        {/* Legislated values */}
        {legislated.map(([date, val], i) => {
          const nextDate = i < legislated.length - 1
            ? legislated[i + 1][0]
            : projected.length > 0 ? projected[0][0] : null;
          return (
            <div key={date} style={{ borderBottom: `1px solid ${colors.border.light}` }}>
              <ValueRow date={date} val={val} nextDate={nextDate} unit={param.unit} isProjected={false} />
            </div>
          );
        })}

        {/* Projected values section */}
        {hasProjected && (
          <>
            <button
              onClick={() => setShowProjected(!showProjected)}
              className="tw:flex tw:items-center tw:w-full tw:cursor-pointer"
              style={{
                gap: spacing.xs,
                padding: `${spacing.sm} ${spacing.sm}`,
                border: 'none',
                backgroundColor: 'transparent',
                fontFamily: typography.fontFamily.primary,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                color: colors.primary[600],
                borderBottom: showProjected ? `1px solid ${colors.border.light}` : 'none',
              }}
            >
              {showProjected
                ? <IconChevronDown size={14} stroke={1.5} />
                : <IconChevronRight size={14} stroke={1.5} />
              }
              Projected values ({projected.length} years, uprated)
            </button>
            {showProjected && projected.map(([date, val], i) => {
              const nextDate = i < projected.length - 1 ? projected[i + 1][0] : null;
              return (
                <div key={date} style={{ borderBottom: i < projected.length - 1 ? `1px solid ${colors.border.light}` : 'none' }}>
                  <ValueRow date={date} val={val} nextDate={nextDate} unit={param.unit} isProjected={true} />
                </div>
              );
            })}
          </>
        )}

        {/* Single projected entry (no collapse needed) */}
        {projected.length === 1 && (
          <div key={projected[0][0]}>
            <ValueRow date={projected[0][0]} val={projected[0][1]} nextDate={null} unit={param.unit} isProjected={false} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Parameter tree cache (loaded once per country) ──────────────────────────

const treeCache = new Map<string, Set<string> | null>();

async function loadParamTree(country: string): Promise<Set<string> | null> {
  if (treeCache.has(country)) return treeCache.get(country)!;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}param-tree-${country}.json`);
    if (!res.ok) throw new Error('not found');
    const paths: string[] = await res.json();
    const set = new Set(paths);
    treeCache.set(country, set);
    return set;
  } catch {
    treeCache.set(country, null);
    return null;
  }
}

/**
 * Find the exact YAML file for a parameter path by trying progressively
 * shorter path prefixes against the pre-built file tree.
 */
function findYamlFile(paramPath: string, yamlFiles: Set<string>): string | null {
  const parts = paramPath.replace(/\./g, '/').split('/');
  for (let i = parts.length; i > 0; i--) {
    const candidate = parts.slice(0, i).join('/') + '.yaml';
    if (yamlFiles.has(candidate)) return candidate;
  }
  return null;
}

function getGitHubUrl(paramPath: string, githubRepo: string, yamlFile: string | null): string {
  const repoDir = githubRepo.replace('-', '_');
  if (yamlFile) {
    return `https://github.com/PolicyEngine/${githubRepo}/blob/main/${repoDir}/parameters/${yamlFile}`;
  }
  // Fallback: link to parent directory
  const parts = paramPath.split('.');
  while (parts.length > 1 && (/^[A-Z_]+$/.test(parts[parts.length - 1]) || /^\d+$/.test(parts[parts.length - 1]))) {
    parts.pop();
  }
  const dirParts = parts.slice(0, Math.max(parts.length - 2, 1));
  return `https://github.com/PolicyEngine/${githubRepo}/tree/main/${repoDir}/parameters/${dirParts.join('/')}`;
}

export default function ParameterDetail({ parameter: param, country }: ParameterDetailProps) {
  const isLeaf = param.type === 'parameter';
  const githubRepo = country === 'uk' ? 'policyengine-uk' : 'policyengine-us';

  const [yamlFile, setYamlFile] = useState<string | null>(null);
  const [treeLoaded, setTreeLoaded] = useState(false);

  useEffect(() => {
    loadParamTree(country).then((tree) => {
      if (tree) {
        setYamlFile(findYamlFile(param.parameter, tree));
      }
      setTreeLoaded(true);
    });
  }, [country, param.parameter]);

  const sourceUrl = treeLoaded ? getGitHubUrl(param.parameter, githubRepo, yamlFile) : '#';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      style={{ overflow: 'hidden' }}
    >
      <div
        style={{
          padding: spacing.xl,
          borderRadius: spacing.radius.lg,
          border: `1px solid ${colors.border.light}`,
          backgroundColor: colors.background.secondary,
          marginTop: spacing.sm,
        }}
      >
        {/* Description */}
        {param.description && (
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: 1.6,
              marginTop: 0,
              marginBottom: spacing.lg,
            }}
          >
            {param.description}
          </p>
        )}

        {/* Metadata */}
        <div style={{ marginBottom: spacing.lg }}>
          <MetaRow label="Path" value={param.parameter} />
          <MetaRow label="Type" value={isLeaf ? 'Parameter (leaf)' : 'Parameter group (node)'} />
          {isLeaf && <MetaRow label="Unit" value={formatUnit((param as ParameterLeaf).unit)} />}
          {isLeaf && (param as ParameterLeaf).period && (
            <MetaRow label="Period" value={(param as ParameterLeaf).period!} />
          )}
        </div>

        {/* Value history */}
        {isLeaf && <ValueTimeline param={param as ParameterLeaf} />}

        {/* Links */}
        <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.md }}>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tw:flex tw:items-center"
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.primary[600],
              textDecoration: 'none',
              gap: spacing.xs,
            }}
          >
            View source <IconExternalLink size={12} stroke={1.5} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
