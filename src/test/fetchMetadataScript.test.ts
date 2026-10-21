import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchMetadataFiles,
  fetchParameterYamlPaths,
  fetchRegistrySnapshot,
  fetchVariableModulePaths,
  fetchVariableModuleSnapshot,
  parseProgramsYaml,
  readPackageVersion,
  resolveRepository,
} from '../../scripts/fetch-metadata.js';
import { variableArchive } from './fixtures/variableArchive';

const commit = 'a'.repeat(40);
const source = { repo: 'PolicyEngine/policyengine-us', branch: 'main', commit };
const logger = { ...console, log: vi.fn(), warn: vi.fn() };
const registry = `programs:
  - id: tanf
    name: TANF
    status: in_progress
    state_implementations:
      - state: CA
        status: complete
      - state: NY
`;
const tempDirectories: string[] = [];

function mockFetch(routes: Record<string, unknown>) {
  return vi.fn<typeof fetch>(async input => {
    const url = String(input);
    if (!(url in routes)) throw new Error(`Unexpected request: ${url}`);
    const value = routes[url];
    if (value instanceof Error) throw value;
    if (value instanceof Response) return value;
    return new Response(typeof value === 'string' ? value : JSON.stringify(value));
  });
}

function outputDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'policyengine-registry-test-'));
  tempDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) rmSync(directory, { recursive: true });
  vi.clearAllMocks();
});

