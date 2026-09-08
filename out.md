# Coverage registry source implementation

Completed on local branch `coverage-source-master`, based on
`b10d328daaa2890a936adec008434ba7b95320c8`, the starting HEAD of both `master` and
`origin/master`. Each coherent step is committed, including this report and
`PROGRESS.md`.

## Changes by file

| File | Change |
| --- | --- |
| `scripts/fetch-metadata.js` | Resolves US and UK default branches programmatically through GitHub HTTP, then pins registry YAML, package version, and parameter trees to the resolved commit. Parses YAML with existing `js-yaml`; writes `public/programs-<cc>.json` containing raw programs, version, and repository/branch/commit/fetch-time provenance. Includes the optional production API version, supports enveloped metadata, warns and skips failures or missing UK registry, removes old snapshots before refreshing, and requires no `gh` installation. |
| `src/data/fetchPrograms.ts` | Adds `fetchProgramsWithSource`, tries snapshot → API → bundled fallback, validates snapshot provenance, preserves the raw API-to-Program transform, resolves public mount prefixes, and retains the existing `fetchPrograms(): Promise<Program[]>` interface. Snapshot source links use the pinned commit and correct country repository. |
| `src/components/rules/CoverageProvenance.tsx` | Adds the small provenance line with model version, branch, short commit, date, and optional API version; identifies API and bundled fallback sources. |
| `src/components/rules/RulesOverview.tsx` | Loads programs and provenance together, ignores completed requests after unmount/country changes, and displays attribution before the statistics. Removes the forced TANF Partial count so registry data determines the summary. Preserves the existing static UK introduction. |
| `proxy.ts` | Allows country-prefixed registry JSON through the proxy matcher so snapshots work at both `/us/programs-us.json` and `/us/model/programs-us.json`, including UK equivalents. |
| `.github/workflows/refresh-registry.yml` | Adds daily 06:17 UTC and manual refresh triggers. POSTs to `VERCEL_DEPLOY_HOOK` when set; otherwise logs a notice and exits successfully. |
| `README.md` | Replaces the stale template with project commands, snapshot behavior, fallback order, and deploy-hook secret configuration. |
| `.gitignore` | Ignores generated `public/programs-*.json` snapshots. |
| `src/test/fetchMetadataScript.test.ts` | Adds mocked script tests for default-branch resolution, commit pinning, raw YAML and package-version parsing, API envelopes/outages, parameter trees, independent failures, stale snapshot cleanup, and missing UK registry. |
| `src/test/fetchPrograms.test.ts` | Tests raw field/status transforms, including `in_progress` and missing state status (`notStarted`), mounted URLs, country isolation, provenance, fallback order, invalid snapshots, optional API versions, and retry after bundled fallback. |
| `src/test/coverageProvenance.test.tsx` | Tests exact provenance text, optional version handling, fallback attribution, coverage-page integration, completed TANF statistics, and the existing UK introduction. |
| `src/test/proxy.test.ts` | Tests actual Next.js matcher eligibility and rewrites for both countries and mounts while keeping unrelated static assets excluded. |
| `src/test/setup.ts` | Blocks unmocked fetches in tests so they cannot contact production services. |
| `src/test/app-routes.test.tsx` | Keeps layout smoke tests in their initial loading state with mocked data loaders. |
| `PROGRESS.md` | Tracks committed state, completed steps, validation, and dispatcher next steps from the start. |
| `out.md` | This final report. |

`src/data/programs.ts`, upstream registry data, dependency manifests, and lockfiles
were not changed. No dependencies were installed.

## Validation results

Both requested checks ran offline against the existing `node_modules`. Captured
stdout/stderr is reproduced verbatim below.

`bun run lint` — exit 0:

```text
$ eslint .
```

`bun run test` — exit 0:

```text
$ vitest run

 RUN  v4.1.0 /Users/maxghenis/PolicyEngine/policyengine-model


 Test Files  10 passed (10)
      Tests  113 passed (113)
   Start at  11:38:29
   Duration  2.96s (transform 1.14s, setup 680ms, import 2.77s, tests 721ms, environment 7.34s)

```

`bun run build` — not run because this lane has no network access and the task
explicitly limits checks to lint and tests. There is no build output to report.
The fetch script was exercised only with mocked requests through Vitest; its
live entry point was not run.

## Unverified and handoff

- No network requests, Git fetches, dependency installs, pushes, or deployment
  triggers were attempted.
- Live repository default branches, current commits/versions/registry contents,
  API version responses, production build behavior, and the Vercel hook were not
  verified. Tests use fixtures; their version strings are not live findings.
- The optional API version in a snapshot is observed at build time and refreshes
  with the next rebuild. Generated snapshots are intentionally absent from these
  commits and will be produced when the dispatcher runs the script with network.
- The workflow and secret configuration have not been exercised on GitHub.
- All commits remain on local branch `coverage-source-master`. The branch was
  not pushed and no PR was opened. The dispatcher should run the fetch/build,
  push the branch, and open a PR to `master` titled
  **Coverage tracker: read the registry from the model repo's default branch**.
