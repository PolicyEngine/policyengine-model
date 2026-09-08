import type { Program, CoverageStatus, StateImplementation } from '../types/Program';
import type { Country } from '../hooks/useCountry';
import { publicBasePrefixFromPath } from '../hooks/usePublicBasePrefix';

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
    status?: string;
    name?: string;
    full_name?: string;
    variable?: string;
    notes?: string;
  }>;
}

export type ProgramsSource =
  | {
      kind: 'snapshot';
      repo: string;
      branch: string;
      commit: string;
      fetchedAt: string;
      version: string;
      apiVersion?: string;
    }
  | { kind: 'api'; repo: string; apiVersion?: string }
  | { kind: 'fallback' };

export interface ProgramsWithSource {
  programs: Program[];
  source: ProgramsSource;
}

function mapStatus(status?: string): CoverageStatus {
  const statusMap: Record<string, CoverageStatus> = {
    complete: 'complete',
    partial: 'partial',
    in_progress: 'inProgress',
    not_started: 'notStarted',
  };
  return (status && statusMap[status]) || 'notStarted';
}

function buildGithubLinks(base: string, paramPrefix?: string): Program['githubLinks'] {
  if (!paramPrefix) return {};
  const path = paramPrefix.replace(/\./g, '/');
  return {
    parameters: `${base}/parameters/${path}`,
    variables: `${base}/variables/${path}`,
    tests: `${base}/tests/policy/baseline/${path}`,
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

function transformProgram(p: ApiProgram, githubBase: string): Program {
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
            githubBase,
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
    githubLinks: buildGithubLinks(githubBase, p.parameter_prefix),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function transformPrograms(value: unknown, githubBase: string): Program[] {
  if (!Array.isArray(value) || !value.every(p =>
    isRecord(p) && typeof p.id === 'string' && typeof p.name === 'string'
  )) {
    throw new Error('No valid programs array in response');
  }
  return value.map(p => transformProgram(p as ApiProgram, githubBase));
}

const cache = new Map<string, ProgramsWithSource>();

export async function fetchProgramsWithSource(country: Country = 'us'): Promise<ProgramsWithSource> {
  const prefix = typeof window === 'undefined'
    ? ''
    : publicBasePrefixFromPath(window.location.pathname);
  const cacheKey = `${prefix}:${country}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const repo = `PolicyEngine/policyengine-${country}`;
  const githubBase = (ref: string) =>
    `https://github.com/${repo}/tree/${ref}/policyengine_${country}`;

  try {
    const response = await fetch(`${prefix}/programs-${country}.json`);
    if (!response.ok) throw new Error(`Snapshot returned ${response.status}`);
    const snapshot: unknown = await response.json();
    if (!isRecord(snapshot) || !isRecord(snapshot.source)) {
      throw new Error('Snapshot has no source');
    }
    const { source, version } = snapshot;
    if (source.repo !== repo ||
      typeof source.branch !== 'string' || !source.branch ||
      typeof source.commit !== 'string' || !source.commit ||
      typeof source.fetchedAt !== 'string' || !Number.isFinite(Date.parse(source.fetchedAt)) ||
      typeof version !== 'string' || !version) {
      throw new Error('Snapshot has invalid provenance');
    }
    const result: ProgramsWithSource = {
      programs: transformPrograms(snapshot.programs, githubBase(source.commit)),
      source: {
        kind: 'snapshot', repo, branch: source.branch, commit: source.commit,
        fetchedAt: source.fetchedAt, version,
        apiVersion: typeof snapshot.apiVersion === 'string' ? snapshot.apiVersion : undefined,
      },
    };
    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn(`Failed to load ${country} program snapshot, trying API:`, err);
  }

  try {
    // Use the shared metadata fetch to avoid duplicate API calls
    const { fetchMetadataRaw } = await import('./fetchMetadata');
    const data = await fetchMetadataRaw(country);
    const result: ProgramsWithSource = {
      programs: transformPrograms(data.modelled_policies?.programs, githubBase('HEAD')),
      source: {
        kind: 'api', repo,
        apiVersion: typeof data.version === 'string' ? data.version : undefined,
      },
    };
    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Failed to fetch programs from API, using fallback:', err);
    // Fall back to hardcoded data
    const { programs } = await import('./programs');
    return { programs, source: { kind: 'fallback' } };
  }
}

/** Retain the programs-only interface used by the parameter and variable lists. */
export async function fetchPrograms(country: Country = 'us'): Promise<Program[]> {
  return (await fetchProgramsWithSource(country)).programs;
}
