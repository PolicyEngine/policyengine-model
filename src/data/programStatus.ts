import type { CoverageStatus, Program } from '../types/Program';

export const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM',
  'NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA',
  'WV','WI','WY',
];

const US_STATE_CODES = new Set(ALL_STATES);

/** Local programs keyed by the coverage string the registry uses, mapped to their state. */
export const LOCAL_TO_STATE: Record<string, string> = {
  'Chicago': 'IL', 'Dallas County': 'TX', 'Dallas County, TX': 'TX',
  'Harris County': 'TX', 'Harris County, TX': 'TX',
  'Los Angeles County': 'CA', 'Riverside County': 'CA',
  'Alameda County': 'CA', 'San Francisco': 'CA',
  'New York City': 'NY', 'Montgomery County': 'MD', 'Montgomery County, MD': 'MD',
};

/** Federal programs that apply in every state even when the registry lists no state entries. */
export const UNIVERSAL_STATE_PROGRAMS = new Set([
  'snap','tanf','medicaid','wic','state_income_tax','medicare',
  'aca_subsidies','payroll_taxes','school_meals','csfp','chip',
]);

export type Jurisdiction = 'federal' | 'state' | 'local';

/**
 * Where a program sits. The registry usually says agency State or Local, but some
 * state programs carry their real agency name (for example "New York State
 * Department of Labor" with coverage NY), so coverage decides when the agency
 * is not one of the two jurisdiction labels.
 */
export function getJurisdiction(program: Program): Jurisdiction {
  if (program.agency === 'State') return 'state';
  if (program.agency === 'Local') return 'local';
  const coverage = (program.coverage || '').trim();
  if (US_STATE_CODES.has(coverage)) return 'state';
  if (LOCAL_TO_STATE[coverage]) return 'local';
  return 'federal';
}

/** The status a program has in one state, or null when it does not apply there. */
export function getStateStatusForProgram(program: Program, stateCode: string): CoverageStatus | null {
  const jurisdiction = getJurisdiction(program);
  if (jurisdiction === 'state') {
    return (program.coverage || '').trim() === stateCode ? program.status : null;
  }
  if (jurisdiction === 'local') {
    return LOCAL_TO_STATE[(program.coverage || '').trim()] === stateCode ? program.status : null;
  }
  if (program.stateImplementations) {
    const impl = program.stateImplementations.find((s) => s.state === stateCode);
    if (impl) return impl.status;
    if (UNIVERSAL_STATE_PROGRAMS.has(program.id)) return program.status;
    return null;
  }
  if (program.hasStateVariation || UNIVERSAL_STATE_PROGRAMS.has(program.id)) {
    return program.status;
  }
  return null;
}

/** Lower rank means less coverage. Used to pick the more conservative of two statuses. */
const STATUS_RANK: Record<CoverageStatus, number> = {
  notStarted: 0,
  inProgress: 1,
  partial: 2,
  complete: 3,
};

function moreConservative(a: CoverageStatus, b: CoverageStatus): CoverageStatus {
  return STATUS_RANK[a] <= STATUS_RANK[b] ? a : b;
}

/**
 * Derive a program-level status from its per-state implementations.
 *
 * Any state still in progress marks the program in progress. Any partial state,
 * or a mix of complete and not-started states, marks it partial. Only a list
 * where every state is complete counts as complete.
 */
export function deriveStatusFromStates(program: Program): CoverageStatus | null {
  const impls = program.stateImplementations;
  if (!impls || impls.length === 0) return null;
  const statuses = new Set<CoverageStatus>(impls.map((impl) => impl.status));
  if (statuses.has('inProgress')) return 'inProgress';
  if (statuses.has('partial')) return 'partial';
  if (statuses.has('complete')) return statuses.has('notStarted') ? 'partial' : 'complete';
  return 'notStarted';
}

/**
 * The status shown for a program. Federal programs with state implementations
 * never claim more than either the registry's overall status or the per-state
 * list supports, so a program whose listed states are all complete still reads
 * partial when the registry says its coverage is partial (for example a program
 * implemented in two states), and a program the registry calls complete reads
 * partial when one of its states is not started.
 */
export function deriveProgramStatus(program: Program): CoverageStatus {
  if (getJurisdiction(program) !== 'federal') return program.status;
  const fromStates = deriveStatusFromStates(program);
  if (fromStates === null) return program.status;
  return moreConservative(program.status, fromStates);
}

export type StatusCounts = Record<CoverageStatus, number>;

export function computeStatusCount(programList: Program[]): StatusCounts {
  const counts: StatusCounts = { complete: 0, partial: 0, inProgress: 0, notStarted: 0 };
  programList.forEach((program) => {
    counts[deriveProgramStatus(program)]++;
  });
  return counts;
}
