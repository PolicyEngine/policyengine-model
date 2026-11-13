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

/** www.policyengine.org's dashboard API, which forwards metadata reads to the Public API. */
function dashboardMetadataUrl(country: string) {
  return `https://www.policyengine.org/api/metadata/${country}`;
}

/** The dashboard API's answer envelope around the Public API's metadata result. */
function dashboardAnswer(result: unknown) {
  return { status: 'ok', message: null, result };
}

function requestedUrls(fetchImpl: ReturnType<typeof mockFetch>) {
  return fetchImpl.mock.calls.map(([input]) => String(input));
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

  it('writes commit-pinned registry provenance and the API version read through the dashboard API', async () => {
    const rawRoot = `https://raw.githubusercontent.com/${source.repo}/${commit}`;
    const fetchImpl = mockFetch({
      [`${rawRoot}/policyengine_us/programs.yaml`]: registry,
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "1.823.4"',
      [dashboardMetadataUrl('us')]: dashboardAnswer({ version: '1.764.6' }),
    });

    await expect(fetchRegistrySnapshot('us', source, {
      fetchImpl, now: () => new Date('2026-09-08T12:00:00Z'), logger,
    })).resolves.toEqual({
      source: { ...source, fetchedAt: '2026-09-08T12:00:00.000Z' },
      version: '1.823.4', apiVersion: '1.764.6', programs: parseProgramsYaml(registry),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('names itself in the User-Agent of its dashboard API read', async () => {
    const rawRoot = `https://raw.githubusercontent.com/${source.repo}/${commit}`;
    const fetchImpl = mockFetch({
      [`${rawRoot}/policyengine_us/programs.yaml`]: registry,
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "1.823.4"',
      [dashboardMetadataUrl('us')]: dashboardAnswer({ version: '1.764.6' }),
    });
    await fetchRegistrySnapshot('us', source, { fetchImpl, logger });

    const dashboardRead = fetchImpl.mock.calls.find(
      ([input]) => String(input) === dashboardMetadataUrl('us'),
    );
    expect(dashboardRead).toBeDefined();
    expect(new Headers(dashboardRead?.[1]?.headers).get('user-agent'))
      .toBe('policyengine-model-registry-snapshot');
  });

  it('keeps a registry snapshot when the dashboard API cannot be reached', async () => {
    const rawRoot = `https://raw.githubusercontent.com/${source.repo}/${commit}`;
    const fetchImpl = mockFetch({
      [`${rawRoot}/policyengine_us/programs.yaml`]: registry,
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "1.823.4"',
      [dashboardMetadataUrl('us')]: new Error('Dashboard API offline'),
    });
    const snapshot = await fetchRegistrySnapshot('us', source, { fetchImpl, logger });
    expect(snapshot.version).toBe('1.823.4');
    expect(snapshot).not.toHaveProperty('apiVersion');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Dashboard API offline'));
  });

  it('keeps a registry snapshot when the dashboard API refuses the read', async () => {
    const rawRoot = `https://raw.githubusercontent.com/${source.repo}/${commit}`;
    const fetchImpl = mockFetch({
      [`${rawRoot}/policyengine_us/programs.yaml`]: registry,
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "1.823.4"',
      [dashboardMetadataUrl('us')]: new Response(
        JSON.stringify({ status: 'error', message: 'Too many requests from this address.', result: null }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      ),
    });
    const snapshot = await fetchRegistrySnapshot('us', source, { fetchImpl, logger });
    expect(snapshot.version).toBe('1.823.4');
    expect(snapshot).not.toHaveProperty('apiVersion');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Too many requests from this address.'),
    );
  });

  it('warns and leaves out the API version when the metadata has none', async () => {
    const rawRoot = `https://raw.githubusercontent.com/${source.repo}/${commit}`;
    const fetchImpl = mockFetch({
      [`${rawRoot}/policyengine_us/programs.yaml`]: registry,
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "1.823.4"',
      [dashboardMetadataUrl('us')]: dashboardAnswer({ variables: {} }),
    });
    const snapshot = await fetchRegistrySnapshot('us', source, { fetchImpl, logger });
    expect(snapshot).not.toHaveProperty('apiVersion');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('did not return a version'));
  });

  it('never sends a request to the Public API at api.policyengine.org', async () => {
    const outputDir = outputDirectory();
    const routes: Record<string, unknown> = {};
    for (const [country, name] of [['us', 'policyengine-us'], ['uk', 'policyengine-uk']]) {
      const repo = `PolicyEngine/${name}`;
      const rawRoot = `https://raw.githubusercontent.com/${repo}/${commit}`;
      const treeRoot = `https://api.github.com/repos/${repo}/git/trees`;
      Object.assign(routes, {
        [`https://api.github.com/repos/${repo}`]: { default_branch: 'main' },
        [`https://api.github.com/repos/${repo}/commits/main`]: { sha: commit },
        [`${treeRoot}/${commit}`]: { tree: [{ path: `policyengine_${country}`, sha: 'package-tree' }] },
        [`${treeRoot}/package-tree`]: { tree: [{ path: 'parameters', sha: 'parameter-tree' }] },
        [`${treeRoot}/parameter-tree?recursive=1`]: { tree: [{ type: 'blob', path: 'gov/rate.yaml' }] },
        [`${rawRoot}/policyengine_${country}/programs.yaml`]: registry,
        [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "1.823.4"',
        [dashboardMetadataUrl(country)]: dashboardAnswer({ version: '1.764.6' }),
      });
    }
    const fetchImpl = mockFetch(routes);
    await fetchMetadataFiles({ outputDir, fetchImpl, logger });

    expect(requestedUrls(fetchImpl).filter(url => url.startsWith('https://api.policyengine.org')))
      .toEqual([]);
    for (const country of ['us', 'uk']) {
      expect(JSON.parse(readFileSync(join(outputDir, `programs-${country}.json`), 'utf8')))
        .toMatchObject({ apiVersion: '1.764.6' });
    }
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
    // A tree from an earlier build must not stand in for the new snapshot's commit.
    const treePath = join(outputDir, 'param-tree-us.json');
    writeFileSync(treePath, '["stale.yaml"]');
    const rawRoot = `https://raw.githubusercontent.com/${source.repo}/${commit}`;
    const fetchImpl = mockFetch({
      'https://api.github.com/repos/PolicyEngine/policyengine-us': { default_branch: 'main' },
      'https://api.github.com/repos/PolicyEngine/policyengine-us/commits/main': { sha: commit },
      [`https://api.github.com/repos/${source.repo}/git/trees/${commit}`]: new Error('Tree unavailable'),
      [`${rawRoot}/policyengine_us/programs.yaml`]: registry,
      [`${rawRoot}/pyproject.toml`]: '[project]\nversion = "1.823.4"',
      [dashboardMetadataUrl('us')]: dashboardAnswer({ version: '1.764.6' }),
    });
    await fetchMetadataFiles({ countries: ['us'], outputDir, fetchImpl, logger });
    expect(JSON.parse(readFileSync(join(outputDir, 'programs-us.json'), 'utf8'))).toMatchObject({
      source, version: '1.823.4', apiVersion: '1.764.6',
    });
    expect(existsSync(treePath)).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Tree unavailable'));
  });

  it('removes an old snapshot and tree and skips a country when its default branch cannot be fetched', async () => {
    const outputDir = outputDirectory();
    const snapshotPath = join(outputDir, 'programs-us.json');
    const treePath = join(outputDir, 'param-tree-us.json');
    writeFileSync(snapshotPath, '{"stale":true}');
    writeFileSync(treePath, '["stale.yaml"]');
    const fetchImpl = mockFetch({
      'https://api.github.com/repos/PolicyEngine/policyengine-us': new Error('Network unavailable'),
    });
    await expect(fetchMetadataFiles({ countries: ['us'], outputDir, fetchImpl, logger }))
      .resolves.toBeUndefined();
    expect(existsSync(snapshotPath)).toBe(false);
    expect(existsSync(treePath)).toBe(false);
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
    expect(requestedUrls(fetchImpl)).not.toContain(dashboardMetadataUrl('uk'));
    expect(requestedUrls(fetchImpl)).not.toContain('https://api.policyengine.org/uk/metadata');
  });
});
