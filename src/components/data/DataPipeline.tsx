import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, typography, spacing } from '../../designTokens';
import { pipelineStages } from '../../data/pipelineStages';
import { ukPipelineStages } from '../../data/ukPipelineStages';
import type { PipelineStage } from '../../data/pipelineStages';
import {
  IconChartBar, IconSettings, IconBuildingBank, IconLink, IconScale,
  IconMap, IconMapPin, IconCoin, IconShoppingCart, IconHeartbeat,
  IconTrendingUp, IconSchool, IconCheckbox, IconBuildingCommunity,
} from '@tabler/icons-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; stroke?: number }>> = {
  'chart-bar': IconChartBar,
  'settings': IconSettings,
  'building-bank': IconBuildingBank,
  'link': IconLink,
  'scale': IconScale,
  'map': IconMap,
  'map-pin': IconMapPin,
  'coin': IconCoin,
  'shopping-cart': IconShoppingCart,
  'heart-pulse': IconHeartbeat,
  'trending-up': IconTrendingUp,
  'school': IconSchool,
  'checkbox': IconCheckbox,
  'building-community': IconBuildingCommunity,
};

function StageButton({ s, isActive, onClick, borderRadiusLeft, borderRadiusRight, marginLeft }: {
  s: PipelineStage;
  isActive: boolean;
  onClick: () => void;
  borderRadiusLeft?: boolean;
  borderRadiusRight?: boolean;
  marginLeft?: boolean;
}) {
  const r = spacing.radius.xl;
  const borderRadius = borderRadiusLeft && borderRadiusRight
    ? r
    : borderRadiusLeft ? `${r} 0 0 ${r}`
    : borderRadiusRight ? `0 ${r} ${r} 0`
    : '0';

  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: '110px',
        padding: `${spacing.md} ${spacing.sm}`,
        border: `2px solid ${isActive ? colors.primary[500] : colors.border.light}`,
        borderRadius,
        backgroundColor: isActive ? colors.primary[50] : colors.white,
        cursor: 'pointer',
        textAlign: 'center',
        fontFamily: typography.fontFamily.primary,
        transition: 'all 0.2s ease',
        marginLeft: marginLeft ? '-2px' : '0',
        position: 'relative',
      }}
    >
      <div style={{ marginBottom: '2px', display: 'flex', justifyContent: 'center', color: isActive ? colors.primary[600] : colors.text.tertiary }}>
        {(() => { const Icon = iconMap[s.icon]; return Icon ? <Icon size={20} stroke={1.5} /> : null; })()}
      </div>
      <div style={{ fontSize: '11px', fontWeight: typography.fontWeight.bold, color: isActive ? colors.primary[800] : colors.text.primary, lineHeight: 1.3 }}>
        {s.title}
      </div>
      <div style={{ fontSize: '9px', color: colors.text.tertiary, marginTop: '1px', lineHeight: 1.2 }}>{s.subtitle}</div>
      {s.isFinalDataset && (
        <div style={{
          marginTop: spacing.xs,
          fontSize: '8px',
          fontWeight: typography.fontWeight.bold,
          color: colors.white,
          backgroundColor: colors.primary[500],
          borderRadius: spacing.radius.sm,
          padding: '1px 6px',
          display: 'inline-block',
          letterSpacing: '0.5px',
          textTransform: 'uppercase' as const,
        }}>
          Final dataset
        </div>
      )}
    </button>
  );
}

