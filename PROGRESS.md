# Coverage registry source progress

## State

In progress on `coverage-source-master`, created from `origin/master` at
`b10d328daaa2890a936adec008434ba7b95320c8` (also local `master`).
This lane is offline: no fetches, dependency installs, build, push, or PR creation.

## Done

- Confirmed a clean starting worktree and matching `master` / `origin/master` HEADs.
- Created the requested branch and recorded the implementation and validation plan.
- Added the daily/manual deployment-hook refresh workflow, README setup
  instructions, and ignores for generated registry snapshots.
- Added snapshot → API → bundled fallback loading with provenance, mounted
  asset paths, commit-specific snapshot source links, and the unchanged
  programs-only public interface.
- Added loader/transform regression tests and an offline fetch guard for tests.
- Added the coverage provenance line with snapshot/API/fallback attribution and
  UI tests; removed a hardcoded TANF Partial count so summaries use the registry.

## Next

- Add default-branch registry snapshots and repair metadata branch resolution.
- Run only `bun run lint` and `bun run test` with existing `node_modules`.
- Commit each coherent step and write the final file-by-file report and verbatim
  check results to `out.md`; leave all commits locally for the dispatcher.
