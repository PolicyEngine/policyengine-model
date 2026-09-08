import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchMetadataFiles,
  fetchParameterYamlPaths,
  fetchRegistrySnapshot,
  parseProgramsYaml,
  readPackageVersion,
  resolveRepository,
} from '../../scripts/fetch-metadata.js';

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

  it('writes the snapshot even when fetching the independent parameter tree fails', async () => {
    const outputDir = outputDirectory();
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
  });

  it('removes an old snapshot and skips a country when its default branch cannot be fetched', async () => {
    const outputDir = outputDirectory();
    const snapshotPath = join(outputDir, 'programs-us.json');
    writeFileSync(snapshotPath, '{"stale":true}');
    const fetchImpl = mockFetch({
      'https://api.github.com/repos/PolicyEngine/policyengine-us': new Error('Network unavailable'),
    });
    await expect(fetchMetadataFiles({ countries: ['us'], outputDir, fetchImpl, logger }))
      .resolves.toBeUndefined();
    expect(existsSync(snapshotPath)).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Network unavailable'));
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
    expect(fetchImpl).not.toHaveBeenCalledWith(
      'https://api.policyengine.org/uk/metadata', expect.anything(),
    );
  });
});
