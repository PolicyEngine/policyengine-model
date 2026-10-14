import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UkCoverageTracker from '../components/rules/UkCoverageTracker';
import { fetchProgramsWithSource, type ProgramsSource } from '../data/fetchPrograms';

vi.mock('../data/fetchPrograms', () => ({ fetchProgramsWithSource: vi.fn() }));

const source: Extract<ProgramsSource, { kind: 'snapshot' }> = {
  kind: 'snapshot',
  repo: 'PolicyEngine/policyengine-uk',
  branch: 'main',
  commit: 'abc123456789',
  fetchedAt: '2026-10-14T00:00:00.000Z',
  version: '2.126.12',
};
const parameterTree = { source, paths: ['gov/dwp/jsa/amount.yaml'] };
const variableTree = {
  source,
  paths: ['gov/dwp/jsa.py', 'gov/dwp/esa.py', 'gov/dwp/dla/dla.py'],
  modules: { jsa: 'gov.dwp.jsa', esa: 'gov.dwp.esa', dla: 'gov.dwp.dla.dla' },
};

async function showProgramme({
  variable = 'jsa',
  params = parameterTree,
  variables = variableTree,
  registrySource = source,
}: {
  variable?: string;
  params?: unknown;
  variables?: unknown;
  registrySource?: ProgramsSource;
} = {}) {
  vi.mocked(fetchProgramsWithSource).mockResolvedValue({
    source: registrySource,
    programs: [{
      id: 'programme', name: 'Test programme', fullName: 'Test programme',
      status: 'complete', variable, parameterPrefix: 'gov.dwp.jsa', githubLinks: {},
    }],
  });
  vi.mocked(fetch).mockImplementation(async (url) => {
    const tree = String(url).includes('param-tree') ? params : variables;
    if (tree instanceof Error) throw tree;
    return { ok: tree !== null, json: async () => tree } as Response;
  });
  await act(async () => { render(<UkCoverageTracker />); });
  fireEvent.click(screen.getByRole('button', { name: /Test programme/ }));
}

describe('UK coverage links use the registry snapshot', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it.each(['JSA', 'ESA', 'DLA'])('omits source and computation links for the absent class %s', async (variable) => {
    await showProgramme({ variable });
    expect(screen.getByRole('link', { name: 'Parameters' })).toHaveAttribute('href',
      `https://github.com/${source.repo}/tree/${source.commit}/policyengine_uk/parameters/gov/dwp/jsa`);
    expect(screen.queryByRole('link', { name: 'Source code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Computation tree' })).not.toBeInTheDocument();
  });

  it.each(['jsa', 'esa', 'dla'])('links the exact class %s in a matching snapshot', async (variable) => {
    await showProgramme({ variable });
    expect(screen.getByRole('link', { name: 'Computation tree' })).toHaveAttribute('href',
      `https://policyengine.github.io/flowchart/?variable=${variable}&country=UK`);
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute('href',
      `https://github.com/${source.repo}/blob/${source.commit}/policyengine_uk/variables/${variableTree.modules[variable as keyof typeof variableTree.modules].replace(/\./g, '/')}.py`);
  });

  it('uses the class map for a variable whose file has a different name', async () => {
    await showProgramme({
      variable: 'armed_forces_independence_payment',
      variables: {
        source, paths: ['gov/dwp/afip.py'],
        modules: { armed_forces_independence_payment: 'gov.dwp.afip' },
      },
    });
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute('href',
      `https://github.com/${source.repo}/blob/${source.commit}/policyengine_uk/variables/gov/dwp/afip.py`);
    expect(screen.getByRole('link', { name: 'Computation tree' })).toHaveAttribute('href',
      'https://policyengine.github.io/flowchart/?variable=armed_forces_independence_payment&country=UK');
  });

  it('does not infer a class from a file stem when a class map is present', async () => {
    await showProgramme({ variables: { ...variableTree, modules: { other_class: 'gov.dwp.jsa' } } });
    expect(screen.queryByRole('link', { name: 'Source code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Computation tree' })).not.toBeInTheDocument();
  });

  it('rejects a mapped module that is absent from the tree', async () => {
    await showProgramme({ variables: { ...variableTree, modules: { jsa: 'gov.dwp.absent' } } });
    expect(screen.queryByRole('link', { name: 'Source code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Computation tree' })).not.toBeInTheDocument();
  });

  it('supports the unique exact file stems in older versioned snapshots', async () => {
    await showProgramme({ variables: { source, paths: variableTree.paths } });
    expect(screen.getByRole('link', { name: 'Computation tree' })).toBeInTheDocument();
  });

  it('omits links for ambiguous file stems in older versioned snapshots', async () => {
    await showProgramme({ variables: { source, paths: ['gov/dwp/jsa.py', 'input/jsa.py'] } });
    expect(screen.queryByRole('link', { name: 'Source code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Computation tree' })).not.toBeInTheDocument();
  });

  it.each([
    { repo: source.repo, commit: 'older-commit' },
    { repo: 'PolicyEngine/policyengine-us', commit: source.commit },
  ])('rejects trees whose provenance differs: %j', async (treeSource) => {
    await showProgramme({
      params: { ...parameterTree, source: treeSource },
      variables: { ...variableTree, source: treeSource },
    });
    expect(screen.queryByRole('link', { name: 'Parameters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Source code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Computation tree' })).not.toBeInTheDocument();
  });

  it('rejects unversioned parameter and variable trees', async () => {
    await showProgramme({ params: parameterTree.paths, variables: { paths: variableTree.paths } });
    expect(screen.queryByRole('link', { name: 'Parameters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Source code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Computation tree' })).not.toBeInTheDocument();
  });

  it('rejects only the stale parameter tree while retaining verified variable links', async () => {
    await showProgramme({ params: { ...parameterTree, source: { ...source, commit: 'older-commit' } } });
    expect(screen.queryByRole('link', { name: 'Parameters' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Source code' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Computation tree' })).toBeInTheDocument();
  });

  it('rejects only the stale variable tree while retaining verified parameter links', async () => {
    await showProgramme({ variables: { ...variableTree, source: { ...source, commit: 'older-commit' } } });
    expect(screen.getByRole('link', { name: 'Parameters' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Source code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Computation tree' })).not.toBeInTheDocument();
  });

  it.each([null, new Error('Parameter refresh unavailable')])('retains variable links when the parameter tree is unavailable', async (params) => {
    await showProgramme({ params });
    expect(screen.queryByRole('link', { name: 'Parameters' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Source code' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Computation tree' })).toBeInTheDocument();
  });

  it.each([null, new Error('Variable refresh unavailable')])('retains parameter links when the variable tree is unavailable', async (variables) => {
    await showProgramme({ variables });
    expect(screen.getByRole('link', { name: 'Parameters' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Source code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Computation tree' })).not.toBeInTheDocument();
  });

  it('omits all verified links when both trees are unavailable', async () => {
    await showProgramme({ params: null, variables: new Error('Unavailable') });
    expect(screen.queryByRole('link', { name: 'Parameters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Source code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Computation tree' })).not.toBeInTheDocument();
  });

  it('does not use snapshot trees to verify an API registry against main', async () => {
    await showProgramme({ registrySource: { kind: 'api', repo: source.repo, apiVersion: '2.126.12' } });
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Parameters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Source code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Computation tree' })).not.toBeInTheDocument();
  });
});
