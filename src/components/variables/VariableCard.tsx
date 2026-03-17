import type { Variable } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';

interface VariableCardProps {
  variable: Variable;
  isSelected: boolean;
  onClick: () => void;
}

const entityColors: Record<string, string> = {
  person: '#2C7A7B',
  tax_unit: '#2C7A7B',
  spm_unit: '#2C7A7B',
  household: '#2C7A7B',
  family: '#2C7A7B',
  marital_unit: '#2C7A7B',
  benunit: '#2C7A7B',
};

export const entityLabels: Record<string, string> = {
  person: 'Person',
  tax_unit: 'Tax Unit',
  spm_unit: 'SPM Unit',
  household: 'Household',
  family: 'Family',
  marital_unit: 'Marital Unit',
  benunit: 'Benefit Unit',
};

export default function VariableCard({ variable, isSelected, onClick }: VariableCardProps) {
  const entityColor = entityColors[variable.entity] || colors.gray[500];

  return (
    <button
      onClick={onClick}
      className="tw:w-full tw:text-left tw:cursor-pointer"
      style={{
        padding: `${spacing.md} ${spacing.lg}`,
        borderRadius: spacing.radius.lg,
        border: `1px solid ${isSelected ? colors.primary[400] : colors.border.light}`,
        backgroundColor: isSelected ? colors.primary[50] : colors.white,
        fontFamily: typography.fontFamily.primary,
        transition: 'all 0.15s ease',
        display: 'block',
      }}
    >
      <div className="tw:flex tw:items-start tw:justify-between" style={{ gap: spacing.md }}>
        <div className="tw:flex-1 tw:min-w-0">
          <div
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            {variable.label}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              fontFamily: typography.fontFamily.mono,
              color: colors.text.tertiary,
              marginTop: '2px',
            }}
          >
            {variable.name}
          </div>
          {variable.documentation && (
            <div
              className="tw:truncate"
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.text.secondary,
                marginTop: spacing.xs,
                maxWidth: '500px',
              }}
            >
              {variable.documentation}
            </div>
          )}
        </div>
        <div className="tw:flex tw:items-center tw:flex-shrink-0" style={{ gap: spacing.xs }}>
          {/* Entity badge */}
          <span
            style={{
              fontSize: '10px',
              fontWeight: typography.fontWeight.semibold,
              padding: `1px ${spacing.xs}`,
              borderRadius: spacing.radius.sm,
              backgroundColor: `${entityColor}15`,
              color: entityColor,
            }}
          >
            {entityLabels[variable.entity] || variable.entity}
          </span>
          {/* Input/Computed badge */}
          <span
            title={variable.isInputVariable
              ? 'User-provided value (e.g. age, income, filing status)'
              : 'Calculated from inputs and other variables via formulas'}
            style={{
              fontSize: '10px',
              fontWeight: typography.fontWeight.semibold,
              padding: `1px ${spacing.xs}`,
              borderRadius: spacing.radius.sm,
              backgroundColor: variable.isInputVariable ? colors.primary[50] : colors.gray[100],
              color: variable.isInputVariable ? colors.primary[700] : colors.gray[600],
            }}
          >
            {variable.isInputVariable ? 'input' : 'computed'}
          </span>
          {/* Value type */}
          <span
            style={{
              fontSize: '10px',
              padding: `1px ${spacing.xs}`,
              borderRadius: spacing.radius.sm,
              backgroundColor: colors.gray[100],
              color: colors.gray[600],
              fontFamily: typography.fontFamily.mono,
            }}
          >
            {variable.valueType}
          </span>
        </div>
      </div>
    </button>
  );
}
