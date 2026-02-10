import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, spacing } from '../../designTokens';
import { microsimSteps, sampleHouseholds } from '../../data/microsimSteps';
import ThreeIngredients from './ThreeIngredients';

export default function Walkthrough() {
  const [stepIdx, setStepIdx] = useState(0);
  const step = microsimSteps[stepIdx];

  return (
    <div>
      <ThreeIngredients activeIngredient={step.ingredient} />

      {/* Step navigation */}
      <div
        style={{
          display: 'flex',
          gap: spacing.sm,
          marginBottom: spacing['2xl'],
          flexWrap: 'wrap',
        }}
      >
        {microsimSteps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStepIdx(i)}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              borderRadius: spacing.radius.lg,
              border: `1px solid ${i === stepIdx ? colors.primary[500] : colors.border.light}`,
              backgroundColor: i === stepIdx ? colors.primary[600] : colors.white,
              color: i === stepIdx ? colors.white : colors.text.secondary,
              fontSize: typography.fontSize.sm,
              fontWeight: i === stepIdx ? typography.fontWeight.semibold : typography.fontWeight.medium,
              fontFamily: typography.fontFamily.primary,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <p
            style={{
              fontSize: typography.fontSize.lg,
              color: colors.text.secondary,
              lineHeight: 1.6,
              marginBottom: spacing['2xl'],
            }}
          >
            {step.description}
          </p>

          {/* Data table */}
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
                  {step.columns.map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: `${spacing.md} ${spacing.lg}`,
                        textAlign: 'left',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.secondary,
                        backgroundColor: colors.gray[50],
                        borderBottom: `1px solid ${colors.border.light}`,
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleHouseholds.map((h, i) => {
                  const rowData = step.getRowData(h);
                  return (
                    <motion.tr
                      key={h.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        borderBottom:
                          i < sampleHouseholds.length - 1
                            ? `1px solid ${colors.border.light}`
                            : 'none',
                      }}
                    >
                      {rowData.map((val, j) => (
                        <td
                          key={j}
                          style={{
                            padding: `${spacing.md} ${spacing.lg}`,
                            fontSize: typography.fontSize.sm,
                            color: colors.text.primary,
                            fontFeatureSettings: '"tnum"',
                          }}
                        >
                          {val}
                        </td>
                      ))}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
