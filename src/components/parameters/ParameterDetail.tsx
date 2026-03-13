import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IconExternalLink } from '@tabler/icons-react';
import type { Parameter, ParameterLeaf } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';

interface ParameterDetailProps {
  parameter: Parameter;
  country: string;
}

function formatUnit(unit: string | null): string {
  if (!unit) return 'none';
  if (unit === 'currency-USD') return 'USD ($)';
  if (unit === 'currency-GBP') return 'GBP (£)';
  if (unit === '/1') return 'ratio (0–1)';
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

function formatValue(val: number | string | boolean, unit: string | null): string {
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') {
    if (unit === '/1') return `${(val * 100).toFixed(2)}%`;
    if (unit?.startsWith('currency-')) return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toLocaleString();
  }
  return String(val);
}

function ValueTimeline({ param }: { param: ParameterLeaf }) {
  const entries = Object.entries(param.values).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return null;

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
        {entries.map(([date, val], i) => (
          <div
            key={date}
            className="tw:flex tw:items-center tw:justify-between"
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              borderBottom: i < entries.length - 1 ? `1px solid ${colors.border.light}` : 'none',
            }}
          >
            <span
              style={{
                fontSize: typography.fontSize.xs,
                fontFamily: typography.fontFamily.mono,
                color: colors.text.tertiary,
              }}
            >
              {date}
            </span>
            <span
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.primary,
                fontFamily: typography.fontFamily.mono,
              }}
            >
              {formatValue(val, param.unit)}
            </span>
          </div>
        ))}
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
