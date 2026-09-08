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

The program loader tries the static snapshot first, then production API metadata,
then the bundled hardcoded programs. Snapshot URLs use the public base prefix so
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
