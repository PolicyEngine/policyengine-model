import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, spacing } from '../../designTokens';
import { pipelineStages } from '../../data/pipelineStages';

export default function DataPipeline() {
  const [activeStage, setActiveStage] = useState(0);
  const stage = pipelineStages[activeStage];

  return (
    <div>
      <p
        style={{
          fontSize: typography.fontSize.lg,
          color: colors.text.secondary,
          lineHeight: 1.7,
          marginBottom: spacing['3xl'],
          maxWidth: '720px',
        }}
      >
        PolicyEngine constructs its representative household dataset through a four-stage pipeline,
        starting from public survey data and ending with a calibrated, current-year microdata file.
      </p>

      {/* Pipeline flow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          marginBottom: spacing['3xl'],
          flexWrap: 'wrap',
        }}
      >
        {pipelineStages.map((s, i) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              minWidth: '200px',
              display: 'flex',
              alignItems: 'stretch',
            }}
          >
            <button
              onClick={() => setActiveStage(i)}
              style={{
                flex: 1,
                padding: spacing['2xl'],
                border: `2px solid ${i === activeStage ? colors.primary[500] : colors.border.light}`,
                borderRadius:
                  i === 0
                    ? `${spacing.radius.xl} 0 0 ${spacing.radius.xl}`
                    : i === pipelineStages.length - 1
                      ? `0 ${spacing.radius.xl} ${spacing.radius.xl} 0`
                      : '0',
                backgroundColor: i === activeStage ? colors.primary[50] : colors.white,
                cursor: 'pointer',
                textAlign: 'center',
                fontFamily: typography.fontFamily.primary,
                transition: 'all 0.2s ease',
                marginLeft: i > 0 ? '-2px' : '0',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: spacing.sm }}>{s.icon}</div>
              <div
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.bold,
                  color: i === activeStage ? colors.primary[800] : colors.text.primary,
                }}
              >
                {s.title}
              </div>
              <div
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.tertiary,
                  marginTop: '2px',
                }}
              >
                {s.subtitle}
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Stage detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          style={{
            padding: spacing['3xl'],
            borderRadius: spacing.radius.xl,
            border: `1px solid ${colors.border.light}`,
            backgroundColor: colors.white,
            boxShadow: spacing.shadow.sm,
          }}
        >
          <h3
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.primary[900],
              margin: `0 0 ${spacing.md} 0`,
            }}
          >
            {stage.title}: {stage.subtitle}
          </h3>
          <p
            style={{
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
              lineHeight: 1.7,
              marginBottom: spacing['2xl'],
            }}
          >
            {stage.description}
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
            }}
          >
            {stage.details.map((detail, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: spacing.md,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.primary,
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: colors.primary[500],
                    marginTop: '7px',
                    flexShrink: 0,
                  }}
                />
                {detail}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
