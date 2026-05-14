#!/usr/bin/env bun
/**
 * Citation verification — Tiers 1 and 2.
 *
 *  Tier 1: link liveness.
 *    For every `url` field in data/comparisons/*.yaml, issue a HEAD/GET
 *    request and report status. 200/301/302/303 = alive. 403 = bot-blocked
 *    (acceptable; URL is real, just gated). 404/410/5xx/network = dead.
 *
 *  Tier 2: quote verbatim.
 *    For every Source with both a `url` and a `quote`, fetch the page
 *    and check whether the quote substring appears in the response body.
 *    Skips bot-blocked domains.
 *
 * Exit codes:
 *    0 = all clear (only warnings if any).
 *    1 = at least one dead URL.
 *    2 = at least one quote that didn't match its source.
 *    Bit-mask combined: code 3 = both dead URLs AND quote mismatches.
 *
 * Usage:
 *    bun run scripts/check-citations.ts [--quotes] [--json out.json]
 *      --quotes     Run Tier 2 (slow; off by default).
 *      --json       Write results to JSON file in addition to stdout.
 *
 *  Designed to run as a nightly cron rather than every CI build; pinging
 *  ~700 URLs per PR is expensive and rate-limit-prone.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

// Use cwd rather than import.meta.dir so the file compiles under both Bun
// (which has import.meta.dir) and Node/Next.js TypeScript compilation
// (which doesn't). Script is invoked from the repo root via `bun run`.
const DATA_DIR = path.join(process.cwd(), 'data', 'comparisons');
const TIMEOUT_MS = 15000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; PolicyEngine-CitationChecker/1.0; ' +
  '+https://github.com/PolicyEngine/policyengine-model)';

// Domains that consistently return 403 to bots even though the URL is real.
// A 403 from these is treated as "alive but bot-blocked" — the human-
// readable label and link still work for a reader.
const BOT_BLOCKED_DOMAINS = new Set([
  'boreas.urban.org',
  'www.povertycenter.columbia.edu',
  'povertycenter.columbia.edu',
  'ifs.org.uk',
  'www.ifs.org.uk',
  'www.cbo.gov', // 403 to bots; real URLs
  'cbo.gov',
  'www.jct.gov',
  'jct.gov',
  'www.gao.gov',
  'gao.gov',
  'www.congress.gov',
  'congress.gov',
  'crsreports.congress.gov',
  'www.urban.org', // some pages 403 to bots
  'urban.org',
  'aspe.hhs.gov',
  'www.aspe.hhs.gov',
  'www.federalreserve.gov',
  'www.atlantafed.org',
  'web.archive.org',
]);

// Domains whose pages are JS-rendered or paywalled; Tier 2 quote checks
// against them will reliably fail to find the quote in the raw HTML.
// Skip Tier 2 for these but keep Tier 1 (URL liveness still meaningful).
const SKIP_TIER2_DOMAINS = new Set([
  'onlinelibrary.wiley.com', // paywalled
  'taxsim.nber.org', // JS form
  'ukdataservice.ac.uk', // JS
  ...BOT_BLOCKED_DOMAINS,
]);

interface Finding {
  file: string;
  url: string;
  context: string; // e.g. "models.yaml: policyengine-us sources[0]"
  kind: 'dead-url' | 'quote-mismatch' | 'timeout' | 'network-error';
  status?: number;
  detail?: string;
}

/* -------------------------- YAML traversal --------------------------- */

interface UrlSite {
  file: string;
  url: string;
  quote?: string;
  context: string;
}

function collectUrls(): UrlSite[] {
  const sites: UrlSite[] = [];
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.yaml'));
  for (const f of files) {
    const raw = readFileSync(path.join(DATA_DIR, f), 'utf-8');
    const parsed = yaml.load(raw) as Record<string, unknown>;
    walk(parsed, [f], sites, f);
  }
  return sites;
}

function walk(
  node: unknown,
  trail: string[],
  out: UrlSite[],
  file: string,
): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, [...trail, `[${i}]`], out, file));
    return;
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    // If this object has both a url field and looks like a source/artifact,
    // record the URL site (and any quote).
    if (typeof obj.url === 'string' && obj.url.startsWith('http')) {
      out.push({
        file,
        url: obj.url,
        quote: typeof obj.quote === 'string' ? obj.quote : undefined,
        context: trail.join(' '),
      });
    }
    for (const [k, v] of Object.entries(obj)) {
      walk(v, [...trail, k], out, file);
    }
  }
}

/* ---------------------------- Tier 1: liveness ----------------------- */

async function checkLiveness(site: UrlSite): Promise<Finding | null> {
  const u = new URL(site.url);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(site.url, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const status = res.status;
    if (status >= 200 && status < 400) return null; // alive
    if (status === 403 && BOT_BLOCKED_DOMAINS.has(u.host)) return null;
    if (status === 401) return null; // auth wall; URL is real
    if (status === 429) return null; // rate-limited; URL is real
    return {
      file: site.file,
      url: site.url,
      context: site.context,
      kind: 'dead-url',
      status,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      file: site.file,
      url: site.url,
      context: site.context,
      kind: msg.includes('abort') ? 'timeout' : 'network-error',
      detail: msg.slice(0, 200),
    };
  }
}

