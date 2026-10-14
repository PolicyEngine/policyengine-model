# PolicyEngine model

The PolicyEngine model explorer is a Next.js app for exploring model coverage,
parameters, and rules. Its public deployment is mounted at `/us/model`.

## Development

With dependencies installed, run:

```sh
bun run dev
bun run lint
bun run test
```

`bun run build` runs `scripts/fetch-metadata.js` before building the app. The
fetch script needs network access and can be run independently with
`bun run fetch-metadata`.

## Coverage registry snapshots

At build time, the fetch script resolves the default branch of each model
repository (`PolicyEngine/policyengine-us` and `PolicyEngine/policyengine-uk`)
and reads its `policyengine_<country>/programs.yaml` registry at that branch's
resolved commit. It writes generated
snapshots to `public/programs-us.json` and `public/programs-uk.json` when a registry
is available. A repository without a registry is skipped; fetch failures warn
without failing the build.

Each snapshot records the raw program registry, package version from
`pyproject.toml`, repository, branch, commit, and fetch time. The production API's
version is included when its metadata endpoint responds. The coverage page uses
this provenance to show which model version the coverage reflects and, when
available, the version served by the production API.

The same run snapshots each repository's `parameters/` and `variables/` file trees
(`public/param-tree-<country>.json`, `public/variable-tree-<country>.json`) at that
commit. Both trees record `{ source, paths }`. The UK variable tree also records
`modules`, an exact class-to-module map read from that commit's source archive,
because the UK metadata API serves no module names. The UK coverage tracker
verifies parameter, source and computation-tree links only against trees whose
repository and commit match its programme registry snapshot.

If the archive is unavailable, module enrichment falls back to unique file stems.
UK variables whose modules remain unknown appear under “Unclassified variables”.
The registry and both trees are cleared before each refresh so a failed fetch
cannot reuse a stale snapshot.

The program loader tries the static snapshot first, then production API metadata,
then the bundled hardcoded programs (US only; the UK page says the registry could
not be loaded). Snapshot URLs use the public base prefix so
they work both locally and under `/us/model`.

## Daily registry refresh

The `Refresh registry` GitHub Actions workflow runs daily at 06:17 UTC and can
also be started manually with **Run workflow**. It triggers a Vercel rebuild so
new registry changes appear without a commit to this repository.

To enable it:

1. In the Vercel project's Git settings, create a deploy hook for the production
   branch (`master`).
2. In this GitHub repository's **Settings → Secrets and variables → Actions**,
   add a repository secret named `VERCEL_DEPLOY_HOOK` with the hook URL.
3. Run **Actions → Refresh registry → Run workflow** to request a rebuild.

The workflow sends a POST request to the hook. If the secret is absent, it logs a
notice and exits successfully. The workflow must be on the default branch for
scheduled runs to apply. The Vercel build must run `bun run build` so each
deployment fetches a fresh snapshot.

## UK data release pages

The UK pipeline, calibration targets and validation pages quote
`src/data/ukDataRelease.json` and `src/data/ukTargetChecks.json`, not typed-in
numbers. Both describe the UK data release that policyengine.py pins
(`src/policyengine/data/bundle/manifest.json`, `data_releases.uk`). When that pin
moves, regenerate them:

1. Put the pinned release's files in one folder: the bundle manifest, the
   release manifest at the revision the bundle names, `frs_<year>.h5`,
   `enhanced_frs_<year>.h5`, both weight files (from the gated
   `policyengine/policyengine-uk-data-private` Hugging Face repo), and the two
   calibration logs (GitHub Actions artifacts of the uk-data publish run:
   `gh run download <run> -R PolicyEngine/policyengine-uk-data`).
2. Dump the release's target registry with `scripts/dump_uk_target_registry.py`,
   and score the saved file with the pinned model with
   `scripts/run_uk_target_check.py` (commands in each script's docstring).
3. Run `scripts/extract_uk_release.py --artifacts <folder> --out
   src/data/ukDataRelease.json --rows-out src/data/ukTargetChecks.json`. It checks
   every file's sha256 against the release manifest and refuses a release other
   than the pin.
   The target check records the dataset's sha256, data package version and
   year, and the extractor refuses a check of any other file, package or year.
4. Run `UK_RELEASE_ARTIFACTS=<folder> UK_DATA_SOURCE=<policyengine-uk-data at
   the pin> uv run --no-project --with pytest --with hypothesis --with h5py
   --with tables --with pandas --with numpy pytest
   scripts/test_extract_uk_release.py`, and
   `UK_MODEL_SOURCE=<policyengine-uk at the pin> bun run test`. The first
   checks the extractor's labels, areas and notes against the data package's
   code; the second runs policyengine-uk's own behavioural functions against
   the behavioural page. Then reread the pipeline stage copy in
   `src/data/ukPipelineStages.ts` against the new release's
   `datasets/create_datasets.py`: the counts update themselves, the mechanisms
   do not.

The household files hold UK Data Service microdata. Only the aggregates the
extractor writes may leave that folder.

The UK behavioural responses page mirrors policyengine-uk's parameters and
`dynamics/progression.py` (`src/data/ukBehaviouralResponses.ts`); run `bun run
test` with `UK_MODEL_SOURCE` set to a policyengine-uk checkout at the pinned
version to compare them.
