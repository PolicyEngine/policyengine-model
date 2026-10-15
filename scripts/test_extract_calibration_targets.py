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

BEA = "bea | T | f | 2024 | https://example.org/bea"
IRS_US_TOTAL = (
    "irs_soi | Historic Table 2 state data, United States total | f.csv | 2022 | "
    "https://example.org/irs"
)


def within_share(rows):
    hits = sum(
        1
        for r in rows
        if isinstance(r, dict)
        and isinstance(r.get("relative_error"), (int, float))
        and not isinstance(r.get("relative_error"), bool)
        and abs(r["relative_error"]) <= 0.10
    )
    return hits / max(len(rows), 1)


def wrap(rows, **overrides):
    """Schema-5 diagnostics whose stated totals agree with ``rows``."""
    diag = {
        "schema_version": 5,
        "weight_entity": "household",
        "n_records": 1000,
        "fraction_within_10pct": within_share(rows),
        "targets": rows,
        **overrides,
    }
    diag.setdefault("target_surface", {"n_targets": len(rows), "n_records": diag["n_records"]})
    return diag


def target(name="a.amount@2024", source=BEA, level="country", concept="c", **extra):
    """A valid administrative target."""
    return {
        "name": name,
        "source": source,
        "metadata": {
            "ledger_geography_level": level,
            "ledger_measure_concept": concept,
            "ledger_measure_unit": "usd",
        },
        "target": 1.0,
        "relative_error": 0.0,
        "period": 2024,
        **extra,
    }


def internal(**extra):
    """A valid build-internal constraint."""
    return {
        "name": "selection_mass_protection.keogh_distributions@0",
        "source": "Locked-source mass measured on the base pool",
        "metadata": {"target_role": "selection_mass_protection"},
        "target": 5.0,
        "relative_error": 0.0,
        "period": 0,
        **extra,
    }


def without(row, key):
    return {k: v for k, v in row.items() if k != key}


def with_metadata(row, **changes):
    return {**row, "metadata": {**row["metadata"], **changes}}


