# Comparison data

Source-of-truth YAML for the open microsimulation reference at `/comparison`.

## Files

| File | Purpose | Loader root key |
|---|---|---|
| `models.yaml` | Models in scope (one row per model). | `models` |
| `programs.yaml` | Policies and programs (one row per program). | `programs` |
| `coverage.yaml` | Coverage matrix (model × program). | `coverage` |
| `transparency.yaml` | Transparency dimensions per model. | `transparency` |
| `usage.yaml` | Usage signal per model. | `usage` |
| `accuracy.yaml` | Accuracy benchmarks (model × metric). | `accuracy` |
| `imputations.yaml` | Imputation and calibration approaches. | `imputations` |
| `artifacts.yaml` | Concrete artifacts (code, data, papers). | `artifacts` |
| `freshness.yaml` | Latest year encoded, forward coverage, update cadence. | `freshness` |

The TypeScript shape is in [`src/types/comparison.ts`](../../src/types/comparison.ts).
The loader is in [`src/data/comparisons.ts`](../../src/data/comparisons.ts).

## Adding a new model

1. Add an entry to `models.yaml` with a unique `id` (kebab-case).
2. Add rows to `transparency.yaml`, `usage.yaml`, and `artifacts.yaml` for the new model.
3. Add `coverage` rows for each program the model implements. For programs the
   model excludes, add a row with `status: not-implemented` and a citation.
4. Add `imputations` rows for any non-trivial imputation or calibration.
5. Add `accuracy` rows for any benchmarks the model documents.
6. The loader will fail the build if any row references an unknown model or
   program id, so referential integrity is enforced.

## Adding a new program

1. Add an entry to `programs.yaml` with a unique `id`.
2. Add `coverage` rows for at least the models you can confirm — others can be
   `status: unknown` with a citation to the model's overview page.

## Editorial conventions

- **Cite everything.** Every row carries at least one `sources` entry. Use
  `label` + `url`; when offline (e.g. private documentation), include `label`
  only.
- **Prefer `unknown` over guesses.** A thin row with `unknown` is better than a
  confident fabrication. Reviewers can fill in `unknown` over time.
- **Neutral tone.** This is a reference, not a marketing surface. Describe what
  each model does and where its documentation lives; avoid value judgments
  about quality or quantity.
- **No cost data here.** Budget estimates for incumbent models are kept
  separately (internal). This repo deliberately excludes cost as a comparison
  dimension to avoid embedding contested numbers in a public reference.
