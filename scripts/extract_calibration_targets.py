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
import math
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

# ledger_geography_level values -> page levels.
LEVELS = {
    "country": "national",
    "state": "state",
    "congressional_district": "district",
}
LEVEL_KEYS = ("national", "state", "district", "other")
# Targets with no ledger geography are accepted only when the build marks them
# as one of these internal constraint roles; any other missing or unknown
# geography is an error rather than a silent "build-internal" row.
INTERNAL_TARGET_ROLES = {"selection_mass_protection"}
# Source family the page shows for those internal constraints.
INTERNAL_FAMILY = "policyengine_build"
# calibration_diagnostics.json schema versions this script understands.
SUPPORTED_SCHEMA_VERSIONS = {5}
# ledger_measure_unit values an administrative target may carry.
MEASURE_UNITS = {"usd", "count"}
# Plausible calibration years for an administrative target's period.
CALIBRATION_YEARS = (1990, 2100)


class UnsupportedDiagnostics(ValueError):
    """The diagnostics file is not a schema this extraction understands."""


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


def _one_of(value, allowed) -> bool:
    """Membership that is False, not a TypeError, for unhashable JSON values."""
    return isinstance(value, str) and value in allowed


def geography_level(target: dict) -> str:
    metadata = target.get("metadata") or {}
    level = metadata.get("ledger_geography_level")
    if _one_of(level, LEVELS):
        return LEVELS[level]
    # Ledger facts never carry a target_role, so a row with ledger metadata is
    # administrative even if it also claims an internal role.
    if (
        level is None
        and _one_of(metadata.get("target_role"), INTERNAL_TARGET_ROLES)
        and not any(str(k).startswith("ledger_") for k in metadata)
    ):
        return "other"
    raise UnsupportedDiagnostics(
        f"target {target.get('name')!r}: unrecognized geography {level!r} "
        f"and no internal target role"
    )


def _is_finite_number(value) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    return isinstance(value, float) and math.isfinite(value)


def _is_nonempty_string(value) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_target(t) -> None:
    """Every field extract() reads must be present and well-formed."""
    if not isinstance(t, dict) or not _is_nonempty_string(t.get("name")):
        raise UnsupportedDiagnostics(f"target without a name: {t!r:.200}")
    name = t["name"]
    if not suffix_from_name(name).strip():
        raise UnsupportedDiagnostics(f"target {name!r}: name has no final segment")

    def fail(problem: str):
        raise UnsupportedDiagnostics(f"target {name!r}: {problem}")

    if not _is_nonempty_string(t.get("source")):
        fail("no source")
    metadata = t.get("metadata")
    if not isinstance(metadata, dict):
        fail("metadata is not an object")
    if not _is_finite_number(t.get("target")):
        fail(f"target value {t.get('target')!r} is not a finite number")
    # The release contract requires relative_error on every target; a missing
    # one would silently count as outside 10%.
    if not _is_finite_number(t.get("relative_error")):
        fail(f"relative_error {t.get('relative_error')!r} is not a finite number")
    period = t.get("period")
    if not isinstance(period, int) or isinstance(period, bool) or period < 0:
        fail(f"period {period!r} is not a non-negative integer")
    domain = metadata.get("ledger_domain")
    if domain is not None and not isinstance(domain, str):
        fail(f"ledger_domain {domain!r} is not a string")

    if geography_level(t) == "other":
        return
    # An administrative citation that is not 'family | table | file | vintage |
    # url' would be filed under the build-internal family, or link to the
    # wrong part.
    parts = [p.strip() for p in t["source"].split(" | ")]
    if len(parts) != 5 or not all(parts) or not parts[4].startswith(("http://", "https://")):
        fail(f"source {t['source']!r} is not 'family | table | file | vintage | url'")
    # Without a measure concept, different concepts that share a name suffix
    # would merge into one group.
    concept = metadata.get("ledger_measure_concept")
    if not _is_nonempty_string(concept) or concept != concept.strip():
        fail(f"ledger_measure_concept {concept!r} is missing or padded")
    if not _one_of(metadata.get("ledger_measure_unit"), MEASURE_UNITS):
        fail(
            f"ledger_measure_unit {metadata.get('ledger_measure_unit')!r} "
            f"is not one of {sorted(MEASURE_UNITS)}"
        )
    if not CALIBRATION_YEARS[0] <= period <= CALIBRATION_YEARS[1]:
        fail(f"period {period!r} is not a calibration year")


