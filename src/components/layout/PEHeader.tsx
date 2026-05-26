'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  IconChevronDown,
  IconMenu2,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import { colors, spacing, typography } from '@policyengine/ui-kit/legacy/tokens';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  appPathFromPublicPath,
  publicBasePrefixFromPath,
} from '../../hooks/usePublicBasePrefix';
import type { Country } from '../../hooks/useCountry';

interface PEHeaderProps {
  country: Country;
}

interface DropdownItem {
  label: string;
  href: string;
  /** True if href points to a different zone (we always use plain <a> here
   *  because this header lives inside the Model multizone). */
  external?: boolean;
  /** One level of nested children, rendered indented under the parent. */
  children?: DropdownItem[];
}

interface NavItemSetup {
  label: string;
  href?: string;
  hasDropdown?: boolean;
  dropdownItems?: DropdownItem[];
}

const COUNTRIES = [
  { id: 'us', label: 'United States' },
  { id: 'uk', label: 'United Kingdom' },
];

const PE_LOGO_URL =
  'https://raw.githubusercontent.com/PolicyEngine/policyengine-app-v2/main/app/public/assets/logos/policyengine/white.svg';

const NAV_ITEM_PADDING_X = 14;
const NAV_UNDERLINE_INSET = 10;
const DROPDOWN_GAP = 10;
const HOVER_OPEN_DELAY_MS = 100;
const HOVER_CLOSE_DELAY_MS = 200;

const navItemStyle: React.CSSProperties = {
  color: colors.text.inverse,
  fontWeight: typography.fontWeight.medium,
  fontSize: '15px',
  fontFamily: typography.fontFamily.primary,
  textDecoration: 'none',
  padding: `8px ${NAV_ITEM_PADDING_X}px`,
  letterSpacing: '0.01em',
  position: 'relative',
};

function NavUnderline({ visible }: { visible: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: `${NAV_UNDERLINE_INSET}px`,
        right: `${NAV_UNDERLINE_INSET}px`,
        bottom: '2px',
        height: '2px',
        borderRadius: '2px',
        backgroundColor: colors.text.inverse,
        transform: visible ? 'scaleX(1)' : 'scaleX(0)',
        transformOrigin: 'center',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none',
      }}
    />
  );
}

function getNavItems(country: Country): NavItemSetup[] {
  const base = `https://policyengine.org/${country}`;
  return [
    { label: 'Research', href: `${base}/research` },
    {
      label: 'Model',
      hasDropdown: true,
      dropdownItems: [
        {
          label: 'Rules',
          href: `${base}/model/rules`,
          children: [
            { label: 'Coverage', href: `${base}/model/rules/coverage` },
            { label: 'Parameters', href: `${base}/model/rules/parameters` },
            { label: 'Variables', href: `${base}/model/rules/variables` },
          ],
        },
        {
          label: 'Data',
          href: `${base}/model/data`,
          children: [
            { label: 'Pipeline', href: `${base}/model/data/pipeline` },
            { label: 'Calibration', href: `${base}/model/data/calibration` },
            { label: 'Validation', href: `${base}/model/data/validation` },
          ],
        },
        { label: 'Behavioral responses', href: `${base}/model/behavioral` },
      ],
    },
    { label: 'API', href: `${base}/api` },
    { label: 'Python', href: `${base}/python` },
    {
      label: 'About',
      hasDropdown: true,
      dropdownItems: [
        { label: 'Team', href: `${base}/team` },
        { label: 'Supporters', href: `${base}/supporters` },
        { label: 'Citations', href: `${base}/citations` },
        { label: 'Events', href: `${base}/events` },
      ],
    },
    { label: 'Donate', href: `${base}/donate` },
  ];
}

/**
 * Match the trigger against the current public URL. For non-Model items
 * we never light up (every other zone is reached by leaving this app),
 * but Model items light up when their public path matches.
 */
function isNavItemActive(
  item: NavItemSetup,
  publicPath: string,
): boolean {
  if (!publicPath) return false;
  const matches = (href: string) => {
    try {
      const path = new URL(href).pathname;
      return publicPath === path || publicPath.startsWith(`${path}/`);
    } catch {
      return false;
    }
  };
  if (item.hasDropdown && item.dropdownItems) {
    const walk = (items: DropdownItem[]): boolean =>
      items.some((c) => matches(c.href) || (c.children ? walk(c.children) : false));
    return walk(item.dropdownItems);
  }
  if (item.href) return matches(item.href);
  return false;
}

