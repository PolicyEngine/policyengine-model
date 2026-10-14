"""Tests for extract_uk_release.py on a small synthetic release.

    uv run --no-project --with pytest --with hypothesis --with h5py --with tables \\
      --with pandas --with numpy pytest scripts/test_extract_uk_release.py
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import extract_uk_release as ex
import h5py
import numpy as np
import pandas as pd
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

N_FRS = 4
N_SPI = 2


def _households() -> pd.DataFrame:
    """4 FRS households, 2 SPI copies, a capital gains copy of each, 1 donor."""
    rows = []
    for i in range(N_FRS):
        rows.append(
            dict(
                spi=False,
                gains=False,
                donor=False,
                region="WALES" if i == 0 else "LONDON",
            )
        )
    for i in range(N_SPI):
        rows.append(dict(spi=True, gains=False, donor=False, region="LONDON"))
    for r in list(rows):
        rows.append({**r, "gains": True})
    rows.append(dict(spi=False, gains=True, donor=True, region="NORTHERN_IRELAND"))
    hh = pd.DataFrame(rows)
    n = len(hh)
    ni = hh["region"] == "NORTHERN_IRELAND"
    return pd.DataFrame(
        {
            "household_id": np.arange(n),
            "household_weight": np.linspace(100, 200, n),
            "region": hh["region"],
            "household_is_spi_synthetic": hh["spi"],
            "household_is_capital_gains_clone": hh["gains"],
            "household_is_cgt_band_donor": hh["donor"],
            "source_household_id": np.arange(n) + 1000,
            "clone_index": 0,
            "constituency_code_oa": np.where(
                ni, "", np.where(hh["region"] == "WALES", "W07000001", "E14000001")
            ),
            "la_code_oa": np.where(ni, "", "E06000001"),
        }
    )


def _write_dataset(
    path: Path, household: pd.DataFrame, people_per_household: int = 2
) -> None:
    n = len(household)
    person = pd.DataFrame(
        {
            "person_household_id": np.repeat(
                household["household_id"], people_per_household
            )
        }
    )
    benunit = pd.DataFrame({"benunit_id": np.arange(n)})
    household.to_hdf(path, key="household", format="table")
    person.to_hdf(path, key="person", format="table")
    benunit.to_hdf(path, key="benunit", format="table")
    pd.Series(["2024"]).to_hdf(path, key="time_period", format="table")


def _write_weights(path: Path, areas: int, weights: np.ndarray, ratio: float) -> None:
    matrix = np.tile(weights * ratio / areas, (areas, 1))
    with h5py.File(path, "w") as f:
        f.create_dataset("2025", data=matrix.astype(np.float64))


def _log(
    areas: int,
    national: list[tuple[str, float, float]],
    local_metrics: dict[str, tuple[float, float]],
) -> pd.DataFrame:
    rows = []
    for epoch in (0, 10):
        for a in range(areas):
            for metric, (target, estimate) in local_metrics.items():
                rows.append(
                    dict(
                        index=f"A{a}",
                        name=f"Area {a}",
                        metric=metric,
                        estimate=estimate if epoch else 0.0,
                        target=target,
                        validation=metric == ex.HELD_OUT_LOCAL,
                        epoch=epoch,
                    )
                )
        for metric, target, estimate in national:
            rows.append(
                dict(
                    index=0,
                    name="UK",
                    metric=metric,
                    estimate=estimate if epoch else 0.0,
                    target=target,
                    validation=False,
                    epoch=epoch,
                )
            )
    return pd.DataFrame(rows)


NATIONAL = [
    ("obr/income_tax", 100.0, 105.0),
    ("obr/vat", 50.0, 80.0),
    ("slc/plan_5_borrowers_above_threshold", 0.0, 3.0),
]
LOCAL = {
    "age/0_10": (10.0, 10.5),
    "hmrc/employment_income/amount": (20.0, 30.0),
    ex.HELD_OUT_LOCAL: (5.0, 9.0),
    "housing/wales_private_rent_amount": (0.0, 0.0),
}
REGISTRY = [
    dict(
        name="obr/income_tax",
        variable="income_tax",
        source="obr",
        unit="gbp",
        geographic_level="national",
        breakdown_variable=None,
        reference_url="https://obr.uk/x",
        forecast_vintage="march_2026",
        countries=None,
        geo_name=None,
        values={"2025": 100.0},
    ),
    dict(
        name="obr/vat",
        variable="vat",
        source="obr",
        unit="gbp",
        geographic_level="national",
        breakdown_variable=None,
        reference_url="https://obr.uk/x",
        forecast_vintage="march_2026",
        countries=None,
        geo_name=None,
        values={"2025": 50.0},
    ),
    dict(
        name="slc/plan_5_borrowers_above_threshold",
        variable="student_loan_plan",
        source="slc",
        unit="count",
        geographic_level="national",
        breakdown_variable=None,
        reference_url="https://slc.example",
        forecast_vintage=None,
        countries=["ENGLAND", "SCOTLAND", "WALES"],
        geo_name=None,
        values={"2024": 0.0},
    ),
]


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@pytest.fixture
def artifacts(tmp_path: Path) -> Path:
    d = tmp_path / "release"
    d.mkdir()
    base = (
        _households()
        .query(
            "~household_is_spi_synthetic and ~household_is_capital_gains_clone and ~household_is_cgt_band_donor"
        )
        .copy()
    )
    _write_dataset(d / "frs_2024_25.h5", base)
    enhanced = _households()
    _write_dataset(d / "enhanced_frs_2024_25.h5", enhanced)
    _write_weights(
        d / "parliamentary_constituency_weights.h5",
        3,
        enhanced["household_weight"].to_numpy(),
        1.01,
    )
    _write_weights(
        d / "local_authority_weights.h5",
        2,
        enhanced["household_weight"].to_numpy(),
        1.0,
    )
    _log(3, NATIONAL, LOCAL).to_csv(d / "constituency_calibration_log.csv", index=False)
    _log(2, NATIONAL, LOCAL).to_csv(d / "la_calibration_log.csv", index=False)
    (d / "registry_targets.json").write_text(json.dumps(REGISTRY))
    with open(d / "pinned_target_check.csv", "w") as f:
        f.write(
            "# policyengine_uk=2.126.12\n# policyengine_core=3.33.0\n"
            "# policyengine_uk_data=1.58.0\n"
            f"# dataset_sha256={_sha(d / 'enhanced_frs_2024_25.h5')}\n"
            "# year=2025\n# people=40\n# households=1500\n"
        )
        pd.DataFrame(
            [(m, t, e * 1.02) for m, t, e in NATIONAL],
            columns=["metric", "target", "estimate"],
        ).to_csv(f, index=False)
    names = [
        "enhanced_frs_2024_25",
        "frs_2024_25",
        "parliamentary_constituency_weights",
        "local_authority_weights",
    ]
    files = {
        "enhanced_frs_2024_25": "enhanced_frs_2024_25.h5",
        "frs_2024_25": "frs_2024_25.h5",
        "parliamentary_constituency_weights": "parliamentary_constituency_weights.h5",
        "local_authority_weights": "local_authority_weights.h5",
    }
    manifest = {
        "data_package": {"name": "policyengine-uk-data", "version": "1.58.0"},
        "default_datasets": {"national": "enhanced_frs_2024_25"},
        "artifacts": {
            n: {"path": files[n], "sha256": _sha(d / files[n])} for n in names
        },
        "build": {
            "built_at": "2026-10-07T17:31:53Z",
            "built_with_model_package": {"version": "2.122.2"},
            "built_with_core_package": {"version": "3.32.13"},
            "metadata": {"data_package_git_sha": "abc"},
        },
    }
    (d / "release_manifest.json").write_text(json.dumps(manifest))
    bundle = {
        "bundle_version": "6.3.4",
        "data_releases": {
            "uk": {
                "model_package": {"version": "2.126.12"},
                "data_package": {
                    "name": "policyengine-uk-data",
                    "version": "1.58.0",
                    "release_manifest_revision": "rev",
                },
                "default_dataset": "enhanced_frs_2024_25",
                "datasets": {
                    "enhanced_frs_2024_25": {
                        "sha256": manifest["artifacts"]["enhanced_frs_2024_25"][
                            "sha256"
                        ]
                    }
                },
                "region_datasets": {"national": {}},
            }
        },
    }
    (d / "bundle_manifest.json").write_text(json.dumps(bundle))
    return d


def run(d: Path) -> dict:
    return ex.extract(d, d / "registry_targets.json")


def test_extracts_counts_composition_and_geography(artifacts):
    out = run(artifacts)
    assert (
        out["release"]["dataVersion"] == "1.58.0"
        and out["release"]["modelVersion"] == "2.126.12"
    )
    assert out["base"]["households"] == N_FRS and out["base"]["people"] == 2 * N_FRS
    c = out["enhanced"]["composition"]
    assert (c["frs"], c["spiCopies"], c["capitalGainsCopies"], c["cgtBandDonors"]) == (
        N_FRS,
        N_SPI,
        N_FRS + N_SPI,
        1,
    )
    assert (
        c["frs"] + c["spiCopies"] + c["capitalGainsCopies"] + c["cgtBandDonors"]
        == out["enhanced"]["households"]
    )
    g = out["enhanced"]["geography"]
    assert g["householdsWithoutArea"] == 1 and g["regionsWithoutArea"] == [
        "NORTHERN_IRELAND"
    ]
    assert g["outputAreaDrawsPerHousehold"] == 1
    assert out["weightMatrices"]["columnSumPerSavedWeight"] == pytest.approx(1.01)


def test_scores_fit_on_nonzero_targets_and_holds_out_the_validation_metric(artifacts):
    out = run(artifacts)
    cal = out["calibration"]
    assert cal["nationalTargets"] == 3 and cal["nationalZeroTargets"] == 1
    assert (
        cal["nationalWithin10"] == 0.5
    )  # income tax within 10%, VAT not, zero target unscored
    local = cal["constituency"]
    assert (
        local["structuralZeroCells"] == 3
    )  # the Welsh rent anchor, zero and met in every area
    assert local["trainingCells"] == 6 and local["trainingWithin10"] == 0.5
    assert local["heldOut"] == {
        "metric": ex.HELD_OUT_LOCAL,
        "cells": 3,
        "within10": 0.0,
    }
    held = [f for f in local["families"] if f["heldOut"]]
    assert (
        len(held) == 1 and held[0]["label"] == "Income taxpayers with employment income"
    )
    v = out["validation"]
    assert (
        v["targets"] == 3 and v["zeroTargets"] == 1 and v["modelVersion"] == "2.126.12"
    )
    assert len(v["rows"]) == 3 and {r["id"] for r in v["rows"]} == {
        m for m, *_ in NATIONAL
    }


def test_scores_the_pinned_run_against_the_targets_calibration_fitted(artifacts):
    """A target the pinned run rebuilds at another value is still scored at the
    value calibration fitted, and listed as revised."""
    path = artifacts / "pinned_target_check.csv"
    text = path.read_text().replace("obr/vat,50.0,", "obr/vat,81.0,")
    path.write_text(text)
    v = run(artifacts)["validation"]
    assert v["revisedTargets"] == ["obr/vat"]
    assert v["within10"] == 0.5  # VAT's 81.6 still misses the fitted 50
    vat = next(r for r in v["rows"] if r["id"] == "obr/vat")
    assert vat["target"] == 50.0


@pytest.mark.parametrize(
    "line, replacement",
    [
        ("# dataset_sha256=", "# dataset_sha256=0"),  # another file
        ("# policyengine_uk_data=1.58.0", "# policyengine_uk_data=1.58.1"),
        ("# year=2025", "# year=2026"),
    ],
)
def test_rejects_a_pinned_check_of_another_file_package_or_year(
    artifacts, line, replacement
):
    path = artifacts / "pinned_target_check.csv"
    path.write_text(path.read_text().replace(line, replacement, 1))
    _expect_error(artifacts, "pinned check has")


def test_is_deterministic_and_independent_of_log_row_order(artifacts):
    first = run(artifacts)
    log = pd.read_csv(artifacts / "constituency_calibration_log.csv")
    log.sample(frac=1, random_state=3).to_csv(
        artifacts / "constituency_calibration_log.csv", index=False
    )
    assert run(artifacts) == first


def _expect_error(d: Path, match: str):
    with pytest.raises(ex.ExtractionError, match=match):
        run(d)


def test_rejects_a_file_whose_hash_differs_from_the_release(artifacts):
    with h5py.File(artifacts / "local_authority_weights.h5", "a") as f:
        f["2025"][0, 0] = 1e9
    _expect_error(artifacts, "sha256")


def test_rejects_a_release_other_than_the_pin(artifacts):
    manifest = json.loads((artifacts / "release_manifest.json").read_text())
    manifest["data_package"]["version"] = "1.58.1"
    (artifacts / "release_manifest.json").write_text(json.dumps(manifest))
    _expect_error(artifacts, "bundle pins")


def test_rejects_an_unlabelled_target_group(artifacts, monkeypatch):
    monkeypatch.delitem(ex.GROUP_LABELS, ("obr", "vat", "national", None))
    _expect_error(artifacts, "no label")


def test_rejects_a_local_metric_with_no_family(artifacts):
    log = pd.read_csv(artifacts / "la_calibration_log.csv")
    extra = log[log["metric"] == "age/0_10"].assign(metric="mystery/metric")
    pd.concat([log, extra]).to_csv(artifacts / "la_calibration_log.csv", index=False)
    _expect_error(artifacts, "no family")


def test_rejects_a_pinned_check_from_another_model_version(artifacts):
    text = (
        (artifacts / "pinned_target_check.csv")
        .read_text()
        .replace("2.126.12", "2.130.1")
    )
    (artifacts / "pinned_target_check.csv").write_text(text)
    _expect_error(artifacts, "bundle pins")


def test_rejects_a_zero_local_target_with_a_nonzero_estimate(artifacts):
    log = pd.read_csv(artifacts / "constituency_calibration_log.csv")
    log.loc[
        (log["metric"] == "housing/wales_private_rent_amount") & (log["epoch"] == 10),
        "estimate",
    ] = 4.0
    log.to_csv(artifacts / "constituency_calibration_log.csv", index=False)
    _expect_error(artifacts, "structural zero")


def test_rejects_repeated_source_households(artifacts):
    tables = {
        k: pd.read_hdf(artifacts / "enhanced_frs_2024_25.h5", k)
        for k in ("household", "person", "benunit", "time_period")
    }
    hh = tables["household"]
    hh.loc[1, "source_household_id"] = hh.loc[0, "source_household_id"]
    path = artifacts / "enhanced_frs_2024_25.h5"
    path.unlink()
    for k, frame in tables.items():
        frame.to_hdf(path, key=k, format="table")
    manifest = json.loads((artifacts / "release_manifest.json").read_text())
    manifest["artifacts"]["enhanced_frs_2024_25"]["sha256"] = _sha(path)
    (artifacts / "release_manifest.json").write_text(json.dumps(manifest))
    bundle = json.loads((artifacts / "bundle_manifest.json").read_text())
    bundle["data_releases"]["uk"]["datasets"]["enhanced_frs_2024_25"]["sha256"] = _sha(
        path
    )
    (artifacts / "bundle_manifest.json").write_text(json.dumps(bundle))
    check = artifacts / "pinned_target_check.csv"
    check.write_text(
        re.sub(
            r"# dataset_sha256=\w+", f"# dataset_sha256={_sha(path)}", check.read_text()
        )
    )
    _expect_error(artifacts, "more than one Output Area")


finite = st.floats(
    min_value=-1e12, max_value=1e12, allow_nan=False, allow_infinity=False
)


@settings(max_examples=200, deadline=None)
@given(
    st.lists(st.tuples(finite, finite), min_size=1, max_size=40), st.floats(0.001, 2)
)
def test_fit_share_is_a_share_of_the_nonzero_targets(pairs, tolerance):
    targets = pd.Series([t for t, _ in pairs])
    estimates = pd.Series([e for _, e in pairs])
    share = ex.fit_share(estimates, targets, tolerance)
    scorable = [(t, e) for t, e in pairs if t != 0]
    if not scorable:
        assert share is None
        return
    expected = sum(abs(e / t - 1) < tolerance for t, e in scorable) / len(scorable)
    assert 0 <= share <= 1
    assert share == round(expected, 6)
    assert (
        ex.fit_share(estimates, targets, tolerance * 2) >= share
    )  # wider tolerance never scores fewer


REPO = Path(__file__).resolve().parent.parent


@pytest.mark.skipif(
    not __import__("os").environ.get("UK_RELEASE_ARTIFACTS"),
    reason="set UK_RELEASE_ARTIFACTS to the pinned release's files to run the differential check",
)
def test_committed_summary_equals_a_fresh_extraction():
    artifacts = Path(__import__("os").environ["UK_RELEASE_ARTIFACTS"])
    fresh = ex.extract(artifacts, artifacts / "registry_targets.json")
    rows = fresh["validation"].pop("rows")
    assert json.loads((REPO / "src/data/ukDataRelease.json").read_text()) == json.loads(
        json.dumps(fresh)
    )
    assert json.loads(
        (REPO / "src/data/ukTargetChecks.json").read_text()
    ) == json.loads(json.dumps(rows))


def test_labels_a_family_by_its_country_scope(artifacts):
    groups = {g["label"]: g for g in run(artifacts)["calibration"]["nationalGroups"]}
    assert groups["Income tax receipts"]["geography"] == "UK"
    assert (
        groups["Plan 2 and Plan 5 borrowers, liable and above the repayment threshold"][
            "geography"
        ]
        == "England"  # slc.py counts England's borrowers, whatever the registry scope
    )


def test_names_publishers_and_counts_targets_carried_from_an_earlier_year(artifacts):
    cal = run(artifacts)["calibration"]
    plan = next(g for g in cal["nationalGroups"] if g["source"] == "slc")
    assert plan["publisher"] == "Explore Education Statistics"
    assert cal["targetsWithoutYearValue"] == 1  # the Plan 5 target lists only 2024
    assert cal["nationalTargetsByArea"] == {"UK": 2, "England": 1}


# The extractor's labels, areas, publishers and notes restate the release's
# code. Re-extracting the release can't catch a restatement that has gone
# wrong, so this reads the data package's source directly:
# UK_DATA_SOURCE=/path/to/policyengine-uk-data (at the pinned release).
DATA_SOURCE = __import__("os").environ.get("UK_DATA_SOURCE")


def _read(path: str) -> str:
    return (Path(DATA_SOURCE) / "policyengine_uk_data" / path).read_text()


@pytest.mark.skipif(
    not DATA_SOURCE, reason="set UK_DATA_SOURCE to policyengine-uk-data at the pin"
)
def test_area_overrides_and_notes_restate_the_data_package():
    import re

    obr = _read("targets/sources/obr.py")
    rows = obr[
        obr.index("benefit_rows = {") : obr.index(
            "targets = []", obr.index("benefit_rows = {")
        )
    ]
    benefit_targets = {
        f"obr/{name}" for name in re.findall(r'^\s+"(\w+)": \(', rows, re.M)
    }
    great_britain = {
        m for m, area in ex.AREA_BY_TARGET.items() if area == "Great Britain"
    }
    # Every DWP benefit row but Child Benefit (HMRC) is a Great Britain line
    # built without a country restriction.
    assert great_britain == benefit_targets - {"obr/child_benefit"}
    assert "countries=" not in rows
    assert "which covers Great Britain" in obr
    assert '"NI domestic rates"' in obr and "obr/domestic_rates" in ex.AREA_BY_TARGET
    assert "_PRIVATE_SCHOOL = {y: 557_000 for y in range(2018, 2032)}" in obr
    for figure in (
        "7_700_000",
        "4_300_000",
        "3_300_000",
        "_SS_HEADCOUNT_GROWTH = 1.024",
    ):
        assert figure in obr
    assert 'uprating.loc[row, "2023"]' in _read("targets/compute/income.py")
    assert "Borrower counts for England only" in _read("targets/sources/slc.py")
    assert "_MORTGAGE_TOTAL = 1_100 * 12 * 7.5e6" in _read("targets/sources/housing.py")
    assert "_PROPERTY_INCOME_SCALE = 1.9" in _read("targets/sources/hmrc_spi.py")
    land = _read("targets/sources/_land.py")
    assert "_ONS_2020_HOUSEHOLD" in land
    assert "2025: HOUSEHOLD_LAND_VALUES[2024]" in land
    assert 'df["dwellings"] * df["avg_house_price"]' in _read(
        "targets/sources/mhclg_regional_land.py"
    )
    assert "float(_CGT_TAXPAYERS) for year in range" in _read(
        "targets/sources/hmrc_cgt.py"
    )


@pytest.mark.skipif(
    not DATA_SOURCE, reason="set UK_DATA_SOURCE to policyengine-uk-data at the pin"
)
def test_local_notes_restate_the_loss_builders():
    import re

    uc = _read("targets/sources/local_uc.py")
    assert "(positional order)" in uc
    assert 'scaled["N"] = gb_bucket_totals.copy()' in uc  # NI takes GB's child shares
    for area in ("constituencies", "local_authorities"):
        loss = _read(f"datasets/local_areas/{area}/loss.py")
        assert re.search(r'y\["uc_households"\] = get_\w+_uc_targets\(\)\.values', loss)
        assert "y[col] *= uk_total_population / targets_total_pop * 0.9" in loss
        assert re.search(
            r'y\[f"hmrc/\{income_variable\}/count"\] = \(\s*incomes\[f"\{income_variable\}_count"\]\.values \* adjustment',
            loss,
        )
    assert "mapping_matrix @ y.values" in _read(
        "datasets/local_areas/constituencies/loss.py"
    )
    fill = _read(
        "datasets/local_areas/local_authorities/targets/create_total_incomes.py"
    )
    assert "df[col] = df[col].fillna(avg)" in fill
    held = _read("datasets/create_datasets.py")
    assert f'VALIDATION_ONLY_LOCAL_TARGETS = ["{ex.HELD_OUT_LOCAL}"]' in held
