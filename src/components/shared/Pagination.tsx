import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { colors, typography, spacing } from '../../designTokens';

export default function Pagination({ page, totalPages, onPageChange }: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  const addPage = (p: number) => {
    if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p);
  };

  addPage(1);
  for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) {
    addPage(i);
  }
  addPage(totalPages);

  const withEllipsis: (number | '...')[] = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (i > 0 && typeof p === 'number' && typeof pages[i - 1] === 'number' && p - (pages[i - 1] as number) > 1) {
      withEllipsis.push('...');
    }
    withEllipsis.push(p);
  }

  const btnBase: React.CSSProperties = {
    minWidth: '32px',
    height: '32px',
    borderRadius: spacing.radius.md,
    border: `1px solid ${colors.border.light}`,
    backgroundColor: colors.white,
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `0 ${spacing.sm}`,
  };

  return (
    <div className="tw:flex tw:items-center tw:justify-center" style={{ gap: spacing.xs, marginTop: spacing.xl }}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="tw:cursor-pointer tw:disabled:cursor-default"
        style={{
          ...btnBase,
          color: page === 1 ? colors.text.tertiary : colors.text.primary,
          opacity: page === 1 ? 0.4 : 1,
        }}
      >
        <IconChevronLeft size={14} stroke={1.5} />
      </button>
      {withEllipsis.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, padding: `0 ${spacing.xs}` }}>
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className="tw:cursor-pointer"
            style={{
              ...btnBase,
              backgroundColor: p === page ? colors.primary[600] : colors.white,
              color: p === page ? colors.white : colors.text.primary,
              borderColor: p === page ? colors.primary[600] : colors.border.light,
            }}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="tw:cursor-pointer tw:disabled:cursor-default"
        style={{
          ...btnBase,
          color: page === totalPages ? colors.text.tertiary : colors.text.primary,
          opacity: page === totalPages ? 0.4 : 1,
        }}
      >
        <IconChevronRight size={14} stroke={1.5} />
      </button>
    </div>
  );
}