@st.composite
def diagnostics(draw):
    n = draw(st.integers(min_value=1, max_value=60))
    rows = []
    for i in range(n):
        family = draw(st.sampled_from(FAMILIES))
        table = draw(st.sampled_from(TABLES))
        suffix = draw(st.sampled_from(SUFFIXES))
        if draw(st.booleans()) and draw(st.booleans()):
            source = "Locked-source mass (internal)"
            metadata = {"target_role": "selection_mass_protection"}
            period = 0
        else:
            source = f"{family} | {table} | file.csv | 2024 | https://example.org/{family}"
            metadata = {
                "ledger_geography_level": draw(st.sampled_from(GEO_LEVELS)),
                "ledger_measure_concept": f"{family}.{draw(st.sampled_from(CONCEPTS))}",
                "ledger_measure_unit": draw(st.sampled_from(["usd", "count"])),
                "ledger_domain": draw(st.sampled_from(["all_returns", "itemizers", None])),
            }
            period = draw(st.sampled_from([2024, 2023]))
        rows.append(
            {
                "name": f"{family}.{table}.{i}.{suffix}@2024",
                "source": source,
                "metadata": metadata,
                "target": draw(st.floats(min_value=-1e12, max_value=1e12, allow_nan=False)),
                "relative_error": draw(st.floats(min_value=-5, max_value=5, allow_nan=False)),
                "period": period,
            }
        )
    return wrap(rows, n_records=draw(st.integers(1, 10**6)))


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
    within = sum(1 for t in diag["targets"] if abs(t["relative_error"]) <= 0.10)
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
    out = extract(
        wrap(
            [
                target("irs.us.all.return_count@2024", IRS_US_TOTAL,
                       concept="irs_soi.individual_income_tax_returns"),
                target("irs.us.eitc.return_count@2024", IRS_US_TOTAL,
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
    out = extract(wrap([target(), internal()]))
    assert out["levelCounts"] == {"national": 1, "state": 0, "district": 0, "other": 1}
    families = {r["sourceFamily"] for r in out["targets"]}
    assert families == {"bea", "policyengine_build"}


def test_ten_percent_exactly_counts_as_within():
    # The calibrator counts abs(relative_error) <= 0.10 as within tolerance.
    rows = [target(relative_error=0.10), target("b.amount@2024", relative_error=-0.10),
            target("c.amount@2024", relative_error=0.1000001)]
    out = extract(wrap(rows))
    assert out["withinTenPctShare"] == round(2 / 3, 4)
    assert out["targets"][0]["withinTenPctShare"] == round(2 / 3, 4)


def test_internal_constraint_keeps_its_family_whatever_its_source_looks_like():
    row = internal(source="bea | T | f | 2024 | https://example.org/bea")
    out = extract(wrap([target(), row]))
    families = sorted(r["sourceFamily"] for r in out["targets"])
    assert families == ["bea", "policyengine_build"]


def test_empty_domain_is_treated_as_no_domain():
    out = extract(wrap([with_metadata(target(), ledger_domain="")]))
    assert out["targets"][0]["domain"] is None


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


@pytest.mark.parametrize("bad", [[], None, "x", 5])
def test_rejects_diagnostics_that_are_not_an_object(bad):
    with pytest.raises(UnsupportedDiagnostics):
        extract(bad)


@pytest.mark.parametrize(
    "overrides",
    [
        {"schema_version": 4},
        {"schema_version": None},
        {"schema_version": True},
        {"schema_version": [5]},
        {"schema_version": 5.0},
        {"weight_entity": "person"},
        {"n_records": None},
        {"n_records": 0},
        {"n_records": True},
        {"n_records": 1000.0},
        {"targets": []},
        {"targets": {}},
    ],
)
def test_rejects_unsupported_top_level_fields(overrides):
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap([target()], **overrides))


@pytest.mark.parametrize(
    "bad",
    [
        # relative_error is required: a missing one would count as a miss
        without(target(), "relative_error"),
        target(relative_error=None),
        target(relative_error=float("nan")),
        target(relative_error=True),
        # target values must be finite, non-boolean numbers
        target(target=True),
        target(target=float("nan")),
        target(target=float("inf")),
        target(target="1.0"),
        target(target=None),
        # names and sources must be non-empty
        target(name=""),
        target(source=" "),
        # the final name segment is the group's concept suffix
        target(name="@2024"),
        target(name="a.b.@2024"),
        # an administrative citation must be 'family | table | file | vintage |
        # url': anything else would be filed as build-internal or mis-linked
        target(source="bea | T | f | 2024"),
        target(source="bea | T | x | f | 2024 | https://example.org/bea"),
        target(source="bea |  | f | 2024 | https://example.org/bea"),
        target(source="bea | T | f | 2024 | not-a-url"),
        target(source="PolicyEngine Ledger source-backed fact"),
        # administrative targets need a measure concept, a unit, and a year
        with_metadata(target(), ledger_measure_concept=None),
        with_metadata(target(), ledger_measure_concept=""),
        with_metadata(target(), ledger_measure_concept="c "),
        with_metadata(target(), ledger_measure_unit="euros"),
        with_metadata(target(), ledger_measure_unit=None),
        with_metadata(target(), ledger_measure_unit=["usd"]),
        {**target(), "metadata": without(target()["metadata"], "ledger_measure_unit")},
        with_metadata(target(), ledger_domain=["all_returns"]),
        target(period=0),
        target(period=None),
        target(period=True),
        target(period=-1),
        target(period=2024.0),
        target(period=1),
        target(period=20240),
        # geography must be recognised, or the row must declare an internal role
        target(level="county"),
        with_metadata(target(), ledger_geography_level=None),
        {**target(), "metadata": None},
        {**target(), "metadata": []},
        internal(metadata={"target_role": "something_new"}),
        internal(metadata={"target_role": ["selection_mass_protection"]}),
        # an administrative row cannot pass as internal by losing its geography
        # and gaining the internal role
        {**target(), "metadata": {**without(target()["metadata"], "ledger_geography_level"),
                                  "target_role": "selection_mass_protection"}},
        "not a target",
    ],
)
def test_rejects_malformed_targets(bad):
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap([target("ok.amount@2024"), bad]))


def test_missing_measure_concept_cannot_merge_groups():
    # Dropping the concept from the shipped all-returns/EITC pair used to
    # merge them into one "return_count" group; now it is refused.
    rows = [
        with_metadata(target("irs.us.all.return_count@2024", IRS_US_TOTAL), ledger_measure_concept=None),
        with_metadata(target("irs.us.eitc.return_count@2024", IRS_US_TOTAL), ledger_measure_concept=None),
    ]
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap(rows))


def test_rejects_totals_that_disagree_with_the_targets():
    rows = [target(), target("b.amount@2024")]
    # a truncated or padded list no longer matches the stated target count
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap(rows, target_surface={"n_targets": 3, "n_records": 1000}))
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap(rows, target_surface=None))
    # the household count must match the constraint matrix's
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap(rows, target_surface={"n_targets": 2, "n_records": 999}))
    # the stated fit share must equal a recount
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap(rows, fraction_within_10pct=0.5))
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap(rows, fraction_within_10pct=None))
    # duplicate rows would be double-counted
    with pytest.raises(UnsupportedDiagnostics):
        extract(wrap([target(), target()]))


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
