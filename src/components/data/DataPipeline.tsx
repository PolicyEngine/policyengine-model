import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, spacing } from '../../designTokens';
import { pipelineStages } from '../../data/pipelineStages';

export default function DataPipeline() {
  const [activeStage, setActiveStage] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const stage = pipelineStages[activeStage];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div>
      <p style={{ fontSize: typography.fontSize.lg, color: colors.text.secondary, lineHeight: 1.7, marginBottom: spacing['3xl'], maxWidth: '720px' }}>
        PolicyEngine constructs its representative household dataset through a multi-stage pipeline,
        starting from public survey data and ending with a calibrated, current-year microdata file
        matched to 100+ administrative targets.
      </p>

      {/* Pipeline flow */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: spacing['3xl'], flexWrap: 'wrap' }}>
        {pipelineStages.map((s, i) => (
          <div key={s.id} style={{ flex: 1, minWidth: '130px', display: 'flex', alignItems: 'stretch' }}>
            <button
              onClick={() => { setActiveStage(i); setExpandedSection(null); }}
              style={{
                flex: 1,
                padding: `${spacing.lg} ${spacing.md}`,
                border: `2px solid ${i === activeStage ? colors.primary[500] : colors.border.light}`,
                borderRadius: i === 0 ? `${spacing.radius.xl} 0 0 ${spacing.radius.xl}` : i === pipelineStages.length - 1 ? `0 ${spacing.radius.xl} ${spacing.radius.xl} 0` : '0',
                backgroundColor: i === activeStage ? colors.primary[50] : colors.white,
                cursor: 'pointer',
                textAlign: 'center',
                fontFamily: typography.fontFamily.primary,
                transition: 'all 0.2s ease',
                marginLeft: i > 0 ? '-2px' : '0',
              }}
            >
              <div style={{ fontSize: '22px', marginBottom: spacing.xs }}>{s.icon}</div>
              <div style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: i === activeStage ? colors.primary[800] : colors.text.primary }}>
                {s.title}
              </div>
              <div style={{ fontSize: '10px', color: colors.text.tertiary, marginTop: '2px' }}>{s.subtitle}</div>
              {s.inputSize && (
                <div style={{ fontSize: '9px', color: colors.text.tertiary, marginTop: spacing.xs, opacity: 0.7 }}>{s.outputSize || s.inputSize}</div>
              )}
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
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl, flexWrap: 'wrap', gap: spacing.md }}>
            <div>
              <h3 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary[900], margin: 0 }}>
                {stage.title}
              </h3>
              <div style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginTop: spacing.xs }}>{stage.subtitle}</div>
            </div>
            {(stage.inputSize || stage.outputSize) && (
              <div style={{ display: 'flex', gap: spacing.lg }}>
                {stage.inputSize && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>Input</div>
                    <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.primary[700], fontFamily: typography.fontFamily.mono }}>{stage.inputSize}</div>
                  </div>
                )}
                {stage.inputSize && stage.outputSize && (
                  <div style={{ display: 'flex', alignItems: 'center', color: colors.text.tertiary, fontSize: '18px' }}>→</div>
                )}
                {stage.outputSize && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>Output</div>
                    <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.primary[700], fontFamily: typography.fontFamily.mono }}>{stage.outputSize}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Data sources */}
          {stage.dataSources && (
            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xl }}>
              {stage.dataSources.map(src => (
                <span key={src} style={{ fontSize: typography.fontSize.xs, color: colors.primary[700], backgroundColor: colors.primary[50], padding: `2px ${spacing.sm}`, borderRadius: spacing.radius.sm, fontWeight: typography.fontWeight.medium }}>
                  {src}
                </span>
              ))}
            </div>
          )}

          <p style={{ fontSize: typography.fontSize.base, color: colors.text.secondary, lineHeight: 1.7, marginBottom: spacing['2xl'] }}>
            {stage.description}
          </p>

          {/* Details */}
          <ul style={{ listStyle: 'none', padding: 0, margin: `0 0 ${spacing['2xl']} 0`, display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {stage.details.map((detail, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md, fontSize: typography.fontSize.sm, color: colors.text.primary, lineHeight: 1.5 }}
              >
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.primary[500], marginTop: '7px', flexShrink: 0 }} />
                {detail}
              </motion.li>
            ))}
          </ul>

          {/* Expandable sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {/* Imputations */}
            {stage.imputations && stage.imputations.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('imputations')}
                  style={{
                    width: '100%',
                    padding: `${spacing.md} ${spacing.lg}`,
                    borderRadius: spacing.radius.lg,
                    border: `1px solid ${colors.border.light}`,
                    backgroundColor: expandedSection === 'imputations' ? colors.primary[50] : colors.gray[50],
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: typography.fontFamily.primary,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    Imputations and transformations ({stage.imputations.length})
                  </span>
                  <span style={{ fontSize: '14px', color: colors.text.tertiary, transform: expandedSection === 'imputations' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ▾
                  </span>
                </button>
                <AnimatePresence>
                  {expandedSection === 'imputations' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: `${spacing.md} 0` }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: typography.fontFamily.primary }}>
                          <thead>
                            <tr>
                              {['Variable', 'Source', 'Method'].map(col => (
                                <th key={col} style={{ padding: `${spacing.sm} ${spacing.md}`, textAlign: 'left', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, borderBottom: `1px solid ${colors.border.light}` }}>
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {stage.imputations!.map((imp, i) => (
                              <tr key={i} style={{ borderBottom: i < stage.imputations!.length - 1 ? `1px solid ${colors.border.light}` : 'none' }}>
                                <td style={{ padding: `${spacing.sm} ${spacing.md}`, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>{imp.name}</td>
                                <td style={{ padding: `${spacing.sm} ${spacing.md}`, fontSize: typography.fontSize.xs, color: colors.primary[600] }}>{imp.source}</td>
                                <td style={{ padding: `${spacing.sm} ${spacing.md}`, fontSize: typography.fontSize.xs, color: colors.text.secondary }}>{imp.method}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Calibration targets */}
            {stage.calibrationTargets && stage.calibrationTargets.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('targets')}
                  style={{
                    width: '100%',
                    padding: `${spacing.md} ${spacing.lg}`,
                    borderRadius: spacing.radius.lg,
                    border: `1px solid ${colors.border.light}`,
                    backgroundColor: expandedSection === 'targets' ? colors.primary[50] : colors.gray[50],
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: typography.fontFamily.primary,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    Calibration targets ({stage.calibrationTargets.length})
                  </span>
                  <span style={{ fontSize: '14px', color: colors.text.tertiary, transform: expandedSection === 'targets' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ▾
                  </span>
                </button>
                <AnimatePresence>
                  {expandedSection === 'targets' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: `${spacing.md} 0` }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: typography.fontFamily.primary }}>
                          <thead>
                            <tr>
                              {['Variable', 'Target', 'Source'].map(col => (
                                <th key={col} style={{ padding: `${spacing.sm} ${spacing.md}`, textAlign: 'left', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, borderBottom: `1px solid ${colors.border.light}` }}>
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {stage.calibrationTargets!.map((target, i) => (
                              <tr key={i} style={{ borderBottom: i < stage.calibrationTargets!.length - 1 ? `1px solid ${colors.border.light}` : 'none' }}>
                                <td style={{ padding: `${spacing.sm} ${spacing.md}`, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>{target.variable}</td>
                                <td style={{ padding: `${spacing.sm} ${spacing.md}`, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.primary[700], fontFamily: typography.fontFamily.mono }}>{target.target}</td>
                                <td style={{ padding: `${spacing.sm} ${spacing.md}`, fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{target.source}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
