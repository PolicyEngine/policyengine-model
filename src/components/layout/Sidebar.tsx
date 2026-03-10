import { useState, useEffect } from 'react';
import { useHashRoute, navigate } from '../../router';
import { colors, typography, spacing } from '../../designTokens';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';

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
  country: string;
  onClose?: () => void;
}

export default function Sidebar({ country, onClose }: SidebarProps) {
  const currentPath = useHashRoute();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Auto-expand parent when navigating to a child route
  useEffect(() => {
    for (const item of navItems) {
      if (item.children?.some((c) => c.path === currentPath)) {
        setExpanded((prev) => ({ ...prev, [item.path]: true }));
      }
    }
  }, [currentPath]);

  const handleNavClick = (item: NavItem) => {
    if (item.children) {
      setExpanded((prev) => ({ ...prev, [item.path]: !prev[item.path] }));
      if (!expanded[item.path]) {
        navigate(item.children[0].path);
        onClose?.();
      }
    } else {
      navigate(item.path);
      onClose?.();
    }
  };

  const behavioralLabel =
    country === 'uk' ? 'Behavioural responses' : 'Behavioral responses';

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

          return (
            <div key={item.path}>
              <button
                onClick={() => handleNavClick(item)}
                className="tw:w-full tw:flex tw:items-center tw:justify-between tw:border-none tw:cursor-pointer tw:text-left tw:text-sm tw:transition-all tw:duration-150 tw:ease-in-out"
                style={{
                  padding: `${spacing.sm} ${spacing['2xl']}`,
                  backgroundColor:
                    !item.children && isActive ? colors.primary[50] : 'transparent',
                  color: isActive ? colors.primary[700] : colors.text.secondary,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: typography.fontFamily.primary,
                  borderLeft: !item.children && isActive
                    ? `3px solid ${colors.primary[500]}`
                    : '3px solid transparent',
                }}
              >
                <span>{label}</span>
                {item.children &&
                  (isExpanded ? (
                    <IconChevronDown size={16} stroke={1.5} />
                  ) : (
                    <IconChevronRight size={16} stroke={1.5} />
                  ))}
              </button>

              {/* Children */}
              {item.children && isExpanded &&
                item.children.map((child) => {
                    const childActive = child.path === currentPath;
                    return (
                      <button
                        key={child.path}
                        onClick={() => {
                          navigate(child.path);
                          onClose?.();
                        }}
                        className="tw:w-full tw:block tw:border-none tw:cursor-pointer tw:text-left tw:text-sm tw:transition-all tw:duration-150 tw:ease-in-out"
                        style={{
                          padding: `${spacing.xs} ${spacing['2xl']} ${spacing.xs} ${spacing['4xl']}`,
                          backgroundColor: childActive
                            ? colors.primary[50]
                            : 'transparent',
                          color: childActive
                            ? colors.primary[700]
                            : colors.text.tertiary,
                          fontWeight: childActive ? 600 : 400,
                          fontFamily: typography.fontFamily.primary,
                          borderLeft: childActive
                            ? `3px solid ${colors.primary[500]}`
                            : '3px solid transparent',
                        }}
                      >
                        {child.label}
                      </button>
                    );
                })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
