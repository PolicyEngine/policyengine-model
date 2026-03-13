import { motion } from 'framer-motion';
import { IconExternalLink } from '@tabler/icons-react';
import type { Variable, Parameter } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';
import ComputationTree from './ComputationTree';

interface VariableDetailProps {
  variable: Variable;
  variables: Record<string, Variable>;
  parameters: Record<string, Parameter>;
  country: string;
  onViewFlowchart?: (varName: string) => void;
}

function formatUnit(unit: string | null, country: string): string {
  if (!unit) return 'none';
  if (unit === 'currency-USD') return 'USD ($)';
  if (unit === 'currency-GBP') return 'GBP (£)';
  if (unit === '/1') return 'ratio (0–1)';
  void country;
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

export default function VariableDetail({ variable, variables, parameters, country, onViewFlowchart }: VariableDetailProps) {
  const adds = Array.isArray(variable.adds) ? variable.adds : (variable.adds ? Object.keys(variable.adds) : []);
  const subtracts = Array.isArray(variable.subtracts) ? variable.subtracts : (variable.subtracts ? Object.keys(variable.subtracts) : []);
  const hasTree = adds.length > 0 || subtracts.length > 0;
  const githubRepo = country === 'uk' ? 'policyengine-uk' : 'policyengine-us';
  // moduleName is e.g. "gov.states.al.tax.income.al_agi"
  // maps to variables/gov/states/al/tax/income/al_agi.py
  const modulePath = variable.moduleName?.replace(/\./g, '/');

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
        {/* Documentation */}
        {variable.documentation && (
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              lineHeight: 1.6,
              marginTop: 0,
              marginBottom: spacing.lg,
            }}
          >
            {variable.documentation}
          </p>
        )}

        {/* Metadata */}
        <div style={{ marginBottom: spacing.lg }}>
          <MetaRow label="Entity" value={variable.entity} />
          <MetaRow label="Value type" value={variable.valueType} />
          <MetaRow label="Period" value={variable.definitionPeriod} />
          <MetaRow label="Unit" value={formatUnit(variable.unit, country)} />
          <MetaRow label="Default" value={String(variable.defaultValue ?? 'none')} />
          {variable.moduleName && <MetaRow label="Module" value={variable.moduleName} />}
        </div>

        {/* Enum possible values */}
        {variable.possibleValues && variable.possibleValues.length > 0 && (
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
              Possible values
            </h4>
            <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.xs }}>
              {variable.possibleValues.map((pv) => (
                <span
                  key={pv.value}
                  style={{
                    fontSize: '11px',
                    fontFamily: typography.fontFamily.mono,
                    padding: `2px ${spacing.sm}`,
                    borderRadius: spacing.radius.sm,
                    backgroundColor: colors.white,
                    border: `1px solid ${colors.border.light}`,
                    color: colors.text.secondary,
                  }}
                >
                  {pv.label || pv.value}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="tw:flex tw:flex-wrap" style={{ gap: spacing.md, marginBottom: hasTree ? spacing.lg : 0 }}>
          {variable.moduleName && (
            <a
              href={`https://github.com/PolicyEngine/${githubRepo}/blob/main/${githubRepo.replace('-', '_')}/variables/${modulePath}.py`}
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
          )}
          <button
            onClick={() => onViewFlowchart?.(variable.name)}
            className="tw:flex tw:items-center tw:cursor-pointer"
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.primary[600],
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: typography.fontFamily.primary,
              gap: spacing.xs,
            }}
          >
            View in flowchart ↓
          </button>
        </div>

        {/* Computation tree */}
        {hasTree && (
          <ComputationTree
            variableName={variable.name}
            variables={variables}
            parameters={parameters}
            country={country}
          />
        )}
      </div>
    </motion.div>
  );
}
