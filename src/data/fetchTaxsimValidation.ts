import 'server-only';

/**
 * Loads the TAXSIM comparison summaries published by the policyengine-taxsim
 * dashboard (https://www.policyengine.org/us/taxsim/dashboard). These are the
 * JSON files the dashboard itself reads, written by a version of
 * `scripts/refresh_dashboard.py` in PolicyEngine/policyengine-taxsim (each
 * summary's metadata records which), so this page shows the dashboard's
 * numbers, up to an hour behind a refresh because of the cache below.
 */

// Keep in sync with AVAILABLE_YEARS in policyengine-taxsim
// dashboard/src/constants/index.js.
export const TAXSIM_VALIDATION_YEARS = [2021, 2022, 2023, 2024, 2025] as const;

export const TAXSIM_DASHBOARD_URL = 'https://www.policyengine.org/us/taxsim/dashboard';
export const TAXSIM_REPO_URL = 'https://github.com/PolicyEngine/policyengine-taxsim';
export const TAXSIM_MATCH_RULES_URL =
  'https://github.com/PolicyEngine/policyengine-taxsim/blob/main/scripts/refresh_dashboard.py';

// The summaries change only when the comparison is re-run, so an hour of
// caching keeps the page fast while picking up a refresh the same day.
const REVALIDATE_SECONDS = 3600;
// The results stream in behind a Suspense boundary, so a slow host delays
// only the table; the timeout bounds how long it can hold the request open.
const FETCH_TIMEOUT_MS = 5000;

export function taxsimSummaryUrl(year: number): string {
  return `https://www.policyengine.org/us/taxsim/data/${year}/summary_${year}.json`;
}

export interface TaxsimYearResult {
  year: number;
  /** Household records compared (`totalRecords`). */
  records: number;
  /** Share of records within ±$15 (`federalMatchPct`, `stateMatchPct`). */
  federalWithin15: number;
  stateWithin15: number;
  /** Share within 1% of gross income (`federalMatchPctRel`, `stateMatchPctRel`). */
  federalWithin1Pct: number;
  stateWithin1Pct: number;
  /** State tax within 1% of gross income with rebates netted out (`stateMatchPctRelNet`). */
  stateWithin1PctNetOfRebates: number | null;
  policyengineUsVersion: string | null;
  generatedAt: string | null;
  /**
   * States whose TAXSIM results come from an earlier TAXSIM build this year
   * (`metadata.taxsimFallback`), in the summary's order. Null when the summary
   * records no fallback; empty when it records one without readable states.
   */
  taxsimFallbackStates: string[] | null;
}

export interface TaxsimValidation {
  results: TaxsimYearResult[];
  failedYears: number[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function percent(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Mirrors the dashboard's fallback notice (DashboardContent.jsx): a summary
 * may record that some states' TAXSIM results used an earlier TAXSIM build.
 */
function fallbackStates(raw: unknown): string[] | null {
  if (!isRecord(raw) || raw.appliesToThisYear !== true) return null;
  const states = Array.isArray(raw.states) ? raw.states : [raw.state];
  return states.filter((s): s is string => typeof s === 'string' && /^[A-Z]{2}$/.test(s));
}

/**
 * Validates one summary file. Returns null when a field the page shows is
 * missing or out of range, so a malformed year is skipped rather than shown.
 */
export function parseTaxsimSummary(year: number, raw: unknown): TaxsimYearResult | null {
  if (!isRecord(raw)) return null;
  const records = raw.totalRecords;
  if (typeof records !== 'number' || !Number.isInteger(records) || records <= 0) return null;

  const federalWithin15 = percent(raw.federalMatchPct);
  const stateWithin15 = percent(raw.stateMatchPct);
  const federalWithin1Pct = percent(raw.federalMatchPctRel);
  const stateWithin1Pct = percent(raw.stateMatchPctRel);
  if (
    federalWithin15 === null ||
    stateWithin15 === null ||
    federalWithin1Pct === null ||
    stateWithin1Pct === null
  ) {
    return null;
  }
  // Summaries generated before the srebate column existed have no net metric.
  const netRaw = raw.stateMatchPctRelNet;
  const stateWithin1PctNetOfRebates = netRaw === undefined ? null : percent(netRaw);
  if (netRaw !== undefined && stateWithin1PctNetOfRebates === null) return null;

  const metadata = isRecord(raw.metadata) ? raw.metadata : {};

  return {
    year,
    records,
    federalWithin15,
    stateWithin15,
    federalWithin1Pct,
    stateWithin1Pct,
    stateWithin1PctNetOfRebates,
    policyengineUsVersion: text(metadata.policyengineUsVersion),
    generatedAt: text(metadata.generatedAt),
    taxsimFallbackStates: fallbackStates(metadata.taxsimFallback),
  };
}

async function fetchYear(
  year: number,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<TaxsimYearResult | null> {
  try {
    const response = await fetchImpl(taxsimSummaryUrl(year), {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(timeoutMs),
    } as RequestInit);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = parseTaxsimSummary(year, await response.json());
    if (!result) throw new Error('unexpected summary shape');
    return result;
  } catch (err) {
    console.warn(`TAXSIM summary for ${year} unavailable:`, err);
    return null;
  }
}

export async function fetchTaxsimValidation(
  fetchImpl: typeof fetch = fetch,
  { timeoutMs = FETCH_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<TaxsimValidation> {
  const loaded = await Promise.all(
    TAXSIM_VALIDATION_YEARS.map((year) => fetchYear(year, fetchImpl, timeoutMs)),
  );
  const results = loaded.filter((r): r is TaxsimYearResult => r !== null);
  return {
    results,
    failedYears: TAXSIM_VALIDATION_YEARS.filter((_, i) => loaded[i] === null),
  };
}
