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
      className="tw:flex-1 tw:min-w-[110px] tw:cursor-pointer tw:text-center tw:relative tw:transition-all tw:duration-200 tw:ease-in-out"
      style={{
        padding: `${spacing.md} ${spacing.sm}`,
        border: `2px solid ${isActive ? colors.primary[500] : colors.border.light}`,
        borderRadius,
        backgroundColor: isActive ? colors.primary[50] : colors.white,
        fontFamily: typography.fontFamily.primary,
        marginLeft: marginLeft ? '-2px' : '0',
      }}
    >
      <div className="tw:mb-[2px] tw:flex tw:justify-center" style={{ color: isActive ? colors.primary[600] : colors.text.tertiary }}>
        {(() => { const Icon = iconMap[s.icon]; return Icon ? <Icon size={20} stroke={1.5} /> : null; })()}
      </div>
      <div className="tw:text-[11px] tw:font-bold tw:leading-tight" style={{ color: isActive ? colors.primary[800] : colors.text.primary }}>
        {s.title}
      </div>
      <div className="tw:text-[9px] tw:mt-[1px] tw:leading-tight" style={{ color: colors.text.tertiary }}>{s.subtitle}</div>
      {s.isFinalDataset && (
        <div
          className="tw:mt-1 tw:text-[8px] tw:font-bold tw:inline-block tw:uppercase tw:tracking-wide"
          style={{
            color: colors.white,
            backgroundColor: colors.primary[500],
            borderRadius: spacing.radius.sm,
            padding: '1px 6px',
          }}
        >
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
      <p className="tw:text-lg tw:leading-relaxed tw:mb-8 tw:max-w-[720px]" style={{ color: colors.text.secondary }}>
        {introText}
      </p>

      {/* Pipeline flow - branching layout */}
      <div className="tw:mb-8">
        {/* Shared linear portion */}
        <div className="tw:flex tw:items-stretch tw:gap-0">
          {sharedStages.map((s, i) => (
            <div key={s.id} className="tw:flex-1 tw:flex tw:items-stretch">
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
        <div className="tw:flex tw:justify-center tw:relative tw:h-10">
          <div className="tw:absolute tw:top-0 tw:left-1/2 tw:w-[2px] tw:h-5" style={{ backgroundColor: colors.border.light }} />
          <div className="tw:absolute tw:top-5 tw:left-1/4 tw:right-1/4 tw:h-[2px]" style={{ backgroundColor: colors.border.light }} />
          <div className="tw:absolute tw:top-5 tw:left-1/4 tw:w-[2px] tw:h-5" style={{ backgroundColor: colors.border.light }} />
          <div className="tw:absolute tw:top-5 tw:right-1/4 tw:w-[2px] tw:h-5" style={{ backgroundColor: colors.border.light }} />
        </div>

        {/* Two branches side by side */}
        <div className="tw:flex tw:gap-6">
          {/* National branch */}
          <div className="tw:flex-1">
            <div
              className="tw:text-xs tw:font-semibold tw:text-center tw:mb-2 tw:uppercase tw:tracking-widest"
              style={{ color: colors.primary[700] }}
            >
              {nationalLabel}
            </div>
            <div className="tw:flex tw:items-stretch tw:gap-0">
              {nationalStages.map((s, i) => (
                <div key={s.id} className="tw:flex-1 tw:flex tw:items-stretch">
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
          <div className="tw:flex-1">
            <div
              className="tw:text-xs tw:font-semibold tw:text-center tw:mb-2 tw:uppercase tw:tracking-widest"
              style={{ color: colors.primary[700] }}
            >
              {localLabel}
            </div>
            <div className="tw:flex tw:items-stretch tw:gap-0">
              {localStages.map((s, i) => (
                <div key={s.id} className="tw:flex-1 tw:flex tw:items-stretch">
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
          className="tw:rounded-xl"
          style={{
            padding: spacing['3xl'],
            border: `1px solid ${stage.isFinalDataset ? colors.primary[300] : colors.border.light}`,
            backgroundColor: colors.white,
            boxShadow: stage.isFinalDataset ? `0 0 0 1px ${colors.primary[100]}, ${spacing.shadow.sm}` : spacing.shadow.sm,
          }}
        >
          {/* Header */}
          <div className="tw:flex tw:justify-between tw:items-start tw:mb-5 tw:flex-wrap tw:gap-3">
            <div className="tw:flex tw:items-center tw:gap-3">
              <div>
                <h3 className="tw:text-2xl tw:font-bold tw:m-0" style={{ color: colors.primary[900] }}>
                  {stage.title}
                </h3>
                <div className="tw:text-sm tw:mt-1" style={{ color: colors.text.tertiary }}>{stage.subtitle}</div>
              </div>
              {stage.isFinalDataset && (
                <span
                  className="tw:text-xs tw:font-bold tw:rounded-md"
                  style={{
                    color: colors.primary[700],
                    backgroundColor: colors.primary[50],
                    border: `1px solid ${colors.primary[200]}`,
                    padding: `2px ${spacing.md}`,
                  }}
                >
                  Final dataset
                </span>
              )}
            </div>
            {(stage.inputSize || stage.outputSize) && (
              <div className="tw:flex tw:gap-4">
                {stage.inputSize && (
                  <div className="tw:text-center">
                    <div className="tw:text-xs" style={{ color: colors.text.tertiary }}>Input</div>
                    <div className="tw:text-sm tw:font-bold tw:font-mono" style={{ color: colors.primary[700] }}>{stage.inputSize}</div>
                  </div>
                )}
                {stage.inputSize && stage.outputSize && (
                  <div className="tw:flex tw:items-center tw:text-lg" style={{ color: colors.text.tertiary }}>→</div>
                )}
                {stage.outputSize && (
                  <div className="tw:text-center">
                    <div className="tw:text-xs" style={{ color: colors.text.tertiary }}>Output</div>
                    <div className="tw:text-sm tw:font-bold tw:font-mono" style={{ color: colors.primary[700] }}>{stage.outputSize}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Data sources */}
          {stage.dataSources && (
            <div className="tw:flex tw:gap-2 tw:flex-wrap tw:mb-5">
              {stage.dataSources.map(src => (
                <span
                  key={src}
                  className="tw:text-xs tw:font-medium tw:rounded-sm"
                  style={{
                    color: colors.primary[700],
                    backgroundColor: colors.primary[50],
                    padding: `2px ${spacing.sm}`,
                  }}
                >
                  {src}
                </span>
              ))}
            </div>
          )}

          <p className="tw:text-base tw:leading-relaxed tw:mb-6" style={{ color: colors.text.secondary }}>
            {stage.description}
          </p>

          {/* Details */}
          <ul className="tw:list-none tw:p-0 tw:mb-6 tw:flex tw:flex-col tw:gap-3">
            {stage.details.map((detail, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="tw:flex tw:items-start tw:gap-3 tw:text-sm tw:leading-normal"
                style={{ color: colors.text.primary }}
              >
                <span
                  className="tw:inline-block tw:w-1.5 tw:h-1.5 tw:rounded-full tw:mt-[7px] tw:shrink-0"
                  style={{ backgroundColor: colors.primary[500] }}
                />
                {detail}
              </motion.li>
            ))}
          </ul>

          {/* Expandable sections */}
          <div className="tw:flex tw:flex-col tw:gap-3">
            {stage.imputations && stage.imputations.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('imputations')}
                  className="tw:w-full tw:cursor-pointer tw:text-left tw:flex tw:justify-between tw:items-center"
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    borderRadius: spacing.radius.lg,
                    border: `1px solid ${colors.border.light}`,
                    backgroundColor: expandedSection === 'imputations' ? colors.primary[50] : colors.gray[50],
                    fontFamily: typography.fontFamily.primary,
                  }}
                >
                  <span className="tw:text-sm tw:font-semibold" style={{ color: colors.text.primary }}>
                    Imputations and transformations ({stage.imputations.length})
                  </span>
                  <span
                    className="tw:text-sm tw:transition-transform tw:duration-200"
                    style={{ color: colors.text.tertiary, transform: expandedSection === 'imputations' ? 'rotate(180deg)' : 'none' }}
                  >
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
                      className="tw:overflow-hidden"
                    >
                      <div className="tw:py-3">
                        <table className="tw:w-full tw:border-collapse">
                          <thead>
                            <tr>
                              {['Variable', 'Source', 'Method'].map(col => (
                                <th
                                  key={col}
                                  className="tw:text-left tw:text-xs tw:font-semibold"
                                  style={{ padding: `${spacing.sm} ${spacing.md}`, color: colors.text.secondary, borderBottom: `1px solid ${colors.border.light}` }}
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {stage.imputations!.map((imp, i) => (
                              <tr key={i} style={{ borderBottom: i < stage.imputations!.length - 1 ? `1px solid ${colors.border.light}` : 'none' }}>
                                <td className="tw:text-sm tw:font-medium" style={{ padding: `${spacing.sm} ${spacing.md}`, color: colors.text.primary }}>{imp.name}</td>
                                <td className="tw:text-xs" style={{ padding: `${spacing.sm} ${spacing.md}`, color: colors.primary[600] }}>{imp.source}</td>
                                <td className="tw:text-xs" style={{ padding: `${spacing.sm} ${spacing.md}`, color: colors.text.secondary }}>{imp.method}</td>
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
                  className="tw:w-full tw:cursor-pointer tw:text-left tw:flex tw:justify-between tw:items-center"
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    borderRadius: spacing.radius.lg,
                    border: `1px solid ${colors.border.light}`,
                    backgroundColor: expandedSection === 'targets' ? colors.primary[50] : colors.gray[50],
                    fontFamily: typography.fontFamily.primary,
                  }}
                >
                  <span className="tw:text-sm tw:font-semibold" style={{ color: colors.text.primary }}>
                    Calibration targets ({stage.calibrationTargets.length})
                  </span>
                  <span
                    className="tw:text-sm tw:transition-transform tw:duration-200"
                    style={{ color: colors.text.tertiary, transform: expandedSection === 'targets' ? 'rotate(180deg)' : 'none' }}
                  >
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
                      className="tw:overflow-hidden"
                    >
                      <div className="tw:py-3">
                        <table className="tw:w-full tw:border-collapse">
                          <thead>
                            <tr>
                              {['Variable', 'Target', 'Source'].map(col => (
                                <th
                                  key={col}
                                  className="tw:text-left tw:text-xs tw:font-semibold"
                                  style={{ padding: `${spacing.sm} ${spacing.md}`, color: colors.text.secondary, borderBottom: `1px solid ${colors.border.light}` }}
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {stage.calibrationTargets!.map((target, i) => (
                              <tr key={i} style={{ borderBottom: i < stage.calibrationTargets!.length - 1 ? `1px solid ${colors.border.light}` : 'none' }}>
                                <td className="tw:text-sm tw:font-medium" style={{ padding: `${spacing.sm} ${spacing.md}`, color: colors.text.primary }}>{target.variable}</td>
                                <td className="tw:text-sm tw:font-bold tw:font-mono" style={{ padding: `${spacing.sm} ${spacing.md}`, color: colors.primary[700] }}>{target.target}</td>
                                <td className="tw:text-xs" style={{ padding: `${spacing.sm} ${spacing.md}`, color: colors.text.tertiary }}>{target.source}</td>
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
