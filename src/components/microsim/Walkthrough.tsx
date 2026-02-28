import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, spacing } from '../../designTokens';
import {
  getMicrosimSteps,
  getColumns,
  getCellValues,
  getTotalRow,
  sampleHouseholds,
} from '../../data/microsimSteps';
import ThreeIngredients from './ThreeIngredients';

/**
 * Columns whose values change when transitioning to step 3 (behavioral).
 * Triggers a brief teal highlight animation on those cells.
 */
const BEHAVIORAL_FLASH_COLUMNS = new Set(['earnings', 'reformTax', 'taxChange']);

/** Signed-value columns that should show green when negative (= tax cut). */
const SIGNED_COLUMNS = new Set(['taxChange', 'impact']);

export default function Walkthrough({ country = 'us' }: { country?: string }) {
  const steps = useMemo(() => getMicrosimSteps(country), [country]);
  const allColumns = useMemo(() => getColumns(country), [country]);
  const [stepIdx, setStepIdx] = useState(0);
  const prevStepRef = useRef(0);
  const step = steps[stepIdx];

  /** Only columns whose visibleFrom <= current step. */
  const visibleColumns = useMemo(
    () => allColumns.filter((c) => c.visibleFrom <= stepIdx),
    [allColumns, stepIdx],
  );

  /**
   * Track which column keys just became visible so we can fade them in.
   * We store them in state and clear after a rAF so the CSS transition fires.
   */
  const [newColKeys, setNewColKeys] = useState<Set<string>>(new Set());

  const [flashingCells, setFlashingCells] = useState(false);

  const changeStep = useCallback(
    (newIdx: number) => {
      const oldIdx = stepIdx;
      // Identify columns that will become newly visible
      const newKeys = new Set(
        allColumns
          .filter((c) => c.visibleFrom <= newIdx && c.visibleFrom > oldIdx)
          .map((c) => c.key),
      );

      if (newKeys.size > 0) {
        setNewColKeys(newKeys);
      }

      // Handle behavioral flash (step 3)
      if (newIdx === 3 && oldIdx !== 3) {
        setFlashingCells(true);
      }

      setStepIdx(newIdx);
    },
    [stepIdx, allColumns],
  );

  // Clear new-column fade markers after the transition completes
  // Double-rAF ensures browser paints opacity:0 before transitioning to 1
  useEffect(() => {
    if (newColKeys.size === 0) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setNewColKeys(new Set());
      });
    });
    return () => cancelAnimationFrame(id);
  }, [newColKeys]);

  // Clear behavioral flash after animation
  useEffect(() => {
    if (!flashingCells) return;
    const timer = setTimeout(() => setFlashingCells(false), 1500);
    return () => clearTimeout(timer);
  }, [flashingCells]);

  useEffect(() => {
    prevStepRef.current = stepIdx;
  }, [stepIdx]);

  const showTotal = stepIdx >= 4;
  const totalRow = useMemo(
    () => (showTotal ? getTotalRow(stepIdx, country) : null),
    [showTotal, stepIdx, country],
  );

  return (
    <div>
      <ThreeIngredients activeIngredient={step.ingredient} country={country} />

      {/* Step navigation */}
      <div
        style={{
          display: 'flex',
          gap: spacing.sm,
          marginBottom: spacing.xl,
          flexWrap: 'wrap',
        }}
      >
        {steps.map((s, i) => {
          const isDone = i < stepIdx;
          const isActive = i === stepIdx;
          return (
            <button
              key={s.id}
              onClick={() => changeStep(i)}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                borderRadius: spacing.radius.lg,
                border: `1px solid ${isActive ? colors.primary[500] : isDone ? colors.primary[200] : colors.border.light}`,
                backgroundColor: isActive
                  ? colors.primary[600]
                  : isDone
                    ? colors.primary[50]
                    : colors.white,
                color: isActive
                  ? colors.white
                  : isDone
                    ? colors.primary[700]
                    : colors.text.secondary,
                fontSize: typography.fontSize.sm,
                fontWeight:
                  isActive || isDone
                    ? typography.fontWeight.semibold
                    : typography.fontWeight.medium,
                fontFamily: typography.fontFamily.primary,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {i + 1}. {s.title}
            </button>
          );
        })}
      </div>

      {/* Step description — crossfade between steps */}
      <div style={{ minHeight: '3.2em', marginBottom: spacing['2xl'] }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={step.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: typography.fontSize.lg,
              color: colors.text.secondary,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {step.description}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Single persistent table — only visible columns rendered */}
      <div
        style={{
          borderRadius: spacing.radius.xl,
          border: `1px solid ${colors.border.light}`,
          overflow: 'hidden',
          boxShadow: spacing.shadow.sm,
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: typography.fontFamily.primary,
          }}
        >
          <thead>
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: '12px 16px',
                    textAlign: col.align,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.secondary,
                    backgroundColor: colors.gray[50],
                    borderBottom: `1px solid ${colors.border.light}`,
                    whiteSpace: 'nowrap',
                    opacity: newColKeys.has(col.key) ? 0 : 1,
                    transition: 'opacity 0.4s ease',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sampleHouseholds.map((h, rowIdx) => {
              const vals = getCellValues(h, stepIdx, country);
              return (
                <tr
                  key={h.id}
                  style={{
                    borderBottom:
                      rowIdx < sampleHouseholds.length - 1 || showTotal
                        ? `1px solid ${colors.border.light}`
                        : 'none',
                  }}
                >
                  {visibleColumns.map((col) => {
                    const value = vals[col.key];
                    const isNegative =
                      SIGNED_COLUMNS.has(col.key) && value.startsWith('-');
                    const isFlashing =
                      flashingCells && BEHAVIORAL_FLASH_COLUMNS.has(col.key);

                    return (
                      <td
                        key={col.key}
                        style={{
                          padding: '12px 16px',
                          fontSize: typography.fontSize.sm,
                          color: isNegative
                            ? colors.success
                            : colors.text.primary,
                          fontFeatureSettings: '"tnum"',
                          textAlign: col.align,
                          whiteSpace: 'nowrap',
                          opacity: newColKeys.has(col.key) ? 0 : 1,
                          backgroundColor: isFlashing
                            ? colors.primary[100]
                            : 'transparent',
                          transition:
                            'opacity 0.4s ease, background-color 1.5s ease-out',
                        }}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Total row — appears at step 5 */}
            {showTotal && totalRow && (
              <motion.tr
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                style={{ backgroundColor: colors.gray[50] }}
              >
                {visibleColumns.map((col) => {
                  const value = totalRow[col.key];
                  const isNegative =
                    SIGNED_COLUMNS.has(col.key) &&
                    value &&
                    value.startsWith('-');

                  return (
                    <td
                      key={`total-${col.key}`}
                      style={{
                        padding: '12px 16px',
                        fontSize: typography.fontSize.sm,
                        fontWeight:
                          col.key === 'household' || col.key === 'impact'
                            ? typography.fontWeight.bold
                            : typography.fontWeight.medium,
                        color: isNegative ? colors.success : colors.text.primary,
                        fontFeatureSettings: '"tnum"',
                        textAlign: col.align,
                        whiteSpace: 'nowrap',
                        borderTop: `2px solid ${colors.border.medium}`,
                      }}
                    >
                      {value}
                    </td>
                  );
                })}
              </motion.tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
