import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconPlus, IconMinus, IconChevronRight, IconChevronDown } from '@tabler/icons-react';
import type { Variable, Parameter } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';

const MAX_DEPTH = 5;

/** Normalize adds/subtracts which may be an array, object, or null. */
function toArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return Object.keys(val);
  return [];
}

interface ComputationTreeProps {
  variableName: string;
  variables: Record<string, Variable>;
  parameters: Record<string, Parameter>;
  country: string;
  depth?: number;
  visited?: Set<string>;
}

interface TreeNodeProps {
  varName: string;
  variables: Record<string, Variable>;
  parameters: Record<string, Parameter>;
  country: string;
  depth: number;
  visited: Set<string>;
  sign: '+' | '-';
}

function TreeNode({
  varName,
  variables,
  parameters,
  country,
  depth,
  visited,
  sign,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const variable = variables[varName];

  if (!variable) {
    return (
      <div
        className="tw:flex tw:items-center"
        style={{ gap: spacing.sm, padding: `${spacing.xs} 0` }}
      >
        <span
          style={{
            fontSize: typography.fontSize.xs,
            fontFamily: typography.fontFamily.mono,
            color: colors.text.tertiary,
          }}
        >
          {varName}
        </span>
        <span style={{ fontSize: '10px', color: colors.text.tertiary }}>(not found)</span>
      </div>
    );
  }

  const adds = toArray(variable.adds);
  const subtracts = toArray(variable.subtracts);
  const hasChildren = adds.length > 0 || subtracts.length > 0;
  const isCircular = visited.has(varName);
  const atMaxDepth = depth >= MAX_DEPTH;

  return (
    <div style={{ paddingLeft: depth > 0 ? spacing.lg : 0 }}>
      <button
        onClick={() => hasChildren && !isCircular && !atMaxDepth && setExpanded(!expanded)}
        className="tw:flex tw:items-center tw:w-full tw:text-left"
        style={{
          gap: spacing.sm,
          padding: `${spacing.xs} ${spacing.sm}`,
          borderRadius: spacing.radius.md,
          border: 'none',
          backgroundColor: expanded ? colors.primary[50] : 'transparent',
          cursor: hasChildren && !isCircular && !atMaxDepth ? 'pointer' : 'default',
          fontFamily: typography.fontFamily.primary,
          transition: 'background-color 0.15s ease',
        }}
      >
        {/* Sign indicator */}
        <span
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: sign === '+' ? colors.primary[50] : '#FEF2F2',
            color: sign === '+' ? colors.primary[600] : colors.error,
            fontSize: '11px',
            fontWeight: typography.fontWeight.bold,
            flexShrink: 0,
          }}
        >
          {sign === '+' ? <IconPlus size={10} stroke={2.5} /> : <IconMinus size={10} stroke={2.5} />}
        </span>

        {/* Expand chevron */}
        {hasChildren && !isCircular && !atMaxDepth ? (
          expanded ? (
            <IconChevronDown size={14} stroke={1.5} style={{ color: colors.text.tertiary, flexShrink: 0 }} />
          ) : (
            <IconChevronRight size={14} stroke={1.5} style={{ color: colors.text.tertiary, flexShrink: 0 }} />
          )
        ) : (
          <span style={{ width: '14px', flexShrink: 0 }} />
        )}

        {/* Variable info */}
        <span
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.primary,
          }}
        >
          {variable.label}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontFamily: typography.fontFamily.mono,
            color: colors.text.tertiary,
          }}
        >
          {varName}
        </span>

        {/* Badges */}
        {variable.isInputVariable && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: typography.fontWeight.semibold,
              padding: `1px ${spacing.xs}`,
              borderRadius: spacing.radius.sm,
              backgroundColor: colors.primary[50],
              color: colors.primary[700],
            }}
          >
            input
          </span>
        )}
        {isCircular && (
          <span
            style={{
              fontSize: '10px',
              color: colors.warning,
              fontStyle: 'italic',
            }}
          >
            (circular)
          </span>
        )}
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
            {adds.map((child) => (
              <TreeNode
                key={`add-${child}`}
                varName={child}
                variables={variables}
                parameters={parameters}
                country={country}
                depth={depth + 1}
                visited={new Set([...visited, varName])}
                sign="+"
              />
            ))}
            {subtracts.map((child) => (
              <TreeNode
                key={`sub-${child}`}
                varName={child}
                variables={variables}
                parameters={parameters}
                country={country}
                depth={depth + 1}
                visited={new Set([...visited, varName])}
                sign="-"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {atMaxDepth && hasChildren && !isCircular && (
        <a
          href={`https://policyengine.github.io/flowchart/?variable=${varName}&country=${country.toUpperCase()}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.primary[600],
            textDecoration: 'none',
            paddingLeft: `calc(${spacing.lg} + 30px)`,
            display: 'block',
            marginTop: spacing.xs,
          }}
        >
          View full tree in flowchart →
        </a>
      )}
    </div>
  );
}

export default function ComputationTree({
  variableName,
  variables,
  parameters,
  country,
  depth = 0,
  visited = new Set<string>(),
}: ComputationTreeProps) {
  const variable = variables[variableName];
  if (!variable) return null;

  const adds = toArray(variable.adds);
  const subtracts = toArray(variable.subtracts);

  if (adds.length === 0 && subtracts.length === 0) return null;

  const nextVisited = new Set([...visited, variableName]);

  return (
    <div style={{ marginTop: spacing.lg }}>
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
        Computation tree
      </h4>
      <div
        style={{
          padding: spacing.md,
          borderRadius: spacing.radius.lg,
          border: `1px solid ${colors.border.light}`,
          backgroundColor: colors.white,
        }}
      >
        {adds.map((child) => (
          <TreeNode
            key={`add-${child}`}
            varName={child}
            variables={variables}
            parameters={parameters}
            country={country}
            depth={depth}
            visited={nextVisited}
            sign="+"
          />
        ))}
        {subtracts.map((child) => (
          <TreeNode
            key={`sub-${child}`}
            varName={child}
            variables={variables}
            parameters={parameters}
            country={country}
            depth={depth}
            visited={nextVisited}
            sign="-"
          />
        ))}
      </div>
    </div>
  );
}
