import { useState, useRef, useEffect } from 'react';
import { IconMenu2, IconChevronDown, IconWorld, IconX } from '@tabler/icons-react';
import { colors, spacing, typography } from '@policyengine/design-system/tokens';
import type { Country } from '../../hooks/useCountry';

interface PEHeaderProps {
  country: Country;
}

const COUNTRIES = [
  { id: 'us', label: 'United States' },
  { id: 'uk', label: 'United Kingdom' },
];

const PE_LOGO_URL =
  'https://raw.githubusercontent.com/PolicyEngine/policyengine-app-v2/main/app/public/assets/logos/policyengine/white.svg';

const navItemStyle: React.CSSProperties = {
  color: colors.text.inverse,
  fontWeight: typography.fontWeight.medium,
  fontSize: '15px',
  fontFamily: typography.fontFamily.primary,
  textDecoration: 'none',
  padding: '6px 14px',
  borderRadius: '6px',
  transition: 'background-color 0.15s ease',
  letterSpacing: '0.01em',
};

const hoverHandlers = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
  },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
  },
};

function getNavItems(country: Country) {
  return [
    { label: 'Research', href: `https://policyengine.org/${country}/research` },
    { label: 'Model', href: `https://policyengine.org/${country}/model` },
    { label: 'API', href: `https://policyengine.org/${country}/api` },
    {
      label: 'About',
      hasDropdown: true,
      items: [
        { label: 'Team', href: `https://policyengine.org/${country}/team` },
        { label: 'Supporters', href: `https://policyengine.org/${country}/supporters` },
      ],
    },
    { label: 'Donate', href: `https://policyengine.org/${country}/donate` },
  ];
}

/** Apple-style animated dropdown panel with glassmorphism */
function AppleDropdown({
  items,
  open,
  onClose,
  align = 'center',
}: {
  items: { label: string; href: string; bold?: boolean }[];
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
      ? { right: 0, transform: visible ? 'translateY(0)' : 'translateY(-8px)' }
      : {
          left: '50%',
          transform: visible
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(-8px)',
        };

  return (
    <>
      {/* Click-away layer */}
      {/* Click-away handler */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 999, cursor: 'default' }}
      />
      <div
        style={{
          position: 'absolute',
          top: '100%',
          ...positionStyle,
          marginTop: '10px',
          minWidth: '220px',
          overflow: 'hidden',
          maxHeight: visible ? `${contentHeight}px` : '0px',
          opacity: visible ? 1 : 0,
          transition:
            'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.97), rgba(240,249,255,0.95))',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
          boxShadow:
            '0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.6)',
          zIndex: 1001,
        }}
      >
        <div ref={contentRef} style={{ padding: '8px' }}>
          {items.map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                textAlign: 'left' as const,
                padding: '11px 16px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: typography.fontFamily.primary,
                fontWeight: item.bold ? typography.fontWeight.bold : typography.fontWeight.semibold,
                color: colors.primary[800],
                transition: 'background-color 0.12s ease, color 0.12s ease, opacity 0.3s ease',
                transitionDelay: visible ? `${i * 50}ms` : '0ms',
                opacity: visible ? 1 : 0,
                lineHeight: '1.3',
                letterSpacing: '-0.01em',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary[500];
                e.currentTarget.style.color = colors.text.inverse;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = colors.primary[800];
              }}
            >
              {item.label}
              {item.bold && (
                <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.6 }}>✓</span>
              )}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

export default function PEHeader({ country }: PEHeaderProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const aboutRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);

  const NAV_ITEMS = getNavItems(country);

  // Media query for responsive behavior
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (aboutRef.current && !aboutRef.current.contains(e.target as Node)) setAboutOpen(false);
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAboutOpen(false);
        setCountryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const countryItems = COUNTRIES.map((c) => ({
    label: c.label,
    href: `https://policyengine.org/${c.id}/model`,
    bold: c.id === country,
  }));

  const globeButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    transition: 'background-color 0.15s ease',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
  };

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
        boxSizing: 'border-box' as const,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
        {/* Left: Logo + Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <a
            href={`https://policyengine.org/${country}`}
            style={{ display: 'flex', alignItems: 'center', marginRight: spacing.md }}
          >
            <img src={PE_LOGO_URL} alt="PolicyEngine" style={{ height: '24px', width: 'auto', marginRight: '12px' }} />
          </a>

          {/* Desktop nav */}
          {isDesktop && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: spacing['2xl'] }}>
              {NAV_ITEMS.map((item) =>
                item.hasDropdown ? (
                  <div key={item.label} ref={aboutRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setAboutOpen(!aboutOpen)}
                      style={{
                        ...navItemStyle,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      {...hoverHandlers}
                    >
                      <span>{item.label}</span>
                      <IconChevronDown
                        size={15}
                        color={colors.text.inverse}
                        style={{
                          opacity: 0.7,
                          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: aboutOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                    </button>
                    <AppleDropdown
                      items={item.items!.map((sub) => ({ label: sub.label, href: sub.href }))}
                      open={aboutOpen}
                      onClose={() => setAboutOpen(false)}
                    />
                  </div>
                ) : (
                  <a key={item.label} href={item.href} style={navItemStyle} {...hoverHandlers}>
                    {item.label}
                  </a>
                ),
              )}
            </nav>
          )}
        </div>

        {/* Right side */}
        {isDesktop ? (
          /* Desktop: Country selector */
          <div ref={countryRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setCountryOpen(!countryOpen)}
              style={globeButtonStyle}
              aria-label="Country selector"
              {...hoverHandlers}
            >
              <IconWorld size={18} color={colors.text.inverse} />
            </button>
            <AppleDropdown
              items={countryItems}
              open={countryOpen}
              onClose={() => setCountryOpen(false)}
              align="right"
            />
          </div>
        ) : (
          /* Mobile: Country selector + hamburger */
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div ref={countryRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setCountryOpen(!countryOpen)}
                style={globeButtonStyle}
                aria-label="Country selector"
                {...hoverHandlers}
              >
                <IconWorld size={18} color={colors.text.inverse} />
              </button>
              <AppleDropdown
                items={countryItems}
                open={countryOpen}
                onClose={() => setCountryOpen(false)}
                align="right"
              />
            </div>
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
          {/* Backdrop */}
          {/* Click-away handler */}
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1001 }}
            onClick={() => setMobileSheetOpen(false)}
          />
          {/* Sheet */}
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
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing['2xl'] }}>
              <span style={{ color: colors.text.inverse, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base }}>
                Menu
              </span>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                aria-label="Close menu"
              >
                <IconX size={24} color="white" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              {NAV_ITEMS.map((item) =>
                item.hasDropdown ? (
                  <div key={item.label}>
                    <span
                      style={{
                        color: colors.text.inverse,
                        fontWeight: typography.fontWeight.medium,
                        fontSize: typography.fontSize.sm,
                        marginBottom: spacing.xs,
                        display: 'block',
                        fontFamily: typography.fontFamily.primary,
                      }}
                    >
                      {item.label}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, paddingLeft: spacing.md }}>
                      {item.items!.map((sub) => (
                        <a
                          key={sub.label}
                          href={sub.href}
                          style={{
                            color: colors.text.inverse,
                            textDecoration: 'none',
                            fontWeight: typography.fontWeight.normal,
                            fontSize: typography.fontSize.sm,
                            fontFamily: typography.fontFamily.primary,
                          }}
                        >
                          {sub.label}
                        </a>
                      ))}
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
                      fontFamily: typography.fontFamily.primary,
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
