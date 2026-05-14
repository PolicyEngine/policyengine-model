import { colors } from '../../designTokens';
import type { Source, SourceKind } from '../../types/comparison';

const KIND_LABEL: Record<SourceKind, string> = {
  self: 'self',
  government: 'gov',
  academic: 'academic',
  press: 'press',
  civilsociety: 'civil society',
  other: '',
};

const KIND_COLOR: Record<SourceKind, string> = {
  self: colors.gray[500],
  government: '#1D4ED8',
  academic: '#7C3AED',
  press: '#DB2777',
  civilsociety: '#0F766E',
  other: colors.gray[400],
};

function KindBadge({ kind }: { kind?: SourceKind }) {
  const k = kind ?? 'other';
  const label = KIND_LABEL[k];
  if (!label) return null;
  return (
    <span
      style={{
        display: 'inline-block',
        marginRight: 6,
        padding: '0 5px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        backgroundColor: `${KIND_COLOR[k]}15`,
        color: KIND_COLOR[k],
      }}
    >
      {label}
    </span>
  );
}

export function SourceList({
  sources,
  compact = false,
  showKind = true,
}: {
  sources: Source[];
  compact?: boolean;
  showKind?: boolean;
}) {
  if (!sources || sources.length === 0) return null;
  return (
    <ul
      style={{
        margin: 0,
        padding: 0,
        listStyle: 'none',
        fontSize: compact ? 11 : 12,
        color: colors.text.tertiary,
        lineHeight: 1.5,
      }}
    >
      {sources.map((s, i) => (
        <li key={i} style={{ marginBottom: compact ? 1 : 2 }}>
          {showKind && <KindBadge kind={s.kind} />}
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={s.quote ? `"${s.quote}"` : undefined}
              style={{
                color: colors.primary[600],
                textDecoration: 'none',
                borderBottom: s.quote ? `1px dotted ${colors.primary[400]}` : 'none',
                cursor: s.quote ? 'help' : 'pointer',
              }}
            >
              {s.label}
            </a>
          ) : (
            <span
              title={s.quote ? `"${s.quote}"` : undefined}
              style={{
                borderBottom: s.quote ? `1px dotted ${colors.gray[400]}` : 'none',
                cursor: s.quote ? 'help' : 'default',
              }}
            >
              {s.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Compact source-count summary that's clickable in interactive views.
 * Renders as plain text in server components.
 */
export function SourceCount({ count, kinds }: { count: number; kinds: Set<SourceKind> }) {
  if (count === 0) return <span style={{ color: colors.gray[400], fontSize: 11 }}>no source</span>;
  const kindLabels = Array.from(kinds)
    .filter((k) => k !== 'other')
    .map((k) => KIND_LABEL[k])
    .filter(Boolean);
  return (
    <span style={{ fontSize: 11, color: colors.text.tertiary }}>
      {count} source{count === 1 ? '' : 's'}
      {kindLabels.length > 0 ? ` · ${kindLabels.join(', ')}` : ''}
    </span>
  );
}
