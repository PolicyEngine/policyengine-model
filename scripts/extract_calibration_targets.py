"""
Extract calibration targets from the default Microcosm US release
and output a grouped JSON for the Calibration page.

Usage:
    uv run --no-project python scripts/extract_calibration_targets.py
    uv run --no-project python scripts/extract_calibration_targets.py \
        --release populace-us-2024-spm-20260915 --diagnostics PATH

The default US release is the one the policyengine Python package pins in
its bundle manifest (``data_releases.us``). The script reads that pin from
policyengine.py's default branch, then reads the release's manifests from the
policyengine/populace-us Hugging Face dataset at the release's own revision.

A release can inherit its calibration from a parent build (a source-enrichment
release adds input columns without refitting weights). In that case the
build manifest names the parent, and the calibration date comes from the
parent's release manifest. The diagnostics file is checked against the sha256
the release manifest records before any row is read.

Targets are grouped by (source family, source table, measured concept) and
written to src/data/calibrationTargets.json.
"""

import argparse
import hashlib
import json
import os
import subprocess
import urllib.request
from collections import defaultdict

BUNDLE_MANIFEST_URL = (
    "https://raw.githubusercontent.com/PolicyEngine/policyengine.py/main/"
    "src/policyengine/data/bundle/manifest.json"
)
HF_REPO = "https://huggingface.co/datasets/policyengine/populace-us"
OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "src", "data", "calibrationTargets.json"
)

# ledger_geography_level values -> page levels. Anything else (including a
# missing level) is a build-internal constraint rather than an administrative
# fact at a geography.
LEVELS = {
    "country": "national",
    "state": "state",
    "congressional_district": "district",
}
LEVEL_KEYS = ("national", "state", "district", "other")


def fetch_bytes(url: str) -> bytes:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "policyengine-model"})
        with urllib.request.urlopen(req) as resp:
            return resp.read()
    except Exception:
        # Fallback to curl if Python SSL certs aren't configured
        return subprocess.check_output(["curl", "-sfL", url])


def fetch_json(url: str):
    return json.loads(fetch_bytes(url))


def release_file_url(revision: str, path: str) -> str:
    return f"{HF_REPO}/resolve/{revision}/{path}"


def release_manifest_url(release_id: str) -> str:
    return release_file_url(
        release_id, f"releases/{release_id}/release_manifest.json"
    )


def geography_level(target: dict) -> str:
    level = (target.get("metadata") or {}).get("ledger_geography_level")
    return LEVELS.get(level, "other")


def concept_from_name(name: str) -> str:
    """Final dot-path segment of the target name, without the @period suffix."""
    base = name.split("@", 1)[0]
    return base.rsplit(".", 1)[-1]


def split_source(source: str) -> tuple[str, str, str]:
    """The diagnostics 'source' field is 'family | table | file | vintage | url'."""
    parts = [p.strip() for p in (source or "").split(" | ")]
    if len(parts) >= 5:
        return parts[0], parts[1], parts[4]
    # Build-internal targets carry a prose source description
    return "policyengine_build", source or "unknown", ""


