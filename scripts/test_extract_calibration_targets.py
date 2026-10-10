"""
Property, regression, and differential tests for extract_calibration_targets.

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
from extract_calibration_targets import (  # noqa: E402
    LEVEL_KEYS,
    UnsupportedDiagnostics,
    extract,
)

COMMITTED = os.path.join(
    os.path.dirname(__file__), "..", "src", "data", "calibrationTargets.json"
)

FAMILIES = ["irs_soi", "census_pep", "usda_snap"]
TABLES = ["Table A", "Table B"]
SUFFIXES = ["amount", "return_count", "population"]
CONCEPTS = ["concept_a", "concept_b"]
GEO_LEVELS = ["country", "state", "congressional_district"]


def wrap(rows, **overrides):
    return {
        "schema_version": 5,
        "weight_entity": "household",
        "n_records": 1000,
        "targets": rows,
        **overrides,
    }


def target(name, source, level="country", concept="c", **extra):
    metadata = {"ledger_geography_level": level, "ledger_measure_concept": concept}
    return {
        "name": name,
        "source": source,
        "metadata": metadata,
        "target": 1.0,
        "relative_error": 0.0,
        "period": 2024,
        **extra,
    }


@st.composite
def diagnostics(draw):
    n = draw(st.integers(min_value=1, max_value=60))
    targets = []
    for i in range(n):
        family = draw(st.sampled_from(FAMILIES))
        table = draw(st.sampled_from(TABLES))
        suffix = draw(st.sampled_from(SUFFIXES))
        internal = draw(st.booleans()) and draw(st.booleans())
        if internal:
            source = "Locked-source mass (internal)"
            metadata = {"target_role": "selection_mass_protection"}
        else:
            source = f"{family} | {table} | file.csv | 2024 | https://example.org/{family}"
            metadata = {
                "ledger_geography_level": draw(st.sampled_from(GEO_LEVELS)),
                "ledger_measure_concept": f"{family}.{draw(st.sampled_from(CONCEPTS))}",
                "ledger_measure_unit": draw(st.sampled_from(["usd", "count", None])),
                "ledger_domain": draw(st.sampled_from(["all_returns", "itemizers", None])),
            }
        targets.append(
            {
                "name": f"{family}.{table}.{i}.{suffix}@2024",
                "source": source,
                "metadata": metadata,
                "target": draw(st.floats(min_value=-1e12, max_value=1e12, allow_nan=False)),
                "relative_error": draw(
                    st.one_of(st.none(), st.floats(min_value=-5, max_value=5, allow_nan=False))
                ),
                "period": draw(st.sampled_from([2024, 2023, 0, None])),
            }
        )
    return wrap(targets, n_records=draw(st.integers(1, 10**6)))


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
    keys = [
        (r["sourceFamily"], r["sourceTable"], r["measureConcept"] or "", r["concept"])
        for r in rows
    ]
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
    # nationalValue is only set when a group has exactly one national row,
    # so every field is independent of input order.
    assert json.dumps(first, sort_keys=True) == json.dumps(second, sort_keys=True)


def test_same_name_suffix_with_different_concepts_stays_separate():
    # Shipped case: two national IRS rows in one table both end in
    # .return_count but measure all returns and EITC returns respectively.
    source = "irs_soi | Historic Table 2 state data, United States total | f.csv | 2022 | u"
    out = extract(
        wrap(
            [
                target("irs.us.all.return_count@2024", source,
                       concept="irs_soi.individual_income_tax_returns"),
                target("irs.us.eitc.return_count@2024", source,
                       concept="irs_soi.returns_with_earned_income_credit"),
            ]
        )
    )
    assert len(out["targets"]) == 2
    assert {r["measureConcept"] for r in out["targets"]} == {
        "irs_soi.individual_income_tax_returns",
        "irs_soi.returns_with_earned_income_credit",
    }
    assert all(r["nationalValue"] == 1.0 for r in out["targets"])


def test_internal_constraint_is_counted_as_other():
    out = extract(
        wrap(
            [
                target("a.amount@2024", "bea | T | f | 2024 | u"),
                {
                    "name": "selection_mass_protection.keogh_distributions@0",
                    "source": "Locked-source mass measured on the base pool",
                    "metadata": {"target_role": "selection_mass_protection"},
                    "target": 5.0,
                    "relative_error": 0.0,
                    "period": 0,
                },
            ]
        )
    )
    assert out["levelCounts"] == {"national": 1, "state": 0, "district": 0, "other": 1}


def test_rejects_the_legacy_local_area_schema():
    # Shape of populace-us-2024-buildo-acs-local-77e2061-20260724T110908Z's
    # calibration_diagnostics.json: no schema_version, `households` instead of
    # n_records, and targets without metadata or relative_error.
    legacy = {
        "households": 1588854,
        "n_targets": 2,
        "targets": [
            {"name": "pop_cd_0101", "target": 1.0, "compiled_target": 1.0,
             "initial_estimate": 1.0, "final_estimate": 1.0},
            {"name": "pop_state_01", "target": 2.0, "compiled_target": 2.0,
             "initial_estimate": 2.0, "final_estimate": 2.0},
        ],
    }
    with pytest.raises(UnsupportedDiagnostics):
        extract(legacy)


@pytest.mark.parametrize(
    "overrides",
    [
        {"schema_version": 4},
        {"weight_entity": "person"},
        {"n_records": None},
        {"n_records": 0},
        {"targets": []},
    ],
)
def test_rejects_unsupported_top_level_fields(overrides):
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap([target("a.amount@2024", "bea | T | f | 2024 | u")], **overrides))


def test_rejects_unknown_geography_instead_of_calling_it_internal():
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap([target("a.amount@2024", "bea | T | f | 2024 | u", level="county")]))
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap([{**target("a.amount@2024", "bea | T | f | 2024 | u"), "metadata": None}]))


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
