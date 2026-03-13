/**
 * Pre-fetches metadata from the PolicyEngine API and the GitHub repo file tree,
 * writing them to public/ so the app loads from CDN instead of hitting APIs at runtime.
 *
 * Run: node scripts/fetch-metadata.js
 * Called automatically during `bun run build`.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

const COUNTRIES = ['us', 'uk'];
const API_BASE = 'https://api.policyengine.org';

const REPO_MAP = {
  us: 'policyengine-us',
  uk: 'policyengine-uk',
};

async function fetchCountryMetadata(country) {
  const url = `${API_BASE}/${country}/metadata`;
  console.log(`Fetching ${country} metadata from ${url}...`);

  const start = Date.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${country}: API returned ${res.status}`);

  const data = await res.json();
  const result = data.result ?? data;
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  ${country}: fetched in ${elapsed}s`);

  return result;
}

/**
 * Fetch the list of .yaml files under parameters/ in the repo.
 * Uses `gh` CLI → Git Trees API (fetches only the parameters subtree).
 */
function fetchParameterYamlPaths(country) {
  const repo = REPO_MAP[country];
  const repoDir = repo.replace('-', '_');
  console.log(`  ${country}: fetching parameter file tree from ${repo}...`);

  try {
    // Get the SHA of policyengine_{country}/parameters/ subtree
    const topTree = execSync(
      `gh api repos/PolicyEngine/${repo}/git/trees/main -q '.tree[] | select(.path == "${repoDir}") | .sha'`,
      { encoding: 'utf-8' },
    ).trim();

    const paramsTree = execSync(
      `gh api "repos/PolicyEngine/${repo}/git/trees/${topTree}" -q '.tree[] | select(.path == "parameters") | .sha'`,
      { encoding: 'utf-8' },
    ).trim();

    // Fetch recursive tree of parameters/ and filter to .yaml files
    const output = execSync(
      `gh api "repos/PolicyEngine/${repo}/git/trees/${paramsTree}?recursive=1" --paginate -q '.tree[] | select(.type == "blob") | select(.path | endswith(".yaml")) | .path'`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
    );

    const paths = output.trim().split('\n')
      .filter(p => p && !p.startsWith('calibration/'));

    console.log(`  ${country}: found ${paths.length} parameter YAML files`);
    return paths;
  } catch (err) {
    console.error(`  ${country}: gh CLI failed — ${err.message}`);
    return null;
  }
}

async function main() {
  mkdirSync(PUBLIC_DIR, { recursive: true });

  for (const country of COUNTRIES) {
    try {
      const metadata = await fetchCountryMetadata(country);

      const outPath = join(PUBLIC_DIR, `metadata-${country}.json`);
      writeFileSync(outPath, JSON.stringify(metadata));

      const sizeMB = (Buffer.byteLength(JSON.stringify(metadata)) / 1024 / 1024).toFixed(1);
      console.log(`  ${country}: wrote ${outPath} (${sizeMB} MB)`);
    } catch (err) {
      console.error(`  ${country}: metadata FAILED — ${err.message}`);
    }

    // Fetch parameter YAML file tree for direct source links
    try {
      const yamlPaths = fetchParameterYamlPaths(country);
      if (yamlPaths) {
        const treePath = join(PUBLIC_DIR, `param-tree-${country}.json`);
        writeFileSync(treePath, JSON.stringify(yamlPaths));
        console.log(`  ${country}: wrote ${treePath} (${yamlPaths.length} files)`);
      }
    } catch (err) {
      console.error(`  ${country}: param tree FAILED — ${err.message}`);
    }
  }

  console.log('Done.');
}

main();
