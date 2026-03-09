import { useState, useEffect, useMemo } from 'react';
import { colors, typography, spacing } from '../../designTokens';
import { fetchPrograms } from '../../data/fetchPrograms';
import type { Program } from '../../types/Program';
import { IconExternalLink, IconSearch } from '@tabler/icons-react';

export default function ParametersPage({ country }: { country: string }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrograms(country).then((p) => {
      setPrograms(p);
      setLoading(false);
    });
  }, [country]);

  // Group programs by agency
  const grouped = useMemo(() => {
    const map = new Map<string, Program[]>();
    for (const p of programs) {
      if (!p.githubLinks?.parameters) continue;
      const agency = p.agency || p.category || 'Other';
      if (!map.has(agency)) map.set(agency, []);
      map.get(agency)!.push(p);
    }
    // Sort agencies alphabetically
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [programs]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    const result = new Map<string, Program[]>();
    for (const [agency, progs] of grouped) {
      const matches = progs.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.fullName.toLowerCase().includes(q) ||
          agency.toLowerCase().includes(q),
      );
      if (matches.length) result.set(agency, matches);
    }
    return result;
  }, [grouped, search]);

  return (
    <div>
      <div style={{ marginBottom: spacing['4xl'] }}>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: colors.primary[600],
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: spacing.sm,
          }}
        >
          Rules
        </p>
        <h1
          style={{
            fontSize: typography.fontSize['5xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary[900],
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Parameters
        </h1>
        <p
          style={{
            fontSize: typography.fontSize.lg,
            color: colors.text.secondary,
            lineHeight: 1.7,
            marginTop: spacing.lg,
            maxWidth: '720px',
          }}
        >
          PolicyEngine parameters define tax rates, thresholds, benefit amounts, and eligibility
          rules. Each links to the corresponding YAML files in GitHub.
        </p>
      </div>

      {/* Search */}
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
          placeholder="Search parameters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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

      {loading ? (
        <p style={{ color: colors.text.tertiary }}>Loading parameters...</p>
      ) : (
        [...filtered.entries()].map(([agency, progs]) => (
          <div key={agency} style={{ marginBottom: spacing['3xl'] }}>
            <h3
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.bold,
                color: colors.primary[800],
                marginBottom: spacing.lg,
                paddingBottom: spacing.sm,
                borderBottom: `1px solid ${colors.border.light}`,
              }}
            >
              {agency}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {progs.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: `${spacing.sm} ${spacing.lg}`,
                    borderRadius: spacing.radius.md,
                    border: `1px solid ${colors.border.light}`,
                    backgroundColor: colors.white,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                      }}
                    >
                      {p.name}
                    </div>
                    {p.fullName !== p.name && (
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.tertiary,
                        }}
                      >
                        {p.fullName}
                      </div>
                    )}
                  </div>
                  {p.githubLinks?.parameters && (
                    <a
                      href={p.githubLinks.parameters}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: colors.primary[600],
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        fontSize: typography.fontSize.xs,
                        textDecoration: 'none',
                      }}
                    >
                      GitHub <IconExternalLink size={14} stroke={1.5} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
