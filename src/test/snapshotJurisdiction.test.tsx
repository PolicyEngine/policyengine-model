import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import CoverageTrackerPage from '../views/rules/CoverageTrackerPage';
import { ALL_STATES, getJurisdiction, getStateStatusForProgram } from '../data/programStatus';

const usSnapshot = JSON.parse(readFileSync(resolve(__dirname, '../../public/programs-us.json'), 'utf8'));

function response(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
}

describe('jurisdiction over the mounted US snapshot', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(usSnapshot)));
    window.history.replaceState({}, '', '/us/model/rules/coverage');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('partitions every program into exactly one jurisdiction', async () => {
    const { fetchProgramsWithSource } = await import('../data/fetchPrograms');
    const { programs } = await fetchProgramsWithSource();
    expect(programs.length).toBeGreaterThan(50);
    const federal = programs.filter((p) => getJurisdiction(p) === 'federal');
    const state = programs.filter((p) => getJurisdiction(p) === 'state');
    const local = programs.filter((p) => getJurisdiction(p) === 'local');
    expect(federal.length + state.length + local.length).toBe(programs.length);
    const ids = new Set([...federal, ...state, ...local].map((p) => p.id));
    expect(ids.size).toBe(programs.length);
    for (const id of ['ne_aabd', 'ny_ui', 'nj_unemployment_insurance', 'ok_ui', 'pa_uc']) {
      expect(state.map((p) => p.id)).toContain(id);
    }
    expect(federal.map((p) => p.id)).toContain('chapter_7_bankruptcy');
    expect(federal.map((p) => p.id)).toContain('head_start');
  });

  it('maps every local program to exactly one state', async () => {
    const { fetchProgramsWithSource } = await import('../data/fetchPrograms');
    const { programs } = await fetchProgramsWithSource();
    const local = programs.filter((p) => getJurisdiction(p) === 'local');
    expect(local.length).toBeGreaterThan(20);
    const unmapped: string[] = [];
    for (const p of local) {
      const states = ALL_STATES.filter((st) => getStateStatusForProgram(p, st) !== null);
      if (states.length !== 1) unmapped.push(`${p.id} (${p.coverage}) -> ${states.join(',') || 'none'}`);
    }
    expect(unmapped).toEqual([]);
    const stateOf = (id: string) => ALL_STATES.find((st) => getStateStatusForProgram(local.find((p) => p.id === id)!, st) !== null);
    expect(stateOf('ca_marin_general_relief')).toBe('CA');
    expect(stateOf('philadelphia_wage_tax')).toBe('PA');
    expect(stateOf('md_local_income_tax')).toBe('MD');
    expect(stateOf('in_county_income_tax')).toBe('IN');
    expect(stateOf('ky_jefferson_occupational_tax')).toBe('KY');
  });

  it('renders three sections whose counts add up to the program total without overlap', async () => {
    const { fetchProgramsWithSource } = await import('../data/fetchPrograms');
    const { programs } = await fetchProgramsWithSource();
    render(<CoverageTrackerPage country="us" />);
    const federal = await screen.findByText(/Federal programs \((\d+)\)/);
    const state = await screen.findByText(/State programs \((\d+)\)/);
    const local = await screen.findByText(/Local programs \((\d+)\)/);
    const count = (el: HTMLElement) => Number(el.textContent!.match(/\((\d+)\)/)![1]);
    expect(count(federal)).toBe(programs.filter((p) => getJurisdiction(p) === 'federal').length);
    expect(count(state)).toBe(programs.filter((p) => getJurisdiction(p) === 'state').length);
    expect(count(local)).toBe(programs.filter((p) => getJurisdiction(p) === 'local').length);
    expect(count(federal) + count(state) + count(local)).toBe(programs.length);
  });
});
