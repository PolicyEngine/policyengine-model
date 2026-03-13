/**
 * Pre-fetches metadata from the PolicyEngine API and writes it to public/
 * so the app can load it from the CDN instead of hitting the API at runtime.
 *
 * Run: node scripts/fetch-metadata.js
 * Called automatically during `bun run build`.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

const COUNTRIES = ['us', 'uk'];
const API_BASE = 'https://api.policyengine.org';

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
      console.error(`  ${country}: FAILED — ${err.message}`);
      // Don't fail the build — the app falls back to the live API
    }
  }

  console.log('Done.');
}

main();
