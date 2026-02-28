import { useState, useMemo, useRef, useEffect } from 'react';
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

const COL_TRANSITION = { duration: 0.45, ease: [0.4, 0, 0.2, 1] as number[] };

export default function Walkthrough({ country = 'us' }: { country?: string }) {
  const steps = useMemo(() => getMicrosimSteps(country), [country]);
  const columns = useMemo(() => getColumns(country), [country]);
  const [stepIdx, setStepIdx] = useState(0);
  const prevStepRef = useRef(0);
  const step = steps[stepIdx];

  const justEnteredStep3 = stepIdx === 3 && prevStepRef.current !== 3;

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
              onClick={() => setStepIdx(i)}
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

      {/* Single persistent table — columns animate in as steps advance */}
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
            tableLayout: 'auto',
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => {
                const isVisible = col.visibleFrom <= stepIdx;
                return (
                  <motion.th
                    key={col.key}
                    animate={{
                      maxWidth: isVisible ? 300 : 0,
                      opacity: isVisible ? 1 : 0,
                      paddingLeft: isVisible ? 16 : 0,
                      paddingRight: isVisible ? 16 : 0,
                    }}
                    transition={COL_TRANSITION}
                    style={{
                      paddingTop: 12,
                      paddingBottom: 12,
                      textAlign: col.align,
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.secondary,
                      backgroundColor: colors.gray[50],
                      borderBottom: `1px solid ${colors.border.light}`,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isVisible ? col.label : ''}
                  </motion.th>
                );
              })}
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
                  {columns.map((col) => {
                    const isVisible = col.visibleFrom <= stepIdx;
                    const shouldFlash =
                      justEnteredStep3 && BEHAVIORAL_FLASH_COLUMNS.has(col.key);
                    const value = vals[col.key];
                    const isNegative =
                      SIGNED_COLUMNS.has(col.key) && value.startsWith('-');

                    return (
                      <motion.td
                        key={
                          shouldFlash
                            ? `${h.id}-${col.key}-flash`
                            : `${h.id}-${col.key}`
                        }
                        animate={{
                          maxWidth: isVisible ? 300 : 0,
                          opacity: isVisible ? 1 : 0,
                          paddingLeft: isVisible ? 16 : 0,
                          paddingRight: isVisible ? 16 : 0,
                          backgroundColor: 'transparent',
                        }}
                        initial={
                          shouldFlash
                            ? { backgroundColor: colors.primary[100] }
                            : undefined
                        }
                        transition={{
                          ...COL_TRANSITION,
                          backgroundColor: { duration: 1.5, ease: 'easeOut' },
                        }}
                        style={{
                          paddingTop: 12,
                          paddingBottom: 12,
                          fontSize: typography.fontSize.sm,
                          color:
                            isVisible && isNegative
                              ? colors.success
                              : colors.text.primary,
                          fontFeatureSettings: '"tnum"',
                          textAlign: col.align,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isVisible ? value : ''}
                      </motion.td>
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
                {columns.map((col) => {
                  const isVisible = col.visibleFrom <= stepIdx;
                  const value = totalRow[col.key];
                  const isNegative =
                    SIGNED_COLUMNS.has(col.key) &&
                    value &&
                    value.startsWith('-');

                  return (
                    <motion.td
                      key={`total-${col.key}`}
                      animate={{
                        maxWidth: isVisible ? 300 : 0,
                        opacity: isVisible ? 1 : 0,
                        paddingLeft: isVisible ? 16 : 0,
                        paddingRight: isVisible ? 16 : 0,
                      }}
                      transition={COL_TRANSITION}
                      style={{
                        paddingTop: 12,
                        paddingBottom: 12,
                        fontSize: typography.fontSize.sm,
                        fontWeight:
                          col.key === 'household' || col.key === 'impact'
                            ? typography.fontWeight.bold
                            : typography.fontWeight.medium,
                        color: isNegative ? colors.success : colors.text.primary,
                        fontFeatureSettings: '"tnum"',
                        textAlign: col.align,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        borderTop: `2px solid ${colors.border.medium}`,
                      }}
                    >
                      {isVisible ? value : ''}
                    </motion.td>
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