function DropdownRow({
  item,
  depth,
  index,
  visible,
  onClose,
}: {
  item: DropdownItem;
  depth: number;
  index: number;
  visible: boolean;
  onClose: () => void;
}) {
  const isChild = depth > 0;
  return (
    <a
      href={item.href}
      onClick={onClose}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        textAlign: 'left',
        padding: `${isChild ? 8 : 11}px 16px ${isChild ? 8 : 11}px ${
          16 + depth * 16
        }px`,
        borderRadius: '10px',
        textDecoration: 'none',
        fontSize: isChild ? '13px' : '14px',
        fontFamily: typography.fontFamily.primary,
        fontWeight: isChild
          ? typography.fontWeight.medium
          : typography.fontWeight.semibold,
        color: isChild ? colors.primary[700] : colors.primary[800],
        transition: `background-color 0.12s ease 0ms, color 0.12s ease 0ms, opacity 0.3s ease ${
          visible ? index * 30 : 0
        }ms`,
        opacity: visible ? 1 : 0,
        lineHeight: '1.3',
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.primary[500];
        e.currentTarget.style.color = colors.text.inverse;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = isChild
          ? colors.primary[700]
          : colors.primary[800];
      }}
    >
      {item.label}
    </a>
  );
}

function DropdownPanel({
  items,
  open,
  onClose,
  align = 'center',
}: {
  items: DropdownItem[];
  open: boolean;
  onClose: () => void;
  align?: 'center' | 'right';
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const timer = setTimeout(() => setContentHeight(0), 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open && contentHeight === 0) return null;

  const positionStyle: React.CSSProperties =
    align === 'right'
      ? { right: 0 }
      : { left: '50%', transform: 'translateX(-50%)' };

  // Flatten one level of children for the cascading reveal
  const rows: Array<{ item: DropdownItem; depth: number }> = [];
  for (const item of items) {
    rows.push({ item, depth: 0 });
    if (item.children) {
      for (const child of item.children) {
        rows.push({ item: child, depth: 1 });
      }
    }
  }

  return (
    <div
      // Bridge across the visual gap so hover doesn't close while travelling.
      style={{
        position: 'absolute',
        top: '100%',
        ...positionStyle,
        paddingTop: `${DROPDOWN_GAP}px`,
        zIndex: 1001,
      }}
    >
      <div
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(-8px)',
          minWidth: '220px',
          overflow: 'hidden',
          maxHeight: visible ? `${contentHeight}px` : '0px',
          opacity: visible ? 1 : 0,
          transition:
            'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '14px',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.97), rgba(240,249,255,0.95))',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
          boxShadow:
            '0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.6)',
        }}
      >
        <div ref={contentRef} style={{ padding: '8px' }}>
          {rows.map(({ item, depth }, i) => (
            <DropdownRow
              key={`${item.label}-${item.href}`}
              item={item}
              depth={depth}
              index={i}
              visible={visible}
              onClose={onClose}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavItem({
  setup,
  active,
}: {
  setup: NavItemSetup;
  active: boolean;
}) {
  const { label, href, hasDropdown, dropdownItems } = setup;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [dropdownOpen]);

  const handleMouseEnter = () => {
    setHovered(true);
    if (!hasDropdown) return;
    clearTimers();
    openTimerRef.current = setTimeout(
      () => setDropdownOpen(true),
      HOVER_OPEN_DELAY_MS,
    );
  };
  const handleMouseLeave = () => {
    setHovered(false);
    if (!hasDropdown) return;
    clearTimers();
    closeTimerRef.current = setTimeout(
      () => setDropdownOpen(false),
      HOVER_CLOSE_DELAY_MS,
    );
  };

  const underlineVisible = active || hovered || dropdownOpen;

  if (hasDropdown && dropdownItems) {
    return (
      <div
        ref={containerRef}
        style={{ position: 'relative' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          style={{
            ...navItemStyle,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{label}</span>
          <IconChevronDown
            size={15}
            color={colors.text.inverse}
            style={{
              opacity: 0.7,
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
          <NavUnderline visible={underlineVisible} />
        </button>
        <DropdownPanel
          items={dropdownItems}
          open={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
        />
      </div>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        style={navItemStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-current={active ? 'page' : undefined}
      >
        {label}
        <NavUnderline visible={underlineVisible} />
      </a>
    );
  }

  return null;
}

function CountrySelector({ country }: { country: Country }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const items: DropdownItem[] = COUNTRIES.map((c) => ({
    label: c.label,
    href: `https://policyengine.org/${c.id}/model`,
  }));

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Country selector"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '6px',
          transition: 'background-color 0.15s ease',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <IconWorld size={18} color={colors.text.inverse} />
      </button>
      <DropdownPanel
        items={items}
        open={open}
        onClose={() => setOpen(false)}
        align="right"
      />
      {/* Active country is implicit (this header lives inside that zone) */}
      <span hidden>{country}</span>
    </div>
  );
}

export default function PEHeader({ country }: PEHeaderProps) {
  const pathname = usePathname() || '/';
  const isDesktop = useMediaQuery('(min-width: 1024px)', true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Compose the public URL (e.g. /us/model/rules/coverage) so dropdown
  // active-state checks compare apples to apples.
  const basePrefix = publicBasePrefixFromPath(pathname);
  const publicPath = basePrefix
    ? `${basePrefix}${appPathFromPublicPath(pathname).replace(/^\/$/, '')}`
    : `/${country}/model${pathname.replace(/^\/$/, '')}`;

  const NAV_ITEMS = getNavItems(country);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        padding: `${spacing.sm} ${spacing['2xl']}`,
        height: spacing.layout.header,
        background: `linear-gradient(to right, ${colors.primary[800]}, ${colors.primary[600]})`,
        borderBottom: `0.5px solid ${colors.primary[700]}`,
        boxShadow: `0px 2px 4px -1px ${colors.shadow.light}, 0px 4px 6px -1px ${colors.shadow.medium}`,
        zIndex: 1000,
        fontFamily: typography.fontFamily.primary,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '100%',
        }}
      >
        {/* Left: Logo + Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <a
            href={`https://policyengine.org/${country}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              // Wider gap than between nav items so the logo reads as an anchor
              marginRight: '40px',
            }}
          >
            <img
              src={PE_LOGO_URL}
              alt="PolicyEngine"
              style={{ height: '24px', width: 'auto' }}
            />
          </a>

          {isDesktop && (
            <nav
              style={{ display: 'flex', alignItems: 'center', gap: '24px' }}
            >
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.label}
                  setup={item}
                  active={isNavItemActive(item, publicPath)}
                />
              ))}
            </nav>
          )}
        </div>

        {/* Right side */}
        {isDesktop ? (
          <CountrySelector country={country} />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <CountrySelector country={country} />
            <button
              type="button"
              onClick={() => setMobileSheetOpen(true)}
              className="tw:p-1 tw:rounded tw:bg-transparent tw:border-none tw:cursor-pointer"
              aria-label="Toggle navigation"
            >
              <IconMenu2 size={24} color={colors.text.inverse} />
            </button>
          </div>
        )}
      </div>

      {/* Mobile slide-in sheet */}
      {mobileSheetOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 1001,
            }}
            onClick={() => setMobileSheetOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '300px',
              height: '100vh',
              backgroundColor: colors.primary[600],
              zIndex: 1002,
              padding: `${spacing.lg} ${spacing['2xl']}`,
              fontFamily: typography.fontFamily.primary,
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing['2xl'],
              }}
            >
              <span
                style={{
                  color: colors.text.inverse,
                  fontWeight: typography.fontWeight.bold,
                  fontSize: typography.fontSize.base,
                }}
              >
                Menu
              </span>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                aria-label="Close menu"
              >
                <IconX size={24} color="white" />
              </button>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}
            >
              {NAV_ITEMS.map((item) =>
                item.hasDropdown && item.dropdownItems ? (
                  <div key={item.label}>
                    <span
                      style={{
                        color: colors.text.inverse,
                        fontWeight: typography.fontWeight.medium,
                        fontSize: typography.fontSize.sm,
                        marginBottom: spacing.xs,
                        display: 'block',
                      }}
                    >
                      {item.label}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: spacing.xs,
                        paddingLeft: spacing.md,
                      }}
                    >
                      {item.dropdownItems.flatMap((sub) => [
                        <a
                          key={sub.label}
                          href={sub.href}
                          style={{
                            color: colors.text.inverse,
                            textDecoration: 'none',
                            fontWeight: typography.fontWeight.normal,
                            fontSize: typography.fontSize.sm,
                          }}
                        >
                          {sub.label}
                        </a>,
                        ...(sub.children ?? []).map((grand) => (
                          <a
                            key={`${sub.label}-${grand.label}`}
                            href={grand.href}
                            style={{
                              color: colors.text.inverse,
                              textDecoration: 'none',
                              fontWeight: typography.fontWeight.normal,
                              fontSize: typography.fontSize.sm,
                              paddingLeft: '14px',
                              opacity: 0.85,
                            }}
                          >
                            {grand.label}
                          </a>
                        )),
                      ])}
                    </div>
                  </div>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    style={{
                      color: colors.text.inverse,
                      textDecoration: 'none',
                      fontWeight: typography.fontWeight.medium,
                      fontSize: typography.fontSize.sm,
                      display: 'block',
                    }}
                  >
                    {item.label}
                  </a>
                ),
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
