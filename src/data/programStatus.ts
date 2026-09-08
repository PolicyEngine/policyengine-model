import type { CoverageStatus, Program } from '../types/Program';

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
  if (program.agency === 'State' || program.agency === 'Local') return program.status;
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