def extract(diagnostics: dict) -> dict:
    targets = diagnostics["targets"]

    groups: dict[tuple[str, str, str], dict] = {}
    level_totals: dict[str, int] = defaultdict(int)
    for t in targets:
        family, table, url = split_source(t.get("source"))
        concept = concept_from_name(t["name"])
        level = geography_level(t)
        level_totals[level] += 1
        g = groups.setdefault(
            (family, table, concept),
            {
                "concept": concept,
                "sourceFamily": family,
                "sourceTable": table,
                "sourceUrl": url,
                "counts": defaultdict(int),
                "units": set(),
                "withinTenPct": 0,
                "nationalValues": [],
                "periods": set(),
            },
        )
        g["counts"][level] += 1
        g["units"].add((t.get("metadata") or {}).get("ledger_measure_unit"))
        rel = t.get("relative_error")
        if rel is not None and abs(rel) <= 0.10:
            g["withinTenPct"] += 1
        if level == "national":
            g["nationalValues"].append(t.get("target"))
        period = t.get("period")
        if period:
            g["periods"].add(period)

    rows = []
    for g in groups.values():
        total = sum(g["counts"].values())
        rows.append(
            {
                "concept": g["concept"],
                "sourceFamily": g["sourceFamily"],
                "sourceTable": g["sourceTable"],
                "sourceUrl": g["sourceUrl"],
                "nationalCount": g["counts"]["national"],
                "stateCount": g["counts"]["state"],
                "districtCount": g["counts"]["district"],
                "otherCount": g["counts"]["other"],
                "targetCount": total,
                # 'usd' or 'count' when every row in the group shares it
                "unit": next(iter(g["units"])) if len(g["units"]) == 1 else None,
                "withinTenPctShare": round(g["withinTenPct"] / total, 4),
                "nationalValue": (
                    g["nationalValues"][0] if len(g["nationalValues"]) == 1 else None
                ),
                "periods": sorted(g["periods"]),
            }
        )
    rows.sort(key=lambda r: (r["sourceFamily"], r["sourceTable"], r["concept"]))

    n_targets = len(targets)
    within = sum(
        1
        for t in targets
        if t.get("relative_error") is not None and abs(t["relative_error"]) <= 0.10
    )
    return {
        "households": diagnostics.get("n_records"),
        "totalTargets": n_targets,
        "withinTenPctShare": round(within / n_targets, 4),
        "levelCounts": {k: level_totals.get(k, 0) for k in LEVEL_KEYS},
        "targets": rows,
    }


def resolve_release(release_override: str | None) -> tuple[str, str | None]:
    """The US release policyengine.py pins, and the bundle version pinning it."""
    bundle = fetch_json(BUNDLE_MANIFEST_URL)
    pinned = bundle["data_releases"]["us"]["build_id"]
    version = bundle.get("bundle_version")
    if release_override and release_override != pinned:
        print(
            f"Note: --release {release_override} differs from the release "
            f"policyengine.py {version} pins ({pinned})."
        )
        return release_override, None
    return pinned, version


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--release", help="Release id to extract (default: the policyengine.py pin)")
    parser.add_argument(
        "--diagnostics",
        help="Path to an already-downloaded calibration_diagnostics.json",
    )
    args = parser.parse_args()

    release_id, bundle_version = resolve_release(args.release)
    print(f"Release: {release_id} (policyengine.py {bundle_version or 'override'})")

    release_manifest = fetch_json(release_manifest_url(release_id))
    artifacts = release_manifest["artifacts"]

    calibration_release_id = release_id
    calibrated_at = release_manifest.get("build", {}).get("built_at")
    if "build_manifest" in artifacts:
        build_manifest = fetch_json(
            release_file_url(release_id, f"releases/{release_id}/build_manifest.json")
        )
        calibration = build_manifest.get("calibration", {})
        if calibration.get("mode") == "inherited":
            calibration_release_id = calibration["parent_build_id"]
            parent_manifest = fetch_json(release_manifest_url(calibration_release_id))
            calibrated_at = parent_manifest["build"]["built_at"]
            print(f"Calibration inherited from {calibration_release_id}")

    diag_artifact = artifacts["calibration_diagnostics"]
    if args.diagnostics:
        with open(args.diagnostics, "rb") as f:
            raw = f.read()
    else:
        path = diag_artifact["path"]
        if "/" not in path:
            path = f"releases/{release_id}/{path}"
        url = release_file_url(release_id, path)
        print(f"Downloading {url}")
        raw = fetch_bytes(url)
    digest = hashlib.sha256(raw).hexdigest()
    if digest != diag_artifact["sha256"]:
        raise SystemExit(
            f"calibration_diagnostics.json sha256 {digest} does not match the "
            f"release manifest ({diag_artifact['sha256']})"
        )

    output = {
        "releaseId": release_id,
        "policyenginePackageVersion": bundle_version,
        "calibrationReleaseId": calibration_release_id,
        "calibratedAt": calibrated_at,
        **extract(json.loads(raw)),
    }
    levels = output["levelCounts"]
    print(
        f"{output['totalTargets']} targets "
        f"({levels['national']} national, {levels['state']} state, "
        f"{levels['district']} district, {levels['other']} build-internal) "
        f"in {len(output['targets'])} groups; "
        f"{output['withinTenPctShare']:.1%} within 10%"
    )

    out_path = os.path.normpath(OUTPUT_PATH)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
        f.write("\n")
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
