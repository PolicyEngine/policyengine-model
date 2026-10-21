import release from './ukDataRelease.json';

/**
 * The UK data release that policyengine.py pins, summarised by
 * scripts/extract_uk_release.py from the release's own files. The UK data
 * pages quote these fields rather than typed-in numbers, so a new pin only
 * needs the extraction re-run.
 */
export interface UkLocalFamily {
  label: string;
  source: string;
  /** How the build constructs or scores the family, where the label alone would mislead. */
  note: string | null;
  metrics: number;
  heldOut: boolean;
  cells: number;
  within10: number | null;
}

export interface UkLocalCalibration {
  areas: number;
  metrics: number;
  cellsWithTarget: number;
  cellsWithoutSource: number;
  structuralZeroCells: number;
  trainingCells: number;
  trainingWithin10: number;
  heldOut: { metric: string; cells: number; within10: number };
  families: UkLocalFamily[];
}

export interface UkTargetGroup {
  source: string;
  label: string;
  publisher: string;
  /** The area the target covers: the source's own coverage, the registry's country scope, or the target's level. */
  geography: string;
  /** How the build constructs or scores the family, where the label alone would mislead. */
  note: string | null;
  units: ('gbp' | 'count')[];
  targets: number;
  zeroTargets: number;
  /** Within 10% at the end of calibration (build-time model). */
  within10: number | null;
  /** Within 10% when the pinned model runs the saved file. */
  pinnedWithin10: number | null;
  urls: string[];
  vintages: string[];
  value?: number;
}

export interface UkDataRelease {
  schemaVersion: number;
  release: {
    policyengine: string;
    modelVersion: string;
    dataPackage: string;
    dataVersion: string;
    releaseManifestRevision: string;
    defaultDataset: string;
    regionDatasets: string[];
    datasetSha256: string;
    builtAt: string;
    builtWithModelVersion: string;
    builtWithCoreVersion: string;
    dataGitSha: string;
  };
  base: { households: number; benefitUnits: number; people: number; weightedHouseholds: number; timePeriod: string; dataset: string };
  enhanced: {
    households: number;
    benefitUnits: number;
    people: number;
    weightedHouseholds: number;
    timePeriod: string;
    dataset: string;
    composition: { frs: number; spiCopies: number; capitalGainsCopies: number; cgtBandDonors: number; spiWeightShare: number };
    geography: {
      outputAreaDrawsPerHousehold: number;
      householdsWithArea: number;
      householdsWithoutArea: number;
      regionsWithoutArea: string[];
      constituenciesWithHouseholds: number;
      householdsPerConstituency: { min: number; median: number; max: number };
    };
  };
  weightMatrices: {
    constituency: { areas: number; households: number; year: string };
    localAuthority: { areas: number; households: number; year: string };
    columnSumPerSavedWeight: number;
  };
  calibration: {
    epoch: number;
    nationalTargets: number;
    nationalZeroTargets: number;
    nationalWithin10: number;
    nationalWithin5: number;
    /** National targets with no figure for the calibration year, which take an earlier year's. */
    targetsWithoutYearValue: number;
    nationalTargetsByArea: Record<string, number>;
    constituency: UkLocalCalibration;
    localAuthority: UkLocalCalibration;
    nationalGroups: UkTargetGroup[];
  };
  /** The saved file run by the pinned model, scored on the target values calibration fitted. */
  validation: {
    modelVersion: string;
    coreVersion: string;
    year: number;
    people: number;
    households: number;
    targets: number;
    zeroTargets: number;
    within10: number;
    within5: number;
    /** Targets whose value the pinned run's rebuild of the targets changes. */
    revisedTargets: string[];
  };
}

/** One national target, scored on the saved file by the pinned model against the value calibration fitted. */
export interface UkTargetCheck {
  id: string;
  group: string;
  unit: 'gbp' | 'count';
  target: number;
  estimate: number;
  calibrationEstimate: number;
}

export const ukRelease = release as UkDataRelease;

/** 16288 -> "16,288" */
export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** 0.998462 -> "99.8%"; a share with nothing to score -> "–" */
export const fmtPct = (share: number | null) => (share === null ? '–' : `${(share * 100).toFixed(1)}%`);

/** 28972433 -> "29.0 million" */
export const fmtMillions = (n: number) => `${(n / 1e6).toFixed(1)} million`;

/** "2026-10-07T17:31:53Z" -> "7 October 2026" */
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** £ amounts in the UK style: £331.4bn, £494m, £9,540. */
export function fmtGbp(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `£${(n / 1e12).toFixed(2)}tn`;
  if (abs >= 1e9) return `£${(n / 1e9).toFixed(1)}bn`;
  if (abs >= 1e6) return `£${(n / 1e6).toFixed(0)}m`;
  return `£${fmtInt(n)}`;
}

/** A target value in its unit. */
export const fmtTarget = (value: number, unit: 'gbp' | 'count') =>
  unit === 'gbp' ? fmtGbp(value) : fmtInt(value);

const uk = ukRelease;
const geo = uk.enhanced.geography;

/** Facts the UK pages state, each derived from the release summary. */
export const ukFacts = {
  pin: `policyengine.py ${uk.release.policyengine}`,
  data: `${uk.release.dataPackage} ${uk.release.dataVersion}`,
  builtOn: fmtDate(uk.release.builtAt),
  baseHouseholds: fmtInt(uk.base.households),
  basePeople: fmtInt(uk.base.people),
  households: fmtInt(uk.enhanced.households),
  people: fmtInt(uk.enhanced.people),
  constituencies: fmtInt(uk.weightMatrices.constituency.areas),
  localAuthorities: fmtInt(uk.weightMatrices.localAuthority.areas),
  nationalTargets: fmtInt(uk.calibration.nationalTargets),
  /** What the national targets describe: the UK, Great Britain, its nations and its regions. */
  nationalScope: 'the UK, Great Britain, its nations and its regions',
  niHouseholds: fmtInt(geo.householdsWithoutArea),
  gbConstituencies: fmtInt(geo.constituenciesWithHouseholds),
};
