import { describe, expect, it } from 'vitest';
import { computeStatusCount, deriveProgramStatus, deriveStatusFromStates } from '../data/programStatus';
import type { CoverageStatus, Program, StateImplementation } from '../types/Program';

function impl(state: string, status: CoverageStatus): StateImplementation {
  return { state, status, name: `${state} program` } as StateImplementation;
}

function program(overrides: Partial<Program>): Program {
  return {
    id: 'test',
    name: 'Test',
    category: 'Benefits',
    agency: 'HHS',
    status: 'complete',
    githubLinks: {},
    ...overrides,
  } as Program;
}

describe('deriveStatusFromStates', () => {
  it('returns null without state implementations', () => {
    expect(deriveStatusFromStates(program({}))).toBeNull();
    expect(deriveStatusFromStates(program({ stateImplementations: [] }))).toBeNull();
  });

  it('treats a mix of complete and not-started states as partial', () => {
    const tanf = program({ id: 'tanf', stateImplementations: [impl('CA', 'complete'), impl('NY', 'notStarted')] });
    expect(deriveStatusFromStates(tanf)).toBe('partial');
  });

  it('ranks in progress above partial above complete', () => {
    expect(deriveStatusFromStates(program({ stateImplementations: [impl('CA', 'complete'), impl('ND', 'inProgress'), impl('NY', 'partial')] }))).toBe('inProgress');
    expect(deriveStatusFromStates(program({ stateImplementations: [impl('CA', 'complete'), impl('NY', 'partial')] }))).toBe('partial');
    expect(deriveStatusFromStates(program({ stateImplementations: [impl('CA', 'complete'), impl('NY', 'complete')] }))).toBe('complete');
    expect(deriveStatusFromStates(program({ stateImplementations: [impl('CA', 'notStarted')] }))).toBe('notStarted');
  });
});

describe('deriveProgramStatus', () => {
  it('uses the registry status for state and local programs and for programs without state lists', () => {
    expect(deriveProgramStatus(program({ agency: 'State', status: 'inProgress' }))).toBe('inProgress');
    expect(deriveProgramStatus(program({ agency: 'Local', status: 'partial', stateImplementations: [impl('CA', 'complete')] }))).toBe('partial');
    expect(deriveProgramStatus(program({ status: 'notStarted' }))).toBe('notStarted');
  });

  it('never claims more than the registry status supports', () => {
    const headStart = program({ id: 'head_start', status: 'partial', stateImplementations: [impl('WA', 'complete'), impl('CA', 'complete')] });
    expect(deriveProgramStatus(headStart)).toBe('partial');
  });

  it('never claims more than the state list supports', () => {
    const tanf = program({ id: 'tanf', status: 'complete', stateImplementations: [impl('CA', 'complete'), impl('NY', 'notStarted')] });
    expect(deriveProgramStatus(tanf)).toBe('partial');
    const ccdf = program({ id: 'ccdf', status: 'complete', stateImplementations: [impl('CA', 'complete'), impl('ND', 'inProgress')] });
    expect(deriveProgramStatus(ccdf)).toBe('inProgress');
  });

  it('reads complete only when both sources agree', () => {
    const snap = program({ id: 'snap', status: 'complete', stateImplementations: [impl('CA', 'complete'), impl('NY', 'complete')] });
    expect(deriveProgramStatus(snap)).toBe('complete');
  });
});

describe('computeStatusCount', () => {
  it('counts each program once under its derived status', () => {
    const counts = computeStatusCount([
      program({ id: 'snap', stateImplementations: [impl('CA', 'complete')] }),
      program({ id: 'tanf', stateImplementations: [impl('CA', 'complete'), impl('NY', 'notStarted')] }),
      program({ id: 'ccdf', stateImplementations: [impl('CA', 'complete'), impl('ND', 'inProgress')] }),
      program({ id: 'ca_calworks', agency: 'State', status: 'notStarted' }),
      program({ id: 'eitc', status: 'complete' }),
    ]);
    expect(counts).toEqual({ complete: 2, partial: 1, inProgress: 1, notStarted: 1 });
  });
});
