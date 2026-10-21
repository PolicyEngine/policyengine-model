/**
 * Snapshot the default-branch program registries and source file trees.
 * Run: node scripts/fetch-metadata.js (also called by `bun run build`).
 * Fetch failures are warnings: the app can fall back to API metadata.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import yaml from 'js-yaml';
import { extractVariableModules } from './variable-modules.js';

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

/** List every file in one directory of the country package at the resolved commit. */
async function fetchPackageSubtree(country, source, directory, fetchImpl) {
  const treeRoot = `https://api.github.com/repos/${source.repo}/git/trees`;
  const root = await (await request(`${treeRoot}/${source.commit}`, fetchImpl)).json();
  const packageTree = root.tree?.find(entry => entry.path === `policyengine_${country}`);
  if (!packageTree?.sha) throw new Error('Package directory missing from repository tree');

  const packageFiles = await (await request(`${treeRoot}/${packageTree.sha}`, fetchImpl)).json();
  const subtree = packageFiles.tree?.find(entry => entry.path === directory);
  if (!subtree?.sha) throw new Error(`${directory} directory missing from repository tree`);

  const files = await (await request(`${treeRoot}/${subtree.sha}?recursive=1`, fetchImpl)).json();
  if (files.truncated) throw new Error(`GitHub returned a truncated ${directory} tree`);
  if (!Array.isArray(files.tree)) throw new Error(`GitHub did not return a ${directory} tree`);
  return files.tree.filter(entry => entry.type === 'blob').map(entry => entry.path);
}

/** Fetch only the parameter subtree, using the same resolved commit as coverage. */
export async function fetchParameterYamlPaths(country, source, fetchImpl = globalThis.fetch) {
  const paths = await fetchPackageSubtree(country, source, 'parameters', fetchImpl);
  return paths.filter(path => path.endsWith('.yaml') && !path.startsWith('calibration/'));
}

/**
 * Variable module files at the same commit, e.g. `gov/hmrc/income_tax/income_tax.py`.
 * The UK metadata API serves no `moduleName`, so the explorer maps variable names to
 * these files to group variables by department and link their source.
 */
export async function fetchVariableModulePaths(country, source, fetchImpl = globalThis.fetch) {
  const paths = await fetchPackageSubtree(country, source, 'variables', fetchImpl);
  return paths.filter(path => path.endsWith('.py') && !path.endsWith('__init__.py'));
}

/** Map UK Variable classes from the very same commit as the file tree. */
export async function fetchVariableTreeSnapshot(country, source, {
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  if (country === 'uk') {
    try {
      const response = await request(`https://codeload.github.com/${source.repo}/tar.gz/${source.commit}`, fetchImpl);
      const tar = gunzipSync(Buffer.from(await response.arrayBuffer()));
      return { source, ...extractVariableModules(country, tar) };
    } catch (error) {
      logger.warn(`  ${country}: class-to-module map unavailable, using file tree — ${error.message}`);
    }
  }
  return { source, paths: await fetchVariableModulePaths(country, source, fetchImpl) };
}

/** The country package version the production API serves. */
export async function fetchApiModelVersion(country, fetchImpl = globalThis.fetch) {
  const metadata = await (await request(`https://api.policyengine.org/${country}/metadata`, fetchImpl)).json();
  const version = (metadata.result ?? metadata).version;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('production API returned no package version');
  }
  return version;
}

/** The commit a release tag names, following an annotated tag to its commit. */
export async function resolveTagCommit(repo, tag, fetchImpl = globalThis.fetch) {
  const ref = await (await request(`https://api.github.com/repos/${repo}/git/ref/tags/${tag}`, fetchImpl)).json();
  let target = ref.object;
  if (target?.type === 'tag') {
    target = (await (await request(`https://api.github.com/repos/${repo}/git/tags/${target.sha}`, fetchImpl)).json()).object;
  }
  if (target?.type !== 'commit' || !/^[0-9a-f]{40}$/.test(target.sha ?? '')) {
    throw new Error(`tag ${tag} does not resolve to a commit`);
  }
  return target.sha;
}

/**
 * The class-to-module map for the package release the production API serves.
 * The explorer's variables come from that API, so the map is taken from the
 * release with the same version, not from the default branch, and the browser
 * applies it only when the versions still match.
 */
export async function fetchVariableModuleSnapshot(country, repo, fetchImpl = globalThis.fetch) {
  const version = await fetchApiModelVersion(country, fetchImpl);
  const commit = await resolveTagCommit(repo, version, fetchImpl);
  const response = await request(`https://codeload.github.com/${repo}/tar.gz/${commit}`, fetchImpl);
  const { modules } = extractVariableModules(country, gunzipSync(Buffer.from(await response.arrayBuffer())));
  return { source: { repo, version, commit }, modules };
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
    const parameterTreePath = join(outputDir, `param-tree-${country}.json`);
    const variableTreePath = join(outputDir, `variable-tree-${country}.json`);
    const variableModulesPath = join(outputDir, `variable-modules-${country}.json`);
    let source;
    try {
      // Clear every snapshot before resolving HEAD, including when resolution fails.
      for (const path of [snapshotPath, parameterTreePath, variableTreePath, variableModulesPath]) {
        rmSync(path, { force: true });
      }
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
          writeFileSync(parameterTreePath, JSON.stringify({ source, paths }));
          logger.log(`  ${country}: wrote ${parameterTreePath} (${paths.length} files)`);
        } catch (error) {
          logger.warn(`  ${country}: parameter tree skipped — ${error.message}`);
        }
      })(),
      (async () => {
        try {
          const tree = await fetchVariableTreeSnapshot(country, source, { fetchImpl, logger });
          writeFileSync(variableTreePath, JSON.stringify(tree));
          logger.log(`  ${country}: wrote ${variableTreePath} (${tree.paths.length} files)`);
        } catch (error) {
          logger.warn(`  ${country}: variable tree skipped — ${error.message}`);
        }
      })(),
      (async () => {
        // The UK API serves no module names; the US API does.
        if (country !== 'uk') return;
        try {
          const snapshot = await fetchVariableModuleSnapshot(country, source.repo, fetchImpl);
          writeFileSync(variableModulesPath, JSON.stringify(snapshot));
          logger.log(`  ${country}: wrote ${variableModulesPath} (${Object.keys(snapshot.modules).length} classes, ${snapshot.source.version})`);
        } catch (error) {
          logger.warn(`  ${country}: variable module map skipped — ${error.message}`);
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
