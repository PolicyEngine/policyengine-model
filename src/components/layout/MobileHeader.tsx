import { colors } from '../../designTokens';
import { IconMenu2, IconX } from '@tabler/icons-react';

interface MobileHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function MobileHeader({ isOpen, onToggle }: MobileHeaderProps) {
  return (
    <header
      className="tw:sticky tw:top-0 tw:z-[100] tw:bg-white tw:flex tw:items-center tw:gap-3 tw:px-5 tw:py-3"
      style={{ borderBottom: `1px solid ${colors.border.light}` }}
    >
      <button
        onClick={onToggle}
        className="tw:border-none tw:bg-transparent tw:cursor-pointer tw:p-1 tw:flex tw:items-center"
        style={{ color: colors.text.primary }}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <IconX size={24} stroke={1.5} /> : <IconMenu2 size={24} stroke={1.5} />}
      </button>
      <div className="tw:flex tw:items-center tw:gap-2">
        <img
          src="https://policyengine.org/assets/logos/policyengine/teal-square.svg"
          alt="PolicyEngine"
          className="tw:h-6 tw:w-6"
        />
        <span className="tw:text-base tw:font-bold" style={{ color: colors.primary[900] }}>
          Model
        </span>
      </div>
    </header>
  );
}
