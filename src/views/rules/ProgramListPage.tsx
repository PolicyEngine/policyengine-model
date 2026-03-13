import { useState, useEffect, useMemo } from 'react';
import { colors, typography, spacing } from '../../designTokens';
import { fetchPrograms } from '../../data/fetchPrograms';
import type { Program } from '../../types/Program';
import { IconExternalLink } from '@tabler/icons-react';
import PageHeader from '../../components/layout/PageHeader';
import SearchInput from '../../components/layout/SearchInput';
import type { Country } from '../../hooks/useCountry';

type LinkType = 'parameters' | 'variables';

interface ProgramListPageProps {
  country: Country;
  linkType: LinkType;
  title: string;
  description: string;
}

export default function ProgramListPage({
  country,
  linkType,
  title,
  description,
}: ProgramListPageProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrograms(country).then((p) => {
      setPrograms(p);
      setLoading(false);
    });
  }, [country]);

  const grouped = useMemo(() => {
    const map = new Map<string, Program[]>();
    for (const p of programs) {
      if (!p.githubLinks?.[linkType]) continue;
      const agency = p.agency || p.category || 'Other';
      if (!map.has(agency)) map.set(agency, []);
      map.get(agency)!.push(p);
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [programs, linkType]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    const result = new Map<string, Program[]>();
    for (const [agency, progs] of grouped) {
      const matches = progs.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.fullName.toLowerCase().includes(q) ||
          (linkType === 'variables' && p.variable && p.variable.toLowerCase().includes(q)) ||
          agency.toLowerCase().includes(q),
      );
      if (matches.length) result.set(agency, matches);
    }
    return result;
  }, [grouped, search, linkType]);

  const linkLabel = linkType === 'parameters' ? 'GitHub' : 'Code';

  return (
    <div>
      <PageHeader category="Rules" title={title} description={description} />
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={`Search ${linkType}...`}
      />

      {loading ? (
        <p style={{ color: colors.text.tertiary }}>Loading {linkType}...</p>
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
                    {linkType === 'parameters' && p.fullName !== p.name && (
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.tertiary,
                        }}
                      >
                        {p.fullName}
                      </div>
                    )}
                    {linkType === 'variables' && p.variable && (
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.tertiary,
                          fontFamily: typography.fontFamily.mono,
                        }}
                      >
                        {p.variable}
                      </div>
                    )}
                  </div>
                  {p.githubLinks?.[linkType] && (
                    <a
                      href={p.githubLinks[linkType]}
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
                      {linkLabel} <IconExternalLink size={14} stroke={1.5} />
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
