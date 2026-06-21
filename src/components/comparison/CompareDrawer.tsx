'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IconColumns3, IconX } from '@tabler/icons-react';
import { colors, spacing, typography } from '../../designTokens';
import type { Model } from '../../types/comparison';
import { parseComparePeers } from './parseCompare';

type PeerStub = Pick<Model, 'id' | 'name' | 'organization' | 'sector' | 'type'>;

const SECTOR_ORDER: Array<Model['sector']> = [
  'government',
  'non-profit',
  'academic',
  'for-profit',
  'other',
];

const SECTOR_LABEL: Record<Model['sector'], string> = {
  government: 'Government',
  'non-profit': 'Non-profit',
  academic: 'Academic',
  'for-profit': 'For-profit',
  other: 'Other',
};

const TYPE_LABEL: Record<Model['type'], string> = {
  microsimulation: 'microsimulation',
  'tax-calculator': 'tax calculator',
  'rules-engine': 'rules engine',
  'reduced-form': 'reduced form',
};

export interface CompareDrawerProps {
  /**
   * Peers available for comparison — every model in the active country
   * other than the host PE model. The server fetches this once and
   * passes it through the AppShell so the drawer doesn't have to load
   * the YAML on the client.
   */
  peers: PeerStub[];
  /** Display name of the host PE model ("PolicyEngine US" / "...UK"). */
  hostName: string;
}

/**
 * Floating "Compare" button + slide-out drawer. The drawer lists the
 * country's peer models as toggleable pills; selecting one writes the
 * id into `?compare=` and the rest of the model page reacts (sections
 * flip from PE-detail view to side-by-side view).
 *
 * State lives entirely in the URL, so the drawer is just a controlled
 * editor over `?compare=`. Empty param = PE-only mode; `'all'` =
 * every peer in the country.
 */
export default function CompareDrawer({ peers, hostName }: CompareDrawerProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const peerIds = useMemo(() => peers.map((p) => p.id), [peers]);
  const parsed = useMemo(
    () => parseComparePeers(params.get('compare') ?? undefined, peerIds),
    [params, peerIds],
  );
  const selected = useMemo(() => new Set(parsed.peers), [parsed.peers]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function setQuery(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function togglePeer(id: string) {
    // `selected` is already the expanded peer list when `parsed.isAll`
    // is true (parseComparePeers materialises `'all'` into every peer
    // id), so no extra expansion step is needed before mutating.
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setQuery((p) => {
      if (next.size === 0) p.delete('compare');
      else if (next.size === peerIds.length) p.set('compare', 'all');
      else p.set('compare', Array.from(next).join(','));
    });
  }

  function selectAll() {
    setQuery((p) => p.set('compare', 'all'));
  }

  function clearAll() {
    setQuery((p) => p.delete('compare'));
  }

  const count = parsed.peers.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open compare drawer"
        style={{
          position: 'fixed',
          right: spacing.lg,
          bottom: spacing.lg,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: `${spacing.sm} ${spacing.lg}`,
          borderRadius: 999,
          border: `1px solid ${colors.primary[700]}`,
          backgroundColor: count > 0 ? colors.primary[600] : colors.white,
          color: count > 0 ? colors.white : colors.primary[700],
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.18)',
          cursor: 'pointer',
          fontFamily: typography.fontFamily.primary,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <IconColumns3 size={16} stroke={1.75} />
        Compare
        {count > 0 && (
          <span
            style={{
              padding: '0 8px',
              borderRadius: 999,
              backgroundColor: colors.white,
              color: colors.primary[700],
              fontSize: 11,
              fontWeight: 700,
              minWidth: 18,
              textAlign: 'center',
            }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.35)',
            zIndex: 50,
          }}
        />
      )}

      <aside
        aria-label="Compare with other models"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(380px, 90vw)',
          zIndex: 60,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 220ms ease-out',
          backgroundColor: colors.white,
          boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: typography.fontFamily.primary,
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: spacing.lg,
            borderBottom: `1px solid ${colors.border.light}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: colors.text.tertiary,
                marginBottom: 4,
              }}
            >
              Compare
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: colors.text.primary }}>
              {hostName} with…
            </div>
            <div style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 4 }}>
              {count === 0
                ? 'Pick one or more peers to switch this model page into side-by-side view.'
                : `${count} of ${peerIds.length} peers selected.`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close compare drawer"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 4,
              color: colors.text.tertiary,
            }}
          >
            <IconX size={20} stroke={1.5} />
          </button>
        </header>

        <div
          style={{
            display: 'flex',
            gap: spacing.sm,
            padding: `${spacing.sm} ${spacing.lg}`,
            borderBottom: `1px solid ${colors.border.light}`,
          }}
        >
          <button
            type="button"
            onClick={selectAll}
            style={{
              padding: `${spacing.xs} ${spacing.md}`,
              border: 'none',
              background: 'transparent',
              color: colors.primary[600],
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            All peers
          </button>
          <button
            type="button"
            onClick={clearAll}
            style={{
              padding: `${spacing.xs} ${spacing.md}`,
              border: 'none',
              background: 'transparent',
              color: colors.text.tertiary,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>

        <div
          style={{
            padding: spacing.lg,
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {SECTOR_ORDER.filter((sector) =>
            peers.some((p) => p.sector === sector),
          ).map((sector) => (
            <div key={sector} style={{ marginBottom: spacing.lg }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: colors.text.tertiary,
                  marginBottom: spacing.xs,
                }}
              >
                {SECTOR_LABEL[sector]}
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.xs,
                }}
              >
                {peers
                  .filter((p) => p.sector === sector)
                  .map((p) => {
                    const isOn = parsed.isAll || selected.has(p.id);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => togglePeer(p.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            gap: spacing.sm,
                            padding: `${spacing.sm} ${spacing.md}`,
                            borderRadius: 6,
                            border: isOn
                              ? `1px solid ${colors.primary[500]}`
                              : `1px solid ${colors.border.medium}`,
                            backgroundColor: isOn
                              ? colors.primary[50]
                              : colors.white,
                            color: isOn
                              ? colors.primary[800]
                              : colors.text.primary,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: 13,
                            fontWeight: isOn ? 600 : 500,
                          }}
                        >
                          <span>
                            {p.name}
                            <span
                              style={{
                                display: 'block',
                                fontSize: 11,
                                color: isOn
                                  ? colors.primary[700]
                                  : colors.text.tertiary,
                                fontWeight: 400,
                              }}
                            >
                              {TYPE_LABEL[p.type]}
                            </span>
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: isOn
                                ? colors.primary[700]
                                : colors.text.tertiary,
                              fontWeight: 500,
                              textAlign: 'right',
                              maxWidth: 140,
                            }}
                          >
                            {p.organization}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
