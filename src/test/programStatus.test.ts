import { describe, expect, it } from 'vitest';
import {
  computeStatusCount,
  deriveProgramStatus,
  deriveStatusFromStates,
  getJurisdiction,
  getStateStatusForProgram,
  localCoverageState,
} from '../data/programStatus';
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

describe('getJurisdiction', () => {
  it('reads State and Local agencies directly', () => {
    expect(getJurisdiction(program({ agency: 'State', coverage: 'CO' }))).toBe('state');
    expect(getJurisdiction(program({ agency: 'Local', coverage: 'Chicago' }))).toBe('local');
  });

  it('falls back to coverage when the agency is a named state or local body', () => {
    const neAabd = program({ id: 'ne_aabd', agency: 'DHHS' as Program['agency'], coverage: 'NE' });
    const nyUi = program({ id: 'ny_ui', agency: 'New York State Department of Labor' as Program['agency'], coverage: 'NY' });
    const local = program({ id: 'la_dcfs', agency: 'DCFS' as Program['agency'], coverage: 'Los Angeles County' });
    expect(getJurisdiction(neAabd)).toBe('state');
    expect(getJurisdiction(nyUi)).toBe('state');
    expect(getJurisdiction(local)).toBe('local');
  });

  it('treats everything else as federal', () => {
    expect(getJurisdiction(program({ agency: 'USDA', coverage: 'US' }))).toBe('federal');
    expect(getJurisdiction(program({ id: 'chapter_7_bankruptcy', agency: undefined, coverage: 'US' }))).toBe('federal');
    expect(getJurisdiction(program({ agency: 'HHS', coverage: 'US, WA' }))).toBe('federal');
  });
});

describe('getStateStatusForProgram', () => {
  it('places a state program with a named agency in its state only', () => {
    const neAabd = program({ id: 'ne_aabd', agency: 'DHHS' as Program['agency'], coverage: 'NE', status: 'partial' });
    expect(getStateStatusForProgram(neAabd, 'NE')).toBe('partial');
    expect(getStateStatusForProgram(neAabd, 'CA')).toBeNull();
    expect(deriveProgramStatus(neAabd)).toBe('partial');
    expect(computeStatusCount([neAabd])).toEqual({ complete: 0, partial: 1, inProgress: 0, notStarted: 0 });
  });

  it('maps local programs to their state', () => {
    const chicago = program({ id: 'chicago_x', agency: 'Local', coverage: 'Chicago', status: 'complete' });
    expect(getStateStatusForProgram(chicago, 'IL')).toBe('complete');
    expect(getStateStatusForProgram(chicago, 'NY')).toBeNull();
  });

  it('uses state entries, universal fallbacks, and state variation for federal programs', () => {
    const tanf = program({ id: 'tanf', status: 'complete', stateImplementations: [impl('CA', 'partial')] });
    expect(getStateStatusForProgram(tanf, 'CA')).toBe('partial');
    expect(getStateStatusForProgram(tanf, 'NY')).toBe('complete');
    const liheap = program({ id: 'liheap', status: 'partial', stateImplementations: [impl('OR', 'complete')] });
    expect(getStateStatusForProgram(liheap, 'OR')).toBe('complete');
    expect(getStateStatusForProgram(liheap, 'NY')).toBeNull();
    expect(getStateStatusForProgram(program({ id: 'eitc', status: 'complete', hasStateVariation: true }), 'TX')).toBe('complete');
    expect(getStateStatusForProgram(program({ id: 'medicare_part_d', status: 'complete' }), 'TX')).toBeNull();
  });
});

describe('localCoverageState', () => {
  it('resolves explicit places, trailing state codes, and embedded state names', () => {
    expect(localCoverageState('Marin County')).toBe('CA');
    expect(localCoverageState('San Francisco')).toBe('CA');
    expect(localCoverageState('Philadelphia, PA')).toBe('PA');
    expect(localCoverageState('Louisville/Jefferson County, KY')).toBe('KY');
    expect(localCoverageState('Maryland')).toBe('MD');
    expect(localCoverageState('All 92 Indiana counties')).toBe('IN');
    expect(localCoverageState('Somewhere in West Virginia')).toBe('WV');
  });

  it('returns null for unknown or empty coverage', () => {
    expect(localCoverageState('')).toBeNull();
    expect(localCoverageState(undefined)).toBeNull();
    expect(localCoverageState('Atlantis')).toBeNull();
  });
});

describe('getJurisdiction with local and multi-state coverage', () => {
  it('keeps federal programs with multi-state or US-prefixed coverage federal', () => {
    expect(getJurisdiction(program({ id: 'head_start', agency: 'HHS', coverage: 'US, WA' }))).toBe('federal');
    expect(getJurisdiction(program({ id: 'liheap', agency: 'HHS', coverage: 'OR, DC, Riverside County, MA, IL, TX' }))).toBe('federal');
    expect(getJurisdiction(program({ id: 'section_8', agency: 'HUD', coverage: undefined }))).toBe('federal');
  });

  it('resolves a local program by its coverage in every state lookup', () => {
    const philly = program({ id: 'philadelphia_wage_tax', agency: 'Local', coverage: 'Philadelphia, PA', status: 'complete' });
    expect(getStateStatusForProgram(philly, 'PA')).toBe('complete');
    expect(getStateStatusForProgram(philly, 'NJ')).toBeNull();
    const mdLocal = program({ id: 'md_local_income_tax', agency: 'Local', coverage: 'Maryland', status: 'complete' });
    expect(getStateStatusForProgram(mdLocal, 'MD')).toBe('complete');
  });
});
