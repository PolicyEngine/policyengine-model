import { colors } from '../../designTokens';
import type { Source } from '../../types/comparison';

export function SourceList({ sources }: { sources: Source[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <ul
      style={{
        margin: 0,
        padding: 0,
        listStyle: 'none',
        fontSize: 12,
        color: colors.text.tertiary,
      }}
    >
      {sources.map((s, i) => (
        <li key={i} style={{ marginBottom: 2 }}>
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: colors.primary[600], textDecoration: 'none' }}
            >
              {s.label}
            </a>
          ) : (
            <span>{s.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
