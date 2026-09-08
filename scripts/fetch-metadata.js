/**
 * Snapshot the default-branch program registries and parameter YAML file trees.
 * Run: node scripts/fetch-metadata.js (also called by `bun run build`).
 * Fetch failures are warnings: the app can fall back to API metadata.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const REPO_MAP = {
  us: 'policyengine-us',
  uk: 'policyengine-uk',
};

async function request(url, fetchImpl) {
  const headers = { 'User-Agent': 'policyengine-model-registry-snapshot' };
  if (url.startsWith('https://api.github.com/')) {
    headers.Accept = 'application/vnd.github+json';
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetchImpl(url, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response;
}

/** Resolve a repository's actual default branch, then pin all files to its HEAD. */
export async function resolveRepository(country, fetchImpl = globalThis.fetch) {
  const name = REPO_MAP[country];
  if (!name) throw new Error(`Unsupported country: ${country}`);
  const repo = `PolicyEngine/${name}`;
  const apiRoot = `https://api.github.com/repos/${repo}`;
  const info = await (await request(apiRoot, fetchImpl)).json();
  const branch = info.default_branch;
  if (typeof branch !== 'string' || !branch) {
    throw new Error(`${repo} did not return a default branch`);
  }

  const head = await (await request(
    `${apiRoot}/commits/${encodeURIComponent(branch)}`,
    fetchImpl,
  )).json();
  if (typeof head.sha !== 'string' || !/^[a-f0-9]{40}$/i.test(head.sha)) {
    throw new Error(`${repo} did not return a commit SHA`);
  }
  return { repo, branch, commit: head.sha };
}

/** Read the literal package version without adding a TOML dependency. */
export function readPackageVersion(pyproject) {
  const versions = new Map();
  let section = '';
  for (const line of pyproject.split(/\r?\n/)) {
    const heading = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
    if (heading) section = heading[1].trim();
    if (section !== 'project' && section !== 'tool.poetry') continue;
    const version = line.match(/^\s*version\s*=\s*(["'])([^"']+)\1\s*(?:#.*)?$/);
    if (version) versions.set(section, version[2]);
  }
  const version = versions.get('project') ?? versions.get('tool.poetry');
  if (!version) throw new Error('pyproject.toml has no literal package version');
  return version;
}

/** Keep the raw registry shape; the browser uses the existing API transform. */
export function parseProgramsYaml(contents) {
  const registry = yaml.load(contents);
  if (!registry || !Array.isArray(registry.programs)) {
    throw new Error('programs.yaml must contain a programs array');
  }
  return registry.programs;
}

export async function fetchRegistrySnapshot(country, source, {
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  logger = console,
} = {}) {
  const rawRoot = `https://raw.githubusercontent.com/${source.repo}/${source.commit}`;
  const [registry, pyproject] = await Promise.all([
    request(`${rawRoot}/policyengine_${country}/programs.yaml`, fetchImpl)
      .then(response => response.text()),
    request(`${rawRoot}/pyproject.toml`, fetchImpl)
      .then(response => response.text()),
  ]);

  const snapshot = {
    source: { ...source, fetchedAt: now().toISOString() },
    version: readPackageVersion(pyproject),
    programs: parseProgramsYaml(registry),
  };

  // A production API outage must not prevent a fresh registry snapshot.
  try {
    const metadata = await (await request(
      `https://api.policyengine.org/${country}/metadata`,
      fetchImpl,
    )).json();
    const apiVersion = (metadata.result ?? metadata).version;
    if (typeof apiVersion === 'string' && apiVersion) snapshot.apiVersion = apiVersion;
    else logger.warn(`  ${country}: production API did not return a version`);
  } catch (error) {
    logger.warn(`  ${country}: could not read production API version — ${error.message}`);
  }
  return snapshot;
}

/** Fetch only the parameter subtree, using the same resolved commit as coverage. */
export async function fetchParameterYamlPaths(country, source, fetchImpl = globalThis.fetch) {
  const treeRoot = `https://api.github.com/repos/${source.repo}/git/trees`;
  const root = await (await request(`${treeRoot}/${source.commit}`, fetchImpl)).json();
  const packageTree = root.tree?.find(entry => entry.path === `policyengine_${country}`);
  if (!packageTree?.sha) throw new Error('Package directory missing from repository tree');

  const packageFiles = await (await request(`${treeRoot}/${packageTree.sha}`, fetchImpl)).json();
  const parameters = packageFiles.tree?.find(entry => entry.path === 'parameters');
  if (!parameters?.sha) throw new Error('Parameter directory missing from repository tree');

  const files = await (await request(`${treeRoot}/${parameters.sha}?recursive=1`, fetchImpl)).json();
  if (files.truncated) throw new Error('GitHub returned a truncated parameter tree');
  if (!Array.isArray(files.tree)) throw new Error('GitHub did not return a parameter tree');
  return files.tree
    .filter(entry => entry.type === 'blob'
      && entry.path.endsWith('.yaml')
      && !entry.path.startsWith('calibration/'))
    .map(entry => entry.path);
}

export async function fetchMetadataFiles({
  countries = ['us', 'uk'],
  outputDir = PUBLIC_DIR,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  logger = console,
} = {}) {
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (error) {
    logger.warn(`Could not create metadata output directory — ${error.message}`);
    return;
  }

  for (const country of countries) {
    const snapshotPath = join(outputDir, `programs-${country}.json`);
    let source;
    try {
      // A failed refresh must not leave a snapshot from an earlier build behind.
      rmSync(snapshotPath, { force: true });
      source = await resolveRepository(country, fetchImpl);
    } catch (error) {
      logger.warn(`  ${country}: could not resolve registry source — ${error.message}`);
      continue;
    }

    await Promise.all([
      (async () => {
        try {
          const snapshot = await fetchRegistrySnapshot(country, source, { fetchImpl, now, logger });
          writeFileSync(snapshotPath, JSON.stringify(snapshot));
          logger.log(`  ${country}: wrote ${snapshotPath} (${snapshot.programs.length} programs)`);
        } catch (error) {
          logger.warn(`  ${country}: registry snapshot skipped — ${error.message}`);
        }
      })(),
      (async () => {
        try {
          const paths = await fetchParameterYamlPaths(country, source, fetchImpl);
          const treePath = join(outputDir, `param-tree-${country}.json`);
          writeFileSync(treePath, JSON.stringify(paths));
          logger.log(`  ${country}: wrote ${treePath} (${paths.length} files)`);
        } catch (error) {
          logger.warn(`  ${country}: parameter tree skipped — ${error.message}`);
        }
      })(),
    ]);
  }
  logger.log('Done.');
}

// Importing helpers in offline tests must never start network requests.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchMetadataFiles().catch(error => console.warn(`Metadata refresh skipped — ${error.message}`));
}
