import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { colors, typography, spacing } from '../../designTokens';
import { pipelineStages } from '../../data/pipelineStages';
import { ukPipelineStages } from '../../data/ukPipelineStages';
import type { PipelineStage } from '../../data/pipelineStages';
import type { Country } from '../../hooks/useCountry';
import {
  IconChartBar, IconSettings, IconBuildingBank, IconLink, IconScale,
  IconMap, IconMapPin, IconCoin, IconShoppingCart, IconHeartbeat,
  IconTrendingUp, IconSchool, IconCheckbox, IconBuildingCommunity,
  IconRefresh, IconGridDots, IconStack2, IconArrowsSplit2,
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
  'refresh': IconRefresh,
  'grid-dots': IconGridDots,
  'stack-2': IconStack2,
  'arrows-split-2': IconArrowsSplit2,
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

export default function DataPipeline({ country = 'us' }: { country?: Country }) {
  const allStages = country === 'uk' ? ukPipelineStages : pipelineStages;
  const sharedStages = allStages.filter(s => s.branch === 'shared');
  const nationalStages = allStages.filter(s => s.branch === 'national');
  const localStages = allStages.filter(s => s.branch === 'local');
  const localSub1Stages = allStages.filter(s => s.branch === 'local-sub-1');
  const localSub2Stages = allStages.filter(s => s.branch === 'local-sub-2');
  const localSub3Stages = allStages.filter(s => s.branch === 'local-sub-3');
  const localSub4Stages = allStages.filter(s => s.branch === 'local-sub-4');

  const [activeStage, setActiveStage] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const stage = allStages[activeStage];

  const fullPath = usePathname();
  const basePrefix = fullPath.match(/^\/\w+\/model/)?.[0] ?? '';
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const buildHref = (path: string) => {
    const full = `${basePrefix}${path}`;
    return search ? `${full}?${search}` : full;
  };

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
    : 'PolicyEngine constructs its representative household dataset through a 14-step pipeline. Public survey data is merged, stratified, and cloned to 10 geographic variants per household. Each clone is simulated through PolicyEngine US with stochastic take-up, then calibrated via L0-regularized optimization against administrative targets at the national, state, and congressional district levels simultaneously, producing 488 geographically representative datasets.';

  const nationalLabel = country === 'uk' ? 'Constituency (national)' : 'National';
  const localLabel = country === 'uk' ? 'Local authority' : 'Geography-specific';

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
                borderRadiusRight={i === sharedStages.length - 1}
                marginLeft={i > 0}
              />
            </div>
          ))}
        </div>

        {/* Fork connector */}
        <div className="tw:flex tw:justify-center tw:relative tw:h-10">
          <div className="tw:absolute tw:top-0 tw:w-[2px] tw:h-5" style={{ backgroundColor: colors.border.light, left: 'calc(50% - 2px)' }} />
          <div className="tw:absolute tw:top-5 tw:h-[2px]" style={{ backgroundColor: colors.border.light, left: 'calc(25% - 6px)', right: 'calc(25% - 6px)' }} />
          <div className="tw:absolute tw:top-5 tw:w-[2px] tw:h-5" style={{ backgroundColor: colors.border.light, left: 'calc(25% - 6px)' }} />
          <div className="tw:absolute tw:top-5 tw:w-[2px] tw:h-5" style={{ backgroundColor: colors.border.light, right: 'calc(25% - 6px)' }} />
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

        {/* Local-sub-1: connector from center of local row → centered Simulation box */}
        {localSub1Stages.length > 0 && (
          <div style={{ marginTop: '-25px' }}>
            {/* Vertical connector from center of local branch */}
            <div className="tw:flex tw:gap-4 tw:relative tw:h-[30px]">
              <div className="tw:flex-1" />
              <div className="tw:flex-1 tw:relative">
                <div className="tw:absolute tw:left-1/2 tw:top-0 tw:w-[2px] tw:h-full" style={{ backgroundColor: colors.border.light }} />
              </div>
            </div>
            {/* Simulation centered under local branch, same width as one of the two local boxes */}
            <div className="tw:flex tw:gap-6">
              <div className="tw:flex-1" />
              <div className="tw:flex-1">
                <div className="tw:flex tw:justify-center">
                  <div className="tw:w-1/2">
                    <div className="tw:flex tw:items-stretch tw:gap-0">
                      {localSub1Stages.map((s, i) => (
                        <div key={s.id} className="tw:flex-1 tw:flex tw:items-stretch">
                          <StageButton
                            s={s}
                            isActive={allStages.indexOf(s) === activeStage}
                            onClick={() => selectStage(s.id)}
                            borderRadiusLeft={i === 0}
                            borderRadiusRight={i === localSub1Stages.length - 1}
                            marginLeft={i > 0}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Local-sub-2: connector from center of Simulation → Target config + Matrix building */}
        {localSub2Stages.length > 0 && (
          <>
            <div className="tw:flex tw:gap-4 tw:relative tw:h-[30px]">
              <div className="tw:flex-1" />
              <div className="tw:flex-1 tw:relative">
                <div className="tw:absolute tw:left-1/2 tw:top-0 tw:w-[2px] tw:h-full" style={{ backgroundColor: colors.border.light }} />
              </div>
            </div>
            <div className="tw:flex tw:gap-6">
              <div className="tw:flex-1" />
              <div className="tw:flex-1">
                <div className="tw:flex tw:items-stretch tw:gap-0">
                  {localSub2Stages.map((s, i) => (
                    <div key={s.id} className="tw:flex-1 tw:flex tw:items-stretch">
                      <StageButton
                        s={s}
                        isActive={allStages.indexOf(s) === activeStage}
                        onClick={() => selectStage(s.id)}
                        borderRadiusLeft={i === 0}
                        borderRadiusRight={i === localSub2Stages.length - 1}
                        marginLeft={i > 0}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Local-sub-3: connector from center of sub-2 row → centered L0 calibration box */}
        {localSub3Stages.length > 0 && (
          <div style={{ marginTop: '0px' }}>
            <div className="tw:flex tw:gap-4 tw:relative tw:h-[30px]">
              <div className="tw:flex-1" />
              <div className="tw:flex-1 tw:relative">
                <div className="tw:absolute tw:left-1/2 tw:top-0 tw:w-[2px] tw:h-full" style={{ backgroundColor: colors.border.light }} />
              </div>
            </div>
            <div className="tw:flex tw:gap-6">
              <div className="tw:flex-1" />
              <div className="tw:flex-1">
                <div className="tw:flex tw:justify-center">
                  <div className="tw:w-1/2">
                    <div className="tw:flex tw:items-stretch tw:gap-0">
                      {localSub3Stages.map((s, i) => (
                        <div key={s.id} className="tw:flex-1 tw:flex tw:items-stretch">
                          <StageButton
                            s={s}
                            isActive={allStages.indexOf(s) === activeStage}
                            onClick={() => selectStage(s.id)}
                            borderRadiusLeft={i === 0}
                            borderRadiusRight={i === localSub3Stages.length - 1}
                            marginLeft={i > 0}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Local-sub-4: connector from center of sub-3 row → centered final dataset box */}
        {localSub4Stages.length > 0 && (
          <div style={{ marginTop: '0px' }}>
            <div className="tw:flex tw:gap-4 tw:relative tw:h-[30px]">
              <div className="tw:flex-1" />
              <div className="tw:flex-1 tw:relative">
                <div className="tw:absolute tw:left-1/2 tw:top-0 tw:w-[2px] tw:h-full" style={{ backgroundColor: colors.border.light }} />
              </div>
            </div>
            <div className="tw:flex tw:gap-6">
              <div className="tw:flex-1" />
              <div className="tw:flex-1">
                <div className="tw:flex tw:items-stretch tw:gap-0">
                  {localSub4Stages.map((s, i) => (
                    <div key={s.id} className="tw:flex-1 tw:flex tw:items-stretch">
                      <StageButton
                        s={s}
                        isActive={allStages.indexOf(s) === activeStage}
                        onClick={() => selectStage(s.id)}
                        borderRadiusLeft={i === 0}
                        borderRadiusRight={i === localSub4Stages.length - 1}
                        marginLeft={i > 0}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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
          {/* Coming soon banner */}
          {stage.comingSoon && (
            <div
              className="tw:flex tw:items-center tw:gap-3 tw:mb-5 tw:rounded-lg"
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                backgroundColor: colors.primary[50],
                border: `1px solid ${colors.primary[200]}`,
              }}
            >
              <span className="tw:text-sm" style={{ color: colors.primary[600] }}>&#9672;</span>
              <p className="tw:text-sm tw:leading-relaxed tw:m-0" style={{ color: colors.primary[700] }}>
                <span className="tw:font-semibold">Coming soon. </span>
                This stage is planned but not yet implemented in the pipeline.
              </p>
            </div>
          )}

          {/* Legacy note banner */}
          {stage.legacyNote && (
            <div
              className="tw:flex tw:items-start tw:gap-3 tw:mb-5 tw:rounded-lg"
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                backgroundColor: colors.warning + '14',
                border: `1px solid ${colors.warning}40`,
              }}
            >
              <span className="tw:text-base tw:leading-none tw:mt-[1px]">&#9888;</span>
              <p className="tw:text-sm tw:leading-relaxed tw:m-0" style={{ color: colors.text.secondary }}>
                <span className="tw:font-semibold" style={{ color: colors.text.primary }}>Legacy stage. </span>
                {stage.legacyNote}
              </p>
            </div>
          )}

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

          {/* Matrix band visual for matrix-building stage */}
          {stage.id === 'matrix-building' && (
            <div
              className="tw:mb-6 tw:p-5 tw:rounded-xl"
              style={{ border: `1px solid ${colors.border.light}`, backgroundColor: colors.gray[50] }}
            >
              <div className="tw:text-xs tw:font-semibold tw:mb-3 tw:uppercase tw:tracking-wide" style={{ color: colors.text.tertiary }}>
                Matrix structure
              </div>
              <div className="tw:flex tw:flex-col tw:gap-[2px]">
                {/* Column headers */}
                <div className="tw:flex tw:gap-[2px] tw:mb-1">
                  <div className="tw:w-[72px] tw:shrink-0" />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="tw:flex-1 tw:text-center tw:text-[8px] tw:font-mono"
                      style={{ color: colors.text.tertiary }}
                    >
                      h{i + 1}
                    </div>
                  ))}
                </div>
                {/* National band — all clones populated */}
                {['National'].map(label => (
                  <div key={label} className="tw:flex tw:gap-[2px] tw:items-center">
                    <div
                      className="tw:w-[72px] tw:shrink-0 tw:text-[10px] tw:font-semibold tw:pr-2 tw:text-right"
                      style={{ color: colors.primary[700] }}
                    >
                      {label}
                    </div>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="tw:flex-1 tw:h-4 tw:rounded-[2px]"
                        style={{ backgroundColor: colors.primary[400] }}
                      />
                    ))}
                  </div>
                ))}
                {/* State bands — subsets populated */}
                {[
                  { label: 'State A', filled: [0, 1, 2, 4, 7] },
                  { label: 'State B', filled: [3, 5, 6, 8, 9, 11] },
                  { label: 'State C', filled: [10] },
                ].map(({ label, filled }) => (
                  <div key={label} className="tw:flex tw:gap-[2px] tw:items-center">
                    <div
                      className="tw:w-[72px] tw:shrink-0 tw:text-[10px] tw:font-semibold tw:pr-2 tw:text-right"
                      style={{ color: colors.primary[500] }}
                    >
                      {label}
                    </div>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="tw:flex-1 tw:h-4 tw:rounded-[2px]"
                        style={{
                          backgroundColor: filled.includes(i) ? colors.primary[300] : colors.gray[100],
                        }}
                      />
                    ))}
                  </div>
                ))}
                {/* CD bands — smaller subsets */}
                {[
                  { label: 'CD A-1', filled: [0, 2, 4] },
                  { label: 'CD A-2', filled: [1, 7] },
                  { label: 'CD B-1', filled: [3, 5, 9] },
                  { label: 'CD B-2', filled: [6, 8, 11] },
                  { label: 'CD C-1', filled: [10] },
                ].map(({ label, filled }) => (
                  <div key={label} className="tw:flex tw:gap-[2px] tw:items-center">
                    <div
                      className="tw:w-[72px] tw:shrink-0 tw:text-[10px] tw:font-semibold tw:pr-2 tw:text-right"
                      style={{ color: colors.primary[300] }}
                    >
                      {label}
                    </div>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="tw:flex-1 tw:h-4 tw:rounded-[2px]"
                        style={{
                          backgroundColor: filled.includes(i) ? colors.primary[200] : colors.gray[100],
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="tw:flex tw:gap-4 tw:mt-3 tw:justify-end">
                {[
                  { color: colors.primary[400], label: 'National' },
                  { color: colors.primary[300], label: 'State' },
                  { color: colors.primary[200], label: 'CD' },
                  { color: colors.gray[100], label: 'Empty' },
                ].map(({ color, label }) => (
                  <div key={label} className="tw:flex tw:items-center tw:gap-1">
                    <div className="tw:w-3 tw:h-3 tw:rounded-[2px]" style={{ backgroundColor: color }} />
                    <span className="tw:text-[10px]" style={{ color: colors.text.tertiary }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    Calibration target domains ({stage.calibrationTargets.length})
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

            {stage.link && (
              <Link
                href={buildHref(stage.link.path)}
                className="tw:w-full tw:text-left tw:flex tw:justify-between tw:items-center tw:no-underline"
                style={{
                  padding: `${spacing.md} ${spacing.lg}`,
                  borderRadius: spacing.radius.lg,
                  border: `1px solid ${colors.primary[200]}`,
                  backgroundColor: colors.primary[50],
                  fontFamily: typography.fontFamily.primary,
                }}
              >
                <span className="tw:text-sm tw:font-semibold" style={{ color: colors.primary[700] }}>
                  {stage.link.label}
                </span>
                <span className="tw:text-sm" style={{ color: colors.primary[500] }}>→</span>
              </Link>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
