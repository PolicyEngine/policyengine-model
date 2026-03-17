import type { Program, CoverageStatus, StateImplementation } from '../types/Program';
import type { Country } from '../hooks/useCountry';

const GITHUB_BASE = 'https://github.com/PolicyEngine/policyengine-us/tree/main/policyengine_us';
const TESTS_BASE = 'https://github.com/PolicyEngine/policyengine-us/tree/main/policyengine_us/tests';

interface ApiProgram {
  id: string;
  name: string;
  full_name?: string;
  category?: string;
  agency?: string;
  status: string;
  coverage?: string;
  has_state_variation?: boolean;
  variable?: string;
  parameter_prefix?: string;
  verified_years?: string;
  verified_start_year?: number;
  verified_end_year?: number;
  notes?: string;
  state_implementations?: Array<{
    state: string;
    status: string;
    name?: string;
    full_name?: string;
    variable?: string;
    notes?: string;
  }>;
}

function mapStatus(status: string): CoverageStatus {
  const statusMap: Record<string, CoverageStatus> = {
    complete: 'complete',
    partial: 'partial',
    in_progress: 'inProgress',
    not_started: 'notStarted',
  };
  return statusMap[status] || 'notStarted';
}

function buildGithubLinks(paramPrefix?: string): Program['githubLinks'] {
  if (!paramPrefix) return {};
  const path = paramPrefix.replace(/\./g, '/');
  return {
    parameters: `${GITHUB_BASE}/parameters/${path}`,
    variables: `${GITHUB_BASE}/variables/${path}`,
    tests: `${TESTS_BASE}/policy/baseline/${path}`,
  };
}

function buildVerifiedYears(p: ApiProgram): string | undefined {
  // New structured format: verified_start_year / verified_end_year
  if (p.verified_start_year != null) {
    if (p.verified_end_year != null) {
      return `${p.verified_start_year}-${p.verified_end_year}`;
    }
    return `${p.verified_start_year}+`;
  }
  // Legacy string format
  return p.verified_years;
}

function transformProgram(p: ApiProgram): Program {
  const stateImplementations: StateImplementation[] | undefined =
    p.state_implementations?.map(si => ({
      state: si.state,
      status: mapStatus(si.status),
      name: si.name,
      fullName: si.full_name,
      variable: si.variable,
      notes: si.notes,
      githubLinks: si.variable
        ? buildGithubLinks(
            `gov.states.${si.state.toLowerCase()}`
          )
        : {},
    }));

  const verifiedYears = buildVerifiedYears(p);

  return {
    id: p.id,
    name: p.name,
    fullName: p.full_name || p.name,
    agency: p.agency as Program['agency'],
    category: p.category,
    status: mapStatus(p.status),
    coverage: p.coverage,
    hasStateVariation: p.has_state_variation,
    variable: p.variable,
    notes: p.notes
      ? (verifiedYears ? `${p.notes}. Years: ${verifiedYears}` : p.notes)
      : (verifiedYears ? `Years: ${verifiedYears}` : undefined),
    verifiedYears,
    stateImplementations,
    githubLinks: buildGithubLinks(p.parameter_prefix),
  };
}

const cache = new Map<string, Program[]>();

export async function fetchPrograms(country: Country = 'us'): Promise<Program[]> {
  if (cache.has(country)) return cache.get(country)!;

  try {
    // Use the shared metadata fetch to avoid duplicate API calls
    const { fetchMetadataRaw } = await import('./fetchMetadata');
    const data = await fetchMetadataRaw(country);
    const apiPrograms: ApiProgram[] = data.modelled_policies?.programs;
    if (!apiPrograms || !Array.isArray(apiPrograms)) {
      throw new Error('No programs array in API response');
    }
    const result = apiPrograms.map(transformProgram);
    cache.set(country, result);
    return result;
  } catch (err) {
    console.warn('Failed to fetch programs from API, using fallback:', err);
    // Fall back to hardcoded data
    const { programs } = await import('./programs');
    return programs;
  }
}
