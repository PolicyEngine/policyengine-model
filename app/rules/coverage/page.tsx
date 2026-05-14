import CoverageMatrix, {
  type CoverageMatrixOverlay,
} from '../../../src/components/comparison/CoverageMatrix';
import { loadComparisonData } from '../../../src/data/comparisons';
import { fetchPrograms } from '../../../src/data/fetchPrograms';
import { filterSelectedModels } from '../../../src/components/comparison/filterModels';
import type { StateImplementation, Program } from '../../../src/types/Program';

const MAX_FORWARD_YEAR = new Date().getFullYear() + 5;

/**
 * Map a PolicyEngine API program id (e.g. `snap`, `section_8`) to its
 * comparison-data program id (e.g. `us-snap`, `us-section-8`). Comparison
 * ids are `<country>-<slug>` with hyphenated slugs; the API uses
 * underscores and no country prefix.
 */
function apiIdToComparisonId(apiId: string, country: 'us' | 'uk'): string {
  const slug = apiId.replace(/_/g, '-');
  // Special cases where the API id doesn't slug-translate directly to a
  // comparison id; populate as gaps appear.
  const overrides: Record<string, string> = {
    aca_ptc: `${country}-premium-tax-credit`,
    aca_subsidies: `${country}-premium-tax-credit`,
    federal_income_tax: `${country}-federal-income-tax`,
    payroll_taxes: `${country}-payroll-tax`,
    state_income_tax: `${country}-state-income-tax`,
  };
  if (overrides[apiId]) return overrides[apiId];
  return `${country}-${slug}`;
}

function parseYears(verified?: string): Set<number> {
  if (!verified) return new Set();
  const trimmed = verified.trim();
  const open = trimmed.match(/^(\d{4})\+$/);
  if (open) {
    const start = parseInt(open[1], 10);
    const set = new Set<number>();
    for (let y = start; y <= MAX_FORWARD_YEAR; y++) set.add(y);
    return set;
  }
  const range = trimmed.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (range) {
    const start = parseInt(range[1], 10);
    const end = parseInt(range[2], 10);
    const set = new Set<number>();
    for (let y = start; y <= end; y++) set.add(y);
    return set;
  }
  const single = trimmed.match(/^(\d{4})$/);
  if (single) return new Set([parseInt(single[1], 10)]);
  return new Set();
}

function buildOverlay(
  programs: Program[],
  country: 'us' | 'uk',
): CoverageMatrixOverlay {
  const stateImplementations = new Map<string, StateImplementation[]>();
  const verifiedYears = new Map<string, string>();
  const allYears = new Set<number>();

  for (const p of programs) {
    const cmpId = apiIdToComparisonId(p.id, country);
    if (p.stateImplementations && p.stateImplementations.length > 0) {
      stateImplementations.set(cmpId, p.stateImplementations);
    }
    if (p.verifiedYears) {
      verifiedYears.set(cmpId, p.verifiedYears);
      for (const y of parseYears(p.verifiedYears)) allYears.add(y);
    }
  }

  return {
    stateImplementations,
    verifiedYears,
    availableYears: Array.from(allYears).sort((a, b) => a - b),
  };
}

export default async function CoverageRoute({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; year?: string; models?: string }>;
}) {
  const sp = await searchParams;
  const country: 'us' | 'uk' = sp.country === 'uk' ? 'uk' : 'us';
  const selectedYear = sp.year ? parseInt(sp.year, 10) : undefined;

  const data = loadComparisonData();

  // Default to current-country PolicyEngine, but respect explicit
  // ?models= selection so users can opt into a cross-model view by
  // clicking pills in the selector.
  const selectedRaw =
    sp.models ??
    (country === 'uk' ? 'policyengine-uk' : 'policyengine-us');
  const filteredModels = filterSelectedModels(
    data.models,
    selectedRaw,
    undefined,
  );

  // Fetch PolicyEngine programs for state implementations + verified years.
  // Fall back to no overlay if the API is unreachable.
  let overlay: CoverageMatrixOverlay | undefined;
  try {
    const programs = await fetchPrograms(country);
    overlay = buildOverlay(programs, country);
  } catch (err) {
    console.warn('Coverage overlay fetch failed:', err);
  }

  return (
    <CoverageMatrix
      data={{ ...data, models: filteredModels }}
      allModels={data.models}
      overlay={overlay}
      selectedYear={selectedYear}
    />
  );
}