export default function DataPipeline({ country = 'us' }: { country?: string }) {
  const allStages = country === 'uk' ? ukPipelineStages : pipelineStages;
  const sharedStages = allStages.filter(s => s.branch === 'shared');
  const nationalStages = allStages.filter(s => s.branch === 'national');
  const localStages = allStages.filter(s => s.branch === 'local');

  const [activeStage, setActiveStage] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const stage = allStages[activeStage];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const selectStage = (id: string) => {
    const idx = allStages.findIndex(s => s.id === id);
    if (idx >= 0) {
      setActiveStage(idx);
      setExpandedSection(null);
    }
  };

  const introText = country === 'uk'
    ? 'PolicyEngine constructs its representative household dataset through a multi-stage pipeline, starting from the Family Resources Survey and producing two weight matrices: one for 650 parliamentary constituencies and one for 360 local authorities.'
    : 'PolicyEngine constructs its representative household dataset through a multi-stage pipeline, starting from public survey data and branching into two final datasets: one calibrated nationally, one calibrated per state and congressional district.';

  const nationalLabel = country === 'uk' ? 'Constituency (national)' : 'National';
  const localLabel = country === 'uk' ? 'Local authority' : 'Local (state / CD)';

  return (
    <div>
      <p style={{ fontSize: typography.fontSize.lg, color: colors.text.secondary, lineHeight: 1.7, marginBottom: spacing['3xl'], maxWidth: '720px' }}>
        {introText}
      </p>

      {/* Pipeline flow - branching layout */}
      <div style={{ marginBottom: spacing['3xl'] }}>
        {/* Shared linear portion */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          {sharedStages.map((s, i) => (
            <div key={s.id} style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
              <StageButton
                s={s}
                isActive={allStages.indexOf(s) === activeStage}
                onClick={() => selectStage(s.id)}
                borderRadiusLeft={i === 0}
                marginLeft={i > 0}
              />
            </div>
          ))}
        </div>

        {/* Fork connector */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', height: '40px' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', width: '2px', height: '20px', backgroundColor: colors.border.light }} />
          <div style={{ position: 'absolute', top: '20px', left: '25%', right: '25%', height: '2px', backgroundColor: colors.border.light }} />
          <div style={{ position: 'absolute', top: '20px', left: '25%', width: '2px', height: '20px', backgroundColor: colors.border.light }} />
          <div style={{ position: 'absolute', top: '20px', right: '25%', width: '2px', height: '20px', backgroundColor: colors.border.light }} />
        </div>

        {/* Two branches side by side */}
        <div style={{ display: 'flex', gap: spacing['2xl'] }}>
          {/* National branch */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              color: colors.primary[700],
              textAlign: 'center',
              marginBottom: spacing.sm,
              textTransform: 'uppercase' as const,
              letterSpacing: '1px',
            }}>
              {nationalLabel}
            </div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
              {nationalStages.map((s, i) => (
                <div key={s.id} style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
                  <StageButton
                    s={s}
                    isActive={allStages.indexOf(s) === activeStage}
                    onClick={() => selectStage(s.id)}
                    borderRadiusLeft={i === 0}
                    borderRadiusRight={i === nationalStages.length - 1}
                    marginLeft={i > 0}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Local branch */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              color: colors.primary[700],
              textAlign: 'center',
              marginBottom: spacing.sm,
              textTransform: 'uppercase' as const,
              letterSpacing: '1px',
            }}>
              {localLabel}
            </div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
              {localStages.map((s, i) => (
                <div key={s.id} style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
                  <StageButton
                    s={s}
                    isActive={allStages.indexOf(s) === activeStage}
                    onClick={() => selectStage(s.id)}
                    borderRadiusLeft={i === 0}
                    borderRadiusRight={i === localStages.length - 1}
                    marginLeft={i > 0}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
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
            border: `1px solid ${stage.isFinalDataset ? colors.primary[300] : colors.border.light}`,
            backgroundColor: colors.white,
            boxShadow: stage.isFinalDataset ? `0 0 0 1px ${colors.primary[100]}, ${spacing.shadow.sm}` : spacing.shadow.sm,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl, flexWrap: 'wrap', gap: spacing.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div>
                <h3 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary[900], margin: 0 }}>
                  {stage.title}
                </h3>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginTop: spacing.xs }}>{stage.subtitle}</div>
              </div>
              {stage.isFinalDataset && (
                <span style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.primary[700],
                  backgroundColor: colors.primary[50],
                  border: `1px solid ${colors.primary[200]}`,
                  borderRadius: spacing.radius.md,
                  padding: `2px ${spacing.md}`,
                }}>
                  Final dataset
                </span>
              )}
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
