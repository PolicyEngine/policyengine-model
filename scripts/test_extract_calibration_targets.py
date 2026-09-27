"""
Property and differential tests for extract_calibration_targets.extract().

Run:
    uv run --no-project --with pytest --with hypothesis \
        pytest scripts/test_extract_calibration_targets.py

Set CALIBRATION_DIAGNOSTICS to a downloaded calibration_diagnostics.json to
also check that the committed src/data/calibrationTargets.json is exactly what
extract() produces from it.
"""

import json
import os
import sys

import pytest
from hypothesis import given, settings, strategies as st

sys.path.insert(0, os.path.dirname(__file__))
from extract_calibration_targets import LEVEL_KEYS, extract  # noqa: E402

COMMITTED = os.path.join(
    os.path.dirname(__file__), "..", "src", "data", "calibrationTargets.json"
)

FAMILIES = ["irs_soi", "census_pep", "usda_snap"]
TABLES = ["Table A", "Table B"]
CONCEPTS = ["amount", "returns", "population"]
GEO_LEVELS = ["country", "state", "congressional_district", None, "county"]


@st.composite
def diagnostics(draw):
    n = draw(st.integers(min_value=1, max_value=60))
    targets = []
    for i in range(n):
        family = draw(st.sampled_from(FAMILIES))
        table = draw(st.sampled_from(TABLES))
        concept = draw(st.sampled_from(CONCEPTS))
        internal = draw(st.booleans()) and draw(st.booleans())
        source = (
            "Locked-source mass (internal)"
            if internal
            else f"{family} | {table} | file.csv | 2024 | https://example.org/{family}"
        )
        metadata = {
            "ledger_geography_level": draw(st.sampled_from(GEO_LEVELS)),
            "ledger_measure_unit": draw(st.sampled_from(["usd", "count", None])),
        }
        targets.append(
            {
                "name": f"{family}.{table}.{i}.{concept}@2024",
                "source": source,
                "metadata": draw(st.sampled_from([metadata, None])),
                "target": draw(st.floats(min_value=-1e12, max_value=1e12, allow_nan=False)),
                "relative_error": draw(
                    st.one_of(st.none(), st.floats(min_value=-5, max_value=5, allow_nan=False))
                ),
                "period": draw(st.sampled_from([2024, 2023, 0, None])),
            }
        )
    return {"n_records": draw(st.integers(1, 10**6)), "targets": targets}


@settings(max_examples=300, deadline=None)
@given(diagnostics())
def test_groups_partition_the_targets(diag):
    out = extract(diag)
    assert out["totalTargets"] == len(diag["targets"])
    assert sum(r["targetCount"] for r in out["targets"]) == out["totalTargets"]
    assert sum(out["levelCounts"].values()) == out["totalTargets"]
    assert set(out["levelCounts"]) == set(LEVEL_KEYS)
    for level in LEVEL_KEYS:
        key = f"{level}Count"
        assert sum(r[key] for r in out["targets"]) == out["levelCounts"][level]
    for r in out["targets"]:
        assert r["targetCount"] == sum(r[f"{level}Count"] for level in LEVEL_KEYS)
        assert r["targetCount"] > 0


@settings(max_examples=300, deadline=None)
@given(diagnostics())
def test_group_keys_are_unique_and_sorted(diag):
    rows = extract(diag)["targets"]
    keys = [(r["sourceFamily"], r["sourceTable"], r["concept"]) for r in rows]
    assert len(keys) == len(set(keys))
    assert keys == sorted(keys)


@settings(max_examples=300, deadline=None)
@given(diagnostics())
def test_within_ten_percent_share_matches_a_recount(diag):
    out = extract(diag)
    within = sum(
        1
        for t in diag["targets"]
        if t["relative_error"] is not None and abs(t["relative_error"]) <= 0.10
    )
    assert out["withinTenPctShare"] == round(within / len(diag["targets"]), 4)
    assert 0 <= out["withinTenPctShare"] <= 1
    for r in out["targets"]:
        assert 0 <= r["withinTenPctShare"] <= 1


@settings(max_examples=300, deadline=None)
@given(diagnostics())
def test_national_value_only_for_a_single_national_row(diag):
    for r in extract(diag)["targets"]:
        if r["nationalCount"] != 1:
            assert r["nationalValue"] is None


@settings(max_examples=300, deadline=None)
@given(diagnostics())
def test_extract_is_deterministic_and_order_invariant(diag):
    first = extract(diag)
    reordered = {**diag, "targets": list(reversed(diag["targets"]))}
    second = extract(reordered)
    # Everything but nationalValue (first national row wins) is order-free,
    # and nationalValue is only set when a group has exactly one national row.
    assert json.dumps(first, sort_keys=True) == json.dumps(second, sort_keys=True)


def test_committed_json_matches_the_release_diagnostics():
    path = os.environ.get("CALIBRATION_DIAGNOSTICS")
    if not path:
        pytest.skip("set CALIBRATION_DIAGNOSTICS to run the differential check")
    with open(path) as f:
        expected = extract(json.load(f))
    with open(COMMITTED) as f:
        committed = json.load(f)
    for key, value in expected.items():
        assert committed[key] == value, key