def validate(diagnostics) -> None:
    """Refuse diagnostics this extraction would misread, before writing anything."""
    if not isinstance(diagnostics, dict):
        raise UnsupportedDiagnostics("diagnostics is not an object")
    version = diagnostics.get("schema_version")
    if not isinstance(version, int) or isinstance(version, bool) or version not in SUPPORTED_SCHEMA_VERSIONS:
        raise UnsupportedDiagnostics(
            f"diagnostics schema_version {version!r} is not one of "
            f"{sorted(SUPPORTED_SCHEMA_VERSIONS)}"
        )
    if diagnostics.get("weight_entity") != "household":
        raise UnsupportedDiagnostics(
            f"weight_entity {diagnostics.get('weight_entity')!r} is not 'household'"
        )
    n_records = diagnostics.get("n_records")
    if not isinstance(n_records, int) or isinstance(n_records, bool) or n_records <= 0:
        raise UnsupportedDiagnostics(f"n_records {n_records!r} is not a positive integer")
    targets = diagnostics.get("targets")
    if not isinstance(targets, list) or not targets:
        raise UnsupportedDiagnostics("targets is missing or empty")
    for t in targets:
        validate_target(t)

    # Cross-checks against the totals the diagnostics state about themselves,
    # so a truncated or duplicated target list is caught.
    names = [t["name"] for t in targets]
    if len(set(names)) != len(names):
        raise UnsupportedDiagnostics("target names are not unique")
    surface = diagnostics.get("target_surface")
    surface = surface if isinstance(surface, dict) else {}
    if surface.get("n_targets") != len(targets):
        raise UnsupportedDiagnostics(
            f"target_surface.n_targets {surface.get('n_targets')!r} does not match "
            f"{len(targets)} targets"
        )
    if surface.get("n_records") != n_records:
        raise UnsupportedDiagnostics(
            f"target_surface.n_records {surface.get('n_records')!r} does not match "
            f"n_records {n_records!r}"
        )
    stated_share = diagnostics.get("fraction_within_10pct")
    share = sum(1 for t in targets if abs(t["relative_error"]) <= 0.10) / len(targets)
    if not _is_finite_number(stated_share) or abs(stated_share - share) > 1e-9:
        raise UnsupportedDiagnostics(
            f"fraction_within_10pct {stated_share!r} does not match the targets ({share!r})"
        )


def suffix_from_name(name: str) -> str:
    """Final dot-path segment of the target name, without the @period suffix."""
    base = name.split("@", 1)[0]
    return base.rsplit(".", 1)[-1]


def extract(diagnostics: dict) -> dict:
    """Group targets by source table and measured concept.

    A group is one ledger measure concept (``metadata.ledger_measure_concept``)
    from one source table. The final name segment (``concept``) also enters the
    key, so an amount and a count of the same concept stay separate.
    """
    validate(diagnostics)
    targets = diagnostics["targets"]

    groups: dict[tuple[str, str, str, str], dict] = {}
    level_totals: dict[str, int] = defaultdict(int)
    for t in targets:
        metadata = t["metadata"]
        level = geography_level(t)
        if level == "other":
            family, table, url = INTERNAL_FAMILY, t["source"], ""
        else:
            family, table, _file, _vintage, url = (p.strip() for p in t["source"].split(" | "))
        concept = suffix_from_name(t["name"])
        measure_concept = metadata.get("ledger_measure_concept") or ""
        level_totals[level] += 1
        g = groups.setdefault(
            (family, table, measure_concept, concept),
            {
                "concept": concept,
                "measureConcept": measure_concept or None,
                "sourceFamily": family,
                "sourceTable": table,
                "sourceUrl": url,
                "counts": defaultdict(int),
                "units": set(),
                "domains": set(),
                "withinTenPct": 0,
                "nationalValues": [],
                "periods": set(),
            },
        )
        g["counts"][level] += 1
        g["units"].add(metadata.get("ledger_measure_unit"))
        g["domains"].add(metadata.get("ledger_domain") or None)
        if abs(t["relative_error"]) <= 0.10:
            g["withinTenPct"] += 1
        if level == "national":
            g["nationalValues"].append(t["target"])
        period = t.get("period")
        if period:
            g["periods"].add(period)

    def only(values: set):
        return next(iter(values)) if len(values) == 1 else None

    rows = []
    for g in groups.values():
        total = sum(g["counts"].values())
        rows.append(
            {
                "concept": g["concept"],
                "measureConcept": g["measureConcept"],
                "sourceFamily": g["sourceFamily"],
                "sourceTable": g["sourceTable"],
                "sourceUrl": g["sourceUrl"],
                # ledger_domain (the population the figure covers) when shared
                "domain": only(g["domains"]),
                "nationalCount": g["counts"]["national"],
                "stateCount": g["counts"]["state"],
                "districtCount": g["counts"]["district"],
                "otherCount": g["counts"]["other"],
                "targetCount": total,
                # 'usd' or 'count' when every row in the group shares it
                "unit": only(g["units"]),
                "withinTenPctShare": round(g["withinTenPct"] / total, 4),
                "nationalValue": (
                    g["nationalValues"][0] if len(g["nationalValues"]) == 1 else None
                ),
                "periods": sorted(g["periods"]),
            }
        )
    rows.sort(
        key=lambda r: (
            r["sourceFamily"],
            r["sourceTable"],
            r["measureConcept"] or "",
            r["concept"],
        )
    )

    n_targets = len(targets)
    within = sum(1 for t in targets if abs(t["relative_error"]) <= 0.10)
    return {
        "households": diagnostics["n_records"],
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
        json.dump(output, f, indent=2, allow_nan=False)
        f.write("\n")
    print(f"Written to {out_path}")


if __name__ == "__main__":
    main()
