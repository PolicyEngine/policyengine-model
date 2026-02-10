import { colors, typography, spacing } from '../../designTokens';
import { useScrollSpy } from '../../hooks/useScrollSpy';

const isUK = new URLSearchParams(window.location.search).get('country') === 'uk';

const sections = [
  { id: 'microsim', label: 'How it works' },
  { id: 'rules', label: 'Rules' },
  { id: 'data', label: 'Data' },
  { id: 'theory', label: isUK ? 'Behavioural responses' : 'Behavioral responses' },
];

export default function StickyNav() {
  const activeId = useScrollSpy(
    sections.map((s) => s.id),
    120
  );

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
    }
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: colors.white,
        borderBottom: `1px solid ${colors.border.light}`,
        boxShadow: spacing.shadow.sm,
        fontFamily: typography.fontFamily.primary,
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: `0 ${spacing['2xl']}`,
          display: 'flex',
          alignItems: 'center',
          height: '64px',
          gap: spacing['3xl'],
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <img
            src="https://policyengine.org/assets/logos/policyengine/teal-square.svg"
            alt="PolicyEngine"
            style={{ height: '28px', width: '28px' }}
          />
          <span
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.primary[900],
            }}
          >
            Model
          </span>
        </div>

        <div style={{ display: 'flex', gap: spacing.xs }}>
          {sections.map((section) => {
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                onClick={() => handleClick(section.id)}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  borderRadius: spacing.radius.md,
                  border: 'none',
                  backgroundColor: isActive ? colors.primary[50] : 'transparent',
                  color: isActive ? colors.primary[700] : colors.text.secondary,
                  fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
                  fontSize: typography.fontSize.sm,
                  fontFamily: typography.fontFamily.primary,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
