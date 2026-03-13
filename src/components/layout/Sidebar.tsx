import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { colors, typography, spacing } from '../../designTokens';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { Country } from '../../hooks/useCountry';

interface NavItem {
  path: string;
  label: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Overview' },
  {
    path: '/rules',
    label: 'Rules',
    children: [
      { path: '/rules/coverage', label: 'Coverage tracker' },
      { path: '/rules/parameters', label: 'Parameters' },
      { path: '/rules/variables', label: 'Variables' },
    ],
  },
  {
    path: '/data',
    label: 'Data',
    children: [
      { path: '/data/pipeline', label: 'Pipeline' },
      { path: '/data/calibration', label: 'Calibration' },
      { path: '/data/validation', label: 'Validation' },
    ],
  },
  { path: '/behavioral', label: 'Behavioral responses' },
];

function isChildActive(item: NavItem, currentPath: string): boolean {
  if (item.path === currentPath) return true;
  return item.children?.some((c) => c.path === currentPath) ?? false;
}

interface SidebarProps {
  country: Country;
  onClose?: () => void;
}

export default function Sidebar({ country, onClose }: SidebarProps) {
  const currentPath = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const href = (path: string) => search ? `${path}?${search}` : path;

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of navItems) {
      if (item.children?.some((c) => c.path === currentPath)) {
        initial[item.path] = true;
      }
    }
    return initial;
  });

  const behavioralLabel =
    country === 'uk' ? 'Behavioural responses' : 'Behavioral responses';

  const navLinkStyle = (active: boolean, isLeaf: boolean) => ({
    padding: `${spacing.sm} ${spacing['2xl']}`,
    backgroundColor: isLeaf && active ? colors.primary[50] : 'transparent',
    color: active ? colors.primary[700] : colors.text.secondary,
    fontWeight: active ? 600 : 500,
    fontFamily: typography.fontFamily.primary,
    borderLeft: isLeaf && active
      ? `3px solid ${colors.primary[500]}`
      : '3px solid transparent',
  });

  return (
    <nav
      className="tw:w-64 tw:min-w-64 tw:sticky tw:top-[58px] tw:h-[calc(100vh-58px)] tw:bg-white tw:flex tw:flex-col tw:z-50 tw:overflow-y-auto tw:shrink-0"
      style={{ borderRight: `1px solid ${colors.border.light}` }}
    >
      {/* Logo */}
      <a
        href="https://policyengine.org"
        className="tw:flex tw:items-center tw:gap-3 tw:px-6 tw:py-5 tw:no-underline"
        style={{ borderBottom: `1px solid ${colors.border.light}` }}
      >
        <img
          src="https://policyengine.org/assets/logos/policyengine/teal-square.svg"
          alt="PolicyEngine"
          className="tw:h-7 tw:w-7"
        />
        <span className="tw:text-lg tw:font-bold" style={{ color: colors.primary[900] }}>
          Model
        </span>
      </a>

      {/* Nav items */}
      <div className="tw:py-4 tw:flex-1">
        {navItems.map((item) => {
          const isActive = isChildActive(item, currentPath);
          const isExpanded = expanded[item.path] ?? false;
          const label = item.path === '/behavioral' ? behavioralLabel : item.label;

          if (item.children) {
            return (
              <div key={item.path}>
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [item.path]: !prev[item.path] }))}
                  className="tw:w-full tw:flex tw:items-center tw:justify-between tw:border-none tw:cursor-pointer tw:text-left tw:text-sm tw:transition-all tw:duration-150 tw:ease-in-out"
                  style={navLinkStyle(isActive, false)}
                >
                  <span>{label}</span>
                  {isExpanded ? (
                    <IconChevronDown size={16} stroke={1.5} />
                  ) : (
                    <IconChevronRight size={16} stroke={1.5} />
                  )}
                </button>
                {isExpanded &&
                  item.children.map((child) => {
                    const childActive = child.path === currentPath;
                    return (
                      <Link
                        key={child.path}
                        href={href(child.path)}
                        onClick={onClose}
                        className="tw:block tw:no-underline tw:text-sm tw:transition-all tw:duration-150 tw:ease-in-out"
                        style={{
                          padding: `${spacing.xs} ${spacing['2xl']} ${spacing.xs} ${spacing['4xl']}`,
                          backgroundColor: childActive ? colors.primary[50] : 'transparent',
                          color: childActive ? colors.primary[700] : colors.text.tertiary,
                          fontWeight: childActive ? 600 : 400,
                          fontFamily: typography.fontFamily.primary,
                          borderLeft: childActive
                            ? `3px solid ${colors.primary[500]}`
                            : '3px solid transparent',
                        }}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              href={href(item.path)}
              onClick={onClose}
              className="tw:flex tw:items-center tw:no-underline tw:text-sm tw:transition-all tw:duration-150 tw:ease-in-out"
              style={navLinkStyle(isActive, true)}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
