import { colors, typography, spacing } from '../../designTokens';
import { IconSearch } from '@tabler/icons-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export default function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: spacing['3xl'],
        maxWidth: '400px',
      }}
    >
      <IconSearch
        size={18}
        stroke={1.5}
        style={{
          position: 'absolute',
          left: spacing.md,
          top: '50%',
          transform: 'translateY(-50%)',
          color: colors.text.tertiary,
        }}
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: `${spacing.sm} ${spacing.lg} ${spacing.sm} ${spacing['3xl']}`,
          borderRadius: spacing.radius.lg,
          border: `1px solid ${colors.border.light}`,
          fontSize: typography.fontSize.sm,
          fontFamily: typography.fontFamily.primary,
          outline: 'none',
        }}
      />
    </div>
  );
}