describe('registry snapshot fetch script', () => {
  it('resolves each repository default branch and pins its commit', async () => {
    const fetchImpl = mockFetch({
      'https://api.github.com/repos/PolicyEngine/policyengine-us': { default_branch: 'main' },
      'https://api.github.com/repos/PolicyEngine/policyengine-us/commits/main': { sha: commit },
      'https://api.github.com/repos/PolicyEngine/policyengine-uk': { default_branch: 'release/current' },
      'https://api.github.com/repos/PolicyEngine/policyengine-uk/commits/release%2Fcurrent': { sha: commit },
    });

    await expect(resolveRepository('us', fetchImpl)).resolves.toEqual(source);
    await expect(resolveRepository('uk', fetchImpl)).resolves.toEqual({
      repo: 'PolicyEngine/policyengine-uk', branch: 'release/current', commit,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('preserves raw program fields and reads only the package version', () => {
    expect(parseProgramsYaml(registry)).toEqual([{
      id: 'tanf', name: 'TANF', status: 'in_progress',
      state_implementations: [{ state: 'CA', status: 'complete' }, { state: 'NY' }],
    }]);
    expect(readPackageVersion('[project]\nversion = "1.823.4" # model\n[tool.other]\nversion = "9"'))
      .toBe('1.823.4');
    expect(readPackageVersion("[tool.poetry]\nversion = '2.88.52'\n"))
      .toBe('2.88.52');
    expect(() => readPackageVersion('[tool.other]\nversion = "9"')).toThrow('package version');
    expect(() => parseProgramsYaml('programs: invalid')).toThrow('programs array');
  });

  it.each([
    { version: '1.764.6' },
    { result: { version: '1.764.6' } },
  ])('writes commit-pinned registry provenance and optional API version (%j)', async metadata => {
    const rawRoot = `https://raw.githubusercontent.com/${source.repo}/${commit}`;
    const fetchImpl = mockFetch({
      [`${rawRoot}/policyengine_us/programs.yaml`]: registry,
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "1.823.4"',
      'https://api.policyengine.org/us/metadata': metadata,
    });

    await expect(fetchRegistrySnapshot('us', source, {
      fetchImpl, now: () => new Date('2026-09-08T12:00:00Z'), logger,
    })).resolves.toEqual({
      source: { ...source, fetchedAt: '2026-09-08T12:00:00.000Z' },
      version: '1.823.4', apiVersion: '1.764.6', programs: parseProgramsYaml(registry),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('keeps a registry snapshot when the optional production API fails', async () => {
    const rawRoot = `https://raw.githubusercontent.com/${source.repo}/${commit}`;
    const fetchImpl = mockFetch({
      [`${rawRoot}/policyengine_us/programs.yaml`]: registry,
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "1.823.4"',
      'https://api.policyengine.org/us/metadata': new Error('API offline'),
    });
    const snapshot = await fetchRegistrySnapshot('us', source, { fetchImpl, logger });
    expect(snapshot.version).toBe('1.823.4');
    expect(snapshot).not.toHaveProperty('apiVersion');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('API offline'));
  });

  it('reads the parameter tree from the resolved commit and filters calibration files', async () => {
    const treeRoot = `https://api.github.com/repos/${source.repo}/git/trees`;
    const fetchImpl = mockFetch({
      [`${treeRoot}/${commit}`]: { tree: [{ path: 'policyengine_us', sha: 'package-tree' }] },
      [`${treeRoot}/package-tree`]: { tree: [{ path: 'parameters', sha: 'parameter-tree' }] },
      [`${treeRoot}/parameter-tree?recursive=1`]: { tree: [
        { type: 'blob', path: 'gov/hhs/tanf.yaml' },
        { type: 'blob', path: 'calibration/target.yaml' },
        { type: 'blob', path: 'README.md' },
        { type: 'tree', path: 'gov' },
      ] },
    });
    await expect(fetchParameterYamlPaths('us', source, fetchImpl))
      .resolves.toEqual(['gov/hhs/tanf.yaml']);
  });

  it('reads variable module files from the resolved commit, skipping package markers', async () => {
    const ukSource = { repo: 'PolicyEngine/policyengine-uk', branch: 'main', commit };
    const treeRoot = `https://api.github.com/repos/${ukSource.repo}/git/trees`;
    const fetchImpl = mockFetch({
      [`${treeRoot}/${commit}`]: { tree: [{ path: 'policyengine_uk', sha: 'package-tree' }] },
      [`${treeRoot}/package-tree`]: { tree: [
        { path: 'parameters', sha: 'parameter-tree' },
        { path: 'variables', sha: 'variable-tree' },
      ] },
      [`${treeRoot}/variable-tree?recursive=1`]: { tree: [
        { type: 'blob', path: 'gov/hmrc/income_tax/income_tax.py' },
        { type: 'blob', path: 'gov/hmrc/__init__.py' },
        { type: 'blob', path: 'gov/dwp/README.md' },
        { type: 'tree', path: 'gov' },
      ] },
    });
    await expect(fetchVariableModulePaths('uk', ukSource, fetchImpl))
      .resolves.toEqual(['gov/hmrc/income_tax/income_tax.py']);
  });

  it('refuses a truncated variable tree rather than writing a partial one', async () => {
    const ukSource = { repo: 'PolicyEngine/policyengine-uk', branch: 'main', commit };
    const treeRoot = `https://api.github.com/repos/${ukSource.repo}/git/trees`;
    const fetchImpl = mockFetch({
      [`${treeRoot}/${commit}`]: { tree: [{ path: 'policyengine_uk', sha: 'package-tree' }] },
      [`${treeRoot}/package-tree`]: { tree: [{ path: 'variables', sha: 'variable-tree' }] },
      [`${treeRoot}/variable-tree?recursive=1`]: { truncated: true, tree: [] },
    });
    await expect(fetchVariableModulePaths('uk', ukSource, fetchImpl)).rejects.toThrow('truncated');
  });

  it('writes the snapshot even when fetching the independent parameter tree fails', async () => {
    const outputDir = outputDirectory();
    const parameterTreePath = join(outputDir, 'param-tree-us.json');
    const variableTreePath = join(outputDir, 'variable-tree-us.json');
    writeFileSync(parameterTreePath, '["stale/parameter.yaml"]');
    writeFileSync(variableTreePath, '{"source":{"commit":"old"},"paths":["stale.py"]}');
    const rawRoot = `https://raw.githubusercontent.com/${source.repo}/${commit}`;
    const fetchImpl = mockFetch({
      'https://api.github.com/repos/PolicyEngine/policyengine-us': { default_branch: 'main' },
      'https://api.github.com/repos/PolicyEngine/policyengine-us/commits/main': { sha: commit },
      [`https://api.github.com/repos/${source.repo}/git/trees/${commit}`]: new Error('Tree unavailable'),
      [`${rawRoot}/policyengine_us/programs.yaml`]: registry,
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "1.823.4"',
      'https://api.policyengine.org/us/metadata': { version: '1.764.6' },
    });
    await fetchMetadataFiles({ countries: ['us'], outputDir, fetchImpl, logger });
    expect(JSON.parse(readFileSync(join(outputDir, 'programs-us.json'), 'utf8'))).toMatchObject({
      source, version: '1.823.4', apiVersion: '1.764.6',
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Tree unavailable'));
    expect(existsSync(parameterTreePath)).toBe(false);
    expect(existsSync(variableTreePath)).toBe(false);
  });

  it('removes all old snapshots when the default branch cannot be fetched', async () => {
    const outputDir = outputDirectory();
    const snapshotPaths = ['programs-us.json', 'param-tree-us.json', 'variable-tree-us.json']
      .map(name => join(outputDir, name));
    for (const path of snapshotPaths) writeFileSync(path, '{"stale":true}');
    const fetchImpl = mockFetch({
      'https://api.github.com/repos/PolicyEngine/policyengine-us': new Error('Network unavailable'),
    });
    await expect(fetchMetadataFiles({ countries: ['us'], outputDir, fetchImpl, logger }))
      .resolves.toBeUndefined();
    for (const path of snapshotPaths) expect(existsSync(path)).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Network unavailable'));
  });

  it('records the same source commit in the registry and both source trees', async () => {
    const outputDir = outputDirectory();
    const rawRoot = `https://raw.githubusercontent.com/${source.repo}/${commit}`;
    const treeRoot = `https://api.github.com/repos/${source.repo}/git/trees`;
    const fetchImpl = mockFetch({
      'https://api.github.com/repos/PolicyEngine/policyengine-us': { default_branch: 'main' },
      'https://api.github.com/repos/PolicyEngine/policyengine-us/commits/main': { sha: commit },
      [`${rawRoot}/policyengine_us/programs.yaml`]: registry,
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "1.823.4"',
      'https://api.policyengine.org/us/metadata': { version: '1.764.6' },
      [`${treeRoot}/${commit}`]: { tree: [{ path: 'policyengine_us', sha: 'package-tree' }] },
      [`${treeRoot}/package-tree`]: { tree: [
        { path: 'parameters', sha: 'parameter-tree' },
        { path: 'variables', sha: 'variable-tree' },
      ] },
      [`${treeRoot}/parameter-tree?recursive=1`]: { tree: [{ type: 'blob', path: 'gov/hhs/tanf.yaml' }] },
      [`${treeRoot}/variable-tree?recursive=1`]: { tree: [{ type: 'blob', path: 'gov/hhs/tanf.py' }] },
    });
    await fetchMetadataFiles({ countries: ['us'], outputDir, fetchImpl, logger });
    for (const name of ['programs-us.json', 'param-tree-us.json', 'variable-tree-us.json']) {
      expect(JSON.parse(readFileSync(join(outputDir, name), 'utf8')).source).toMatchObject(source);
    }
    expect(JSON.parse(readFileSync(join(outputDir, 'param-tree-us.json'), 'utf8')))
      .toEqual({ source, paths: ['gov/hhs/tanf.yaml'] });
  });

  it('writes the exact UK class map into the variable tree JSON at the registry commit', async () => {
    const outputDir = outputDirectory();
    const ukSource = { ...source, repo: 'PolicyEngine/policyengine-uk' };
    const rawRoot = `https://raw.githubusercontent.com/${ukSource.repo}/${commit}`;
    const tar = variableArchive([{
      path: 'repo/policyengine_uk/variables/gov/dwp/afip.py',
      contents: 'class armed_forces_independence_payment(Variable):\n    pass\n',
    }]);
    const fetchImpl = mockFetch({
      'https://api.github.com/repos/PolicyEngine/policyengine-uk': { default_branch: 'main' },
      'https://api.github.com/repos/PolicyEngine/policyengine-uk/commits/main': { sha: commit },
      [`${rawRoot}/policyengine_uk/programs.yaml`]: registry,
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "2.126.12"',
      'https://api.policyengine.org/uk/metadata': { version: '2.126.12' },
      [`https://api.github.com/repos/${ukSource.repo}/git/trees/${commit}`]: new Error('Parameter tree unavailable'),
      [`https://codeload.github.com/${ukSource.repo}/tar.gz/${commit}`]: new Response(gzipSync(tar)),
    });
    await fetchMetadataFiles({ countries: ['uk'], outputDir, fetchImpl, logger });
    expect(JSON.parse(readFileSync(join(outputDir, 'variable-tree-uk.json'), 'utf8'))).toEqual({
      source: ukSource,
      paths: ['gov/dwp/afip.py'],
      modules: { armed_forces_independence_payment: 'gov.dwp.afip' },
    });
    expect(JSON.parse(readFileSync(join(outputDir, 'programs-uk.json'), 'utf8')).source).toMatchObject(ukSource);
  });

  it('skips a missing UK registry gracefully, removing any previous snapshot', async () => {
    const outputDir = outputDirectory();
    const snapshotPath = join(outputDir, 'programs-uk.json');
    writeFileSync(snapshotPath, '{"stale":true}');
    const rawRoot = `https://raw.githubusercontent.com/PolicyEngine/policyengine-uk/${commit}`;
    const fetchImpl = mockFetch({
      'https://api.github.com/repos/PolicyEngine/policyengine-uk': { default_branch: 'master' },
      'https://api.github.com/repos/PolicyEngine/policyengine-uk/commits/master': { sha: commit },
      [`https://api.github.com/repos/PolicyEngine/policyengine-uk/git/trees/${commit}`]: new Error('Tree unavailable'),
      [`${rawRoot}/policyengine_uk/programs.yaml`]: new Response('Not found', { status: 404 }),
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "2.88.52"',
    });
    await expect(fetchMetadataFiles({ countries: ['uk'], outputDir, fetchImpl, logger }))
      .resolves.toBeUndefined();
    expect(existsSync(snapshotPath)).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('registry snapshot skipped'));
    // The module map is independent of the registry; with no reachable API or
    // tag it is skipped, and no earlier map survives.
    expect(existsSync(join(outputDir, 'variable-modules-uk.json'))).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('variable module map skipped'));
  });

  it('builds the UK module map from the release the API serves, recording its provenance', async () => {
    const tagCommit = 'b'.repeat(40);
    const archive = gzipSync(variableArchive([
      { path: 'policyengine-uk-x/policyengine_uk/variables/gov/dwp/afip.py', contents: 'class armed_forces_independence_payment(Variable):\n    pass\n' },
    ]));
    const fetchImpl = mockFetch({
      'https://api.policyengine.org/uk/metadata': { result: { version: '2.130.1' } },
      'https://api.github.com/repos/PolicyEngine/policyengine-uk/git/ref/tags/2.130.1': { object: { type: 'tag', sha: 'tagobject' } },
      'https://api.github.com/repos/PolicyEngine/policyengine-uk/git/tags/tagobject': { object: { type: 'commit', sha: tagCommit } },
      [`https://codeload.github.com/PolicyEngine/policyengine-uk/tar.gz/${tagCommit}`]: new Response(archive),
    });
    const snapshot = await fetchVariableModuleSnapshot('uk', 'PolicyEngine/policyengine-uk', fetchImpl);
    expect(snapshot).toEqual({
      source: { repo: 'PolicyEngine/policyengine-uk', version: '2.130.1', commit: tagCommit },
      modules: { armed_forces_independence_payment: 'gov.dwp.afip' },
    });
  });

  it('refuses a module map when the API reports no version or the tag names no commit', async () => {
    await expect(fetchVariableModuleSnapshot('uk', 'PolicyEngine/policyengine-uk', mockFetch({
      'https://api.policyengine.org/uk/metadata': { result: {} },
    }))).rejects.toThrow('no package version');
    await expect(fetchVariableModuleSnapshot('uk', 'PolicyEngine/policyengine-uk', mockFetch({
      'https://api.policyengine.org/uk/metadata': { result: { version: '2.130.1' } },
      'https://api.github.com/repos/PolicyEngine/policyengine-uk/git/ref/tags/2.130.1': { object: { type: 'tree', sha: 'x' } },
    }))).rejects.toThrow('does not resolve to a commit');
  });
});
