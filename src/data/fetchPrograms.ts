import type { Program, CoverageStatus, StateImplementation } from '../types/Program';

const GITHUB_BASE = 'https://github.com/PolicyEngine/policyengine-us/tree/master/policyengine_us';
const TESTS_BASE = 'https://github.com/PolicyEngine/policyengine-us/tree/master/policyengine_us/tests';

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
      ? (p.verified_years ? `${p.notes}. Years: ${p.verified_years}` : p.notes)
      : (p.verified_years ? `Years: ${p.verified_years}` : undefined),
    stateImplementations,
    githubLinks: buildGithubLinks(p.parameter_prefix),
  };
}

let cachedPrograms: Program[] | null = null;

export async function fetchPrograms(country: string = 'us'): Promise<Program[]> {
  if (cachedPrograms) return cachedPrograms;

  try {
    const res = await fetch(`https://api.policyengine.org/${country}/metadata`);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();
    const apiPrograms: ApiProgram[] = data.result?.modelled_policies?.programs;
    if (!apiPrograms || !Array.isArray(apiPrograms)) {
      throw new Error('No programs array in API response');
    }
    cachedPrograms = apiPrograms.map(transformProgram);
    return cachedPrograms;
  } catch (err) {
    console.warn('Failed to fetch programs from API, using fallback:', err);
    // Fall back to hardcoded data
    const { programs } = await import('./programs');
    return programs;
  }
}