/* -------------------------- Tier 2: quotes --------------------------- */

function normalize(s: string): string {
  // Strip HTML tags, collapse whitespace, lowercase. Quotes in YAML often
  // wrap long sentences with newlines and indentation that don't match
  // the rendered source page; normalization gives best-effort matching.
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function checkQuote(site: UrlSite): Promise<Finding | null> {
  if (!site.quote) return null;
  const u = new URL(site.url);
  if (SKIP_TIER2_DOMAINS.has(u.host)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(site.url, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null; // liveness check will flag it
    const body = await res.text();
    const haystack = normalize(body);
    const needle = normalize(site.quote);
    // Take the first 80 chars of the normalized quote as a search anchor.
    // Full-string match is too brittle (encoding, line breaks, ellipses).
    const anchor = needle.slice(0, Math.min(80, needle.length));
    if (anchor.length < 20) return null; // too short to verify confidently
    if (haystack.includes(anchor)) return null;
    return {
      file: site.file,
      url: site.url,
      context: site.context,
      kind: 'quote-mismatch',
      detail: `anchor: "${site.quote.slice(0, 80)}…"`,
    };
  } catch {
    return null; // network error handled by Tier 1
  }
}

/* ---------------------------- Reporting ----------------------------- */

interface Report {
  startedAt: string;
  urlCount: number;
  quoteCount: number;
  deadUrls: Finding[];
  quoteMismatches: Finding[];
  timeouts: Finding[];
  durationMs: number;
}

function fmt(f: Finding): string {
  const status = f.status ? ` [${f.status}]` : '';
  return `  ${f.file} (${f.context})${status}\n    ${f.url}` +
    (f.detail ? `\n    ${f.detail}` : '');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const runQuotes = args.includes('--quotes');
  const jsonIdx = args.indexOf('--json');
  const jsonOut = jsonIdx >= 0 ? args[jsonIdx + 1] : undefined;

  const t0 = Date.now();
  const sites = collectUrls();
  // De-duplicate by URL (same URL can appear in many rows; only ping once).
  const unique = new Map<string, UrlSite>();
  for (const s of sites) {
    if (!unique.has(s.url)) unique.set(s.url, s);
  }
  const uniqueSites = Array.from(unique.values());
  const withQuote = sites.filter((s) => s.quote);

  console.log(
    `Checking ${uniqueSites.length} unique URLs (Tier 1)` +
      (runQuotes ? ` and ${withQuote.length} quoted sources (Tier 2)` : ''),
  );

  // Tier 1 — concurrent up to 8 in flight.
  const deadUrls: Finding[] = [];
  const timeouts: Finding[] = [];
  const CONCURRENCY = 8;
  for (let i = 0; i < uniqueSites.length; i += CONCURRENCY) {
    const batch = uniqueSites.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(checkLiveness));
    for (const r of results) {
      if (!r) continue;
      if (r.kind === 'dead-url') deadUrls.push(r);
      else timeouts.push(r);
    }
    process.stdout.write(`\r  Tier 1: ${Math.min(i + CONCURRENCY, uniqueSites.length)}/${uniqueSites.length}`);
  }
  process.stdout.write('\n');

  // Tier 2 (optional, slow).
  const quoteMismatches: Finding[] = [];
  if (runQuotes) {
    for (let i = 0; i < withQuote.length; i += CONCURRENCY) {
      const batch = withQuote.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(checkQuote));
      for (const r of results) if (r) quoteMismatches.push(r);
      process.stdout.write(`\r  Tier 2: ${Math.min(i + CONCURRENCY, withQuote.length)}/${withQuote.length}`);
    }
    process.stdout.write('\n');
  }

  const report: Report = {
    startedAt: new Date().toISOString(),
    urlCount: uniqueSites.length,
    quoteCount: withQuote.length,
    deadUrls,
    quoteMismatches,
    timeouts,
    durationMs: Date.now() - t0,
  };

  console.log('');
  if (deadUrls.length > 0) {
    console.log(`✗ ${deadUrls.length} dead URL(s):`);
    for (const f of deadUrls) console.log(fmt(f));
    console.log('');
  }
  if (quoteMismatches.length > 0) {
    console.log(`✗ ${quoteMismatches.length} quote(s) did not match source body:`);
    for (const f of quoteMismatches) console.log(fmt(f));
    console.log('');
  }
  if (timeouts.length > 0) {
    console.log(`⚠ ${timeouts.length} timeout/network error(s) (transient, not failing):`);
    for (const f of timeouts) console.log(fmt(f));
    console.log('');
  }

  console.log(
    `Done in ${(report.durationMs / 1000).toFixed(1)}s. ` +
      `${deadUrls.length} dead, ${quoteMismatches.length} quote mismatch, ` +
      `${timeouts.length} transient.`,
  );

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify(report, null, 2));
    console.log(`Report written to ${jsonOut}`);
  }

  let exitCode = 0;
  if (deadUrls.length > 0) exitCode |= 1;
  if (quoteMismatches.length > 0) exitCode |= 2;
  process.exit(exitCode);
}

await main();
