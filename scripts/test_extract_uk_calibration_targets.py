"""
Tests for extract_uk_calibration_targets.

Run:
    PYTHONDONTWRITEBYTECODE=1 uv run --no-project --with pytest \
        pytest -p no:cacheprovider scripts/test_extract_uk_calibration_targets.py

The fixtures are synthetic. To also check that the committed
src/data/ukCalibrationTargets.json is exactly what the script produces from
the licensed release files, set UK_NATIONAL_DIAGNOSTICS, UK_DENSE_DIAGNOSTICS,
UK_DENSE_RELEASE_MANIFEST and UK_BUNDLE_MANIFEST to local copies.
"""

import copy
import hashlib
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(__file__))
from extract_uk_calibration_targets import (  # noqa: E402
    FORBIDDEN_KEYS,
    LABELS,
    PIPELINE_MODEL_VERSION,
    PIPELINE_SOURCE_PATH,
    UnsupportedDiagnostics,
    assert_clean,
    check_pipeline_version,
    extract,
    read_bytes,
    slim_target,
)

COMMITTED = os.path.join(
    os.path.dirname(__file__), "..", "src", "data", "ukCalibrationTargets.json"
)

NATIONAL_ID = "microcosm-uk-2024-25-national-20260101T000000Z-aaaaaaaa"
DENSE_ID = "microcosm-uk-2024-25-dense-20260101T000000Z-bbbbbbbb"
DENSE_H5_SHA = "c" * 64
OBR = "obr | EFO detailed forecast tables: receipts | efo.xlsx | march_2026 | https://example.org/obr"
HMRC_LOCAL = "hmrc | Personal Incomes Statistics tables 3.12 to 3.15a | t.ods | tax_year_2023_24 | https://example.org/hmrc"
HVH = "microcosm | HM Land Registry Price Paid Data, Microcosm derivation | facts.json | ppd_2026_08 | tools/build_uk_high_value_home_stock.py"

# Model figures a diagnostics target carries; none may reach the output.
MODEL_FIGURES = {
    "initial_estimate": 9876501.25,
    "final_estimate": 9876502.25,
    "relative_error": 0.4321987,
    "within_tolerance": False,
    "target_loss_weight": 0.0123987,
    "final_loss_contribution": 0.0456987,
}


def ledger_target(
    name="obr.income_tax@2025",
    concept="obr.income_tax",
    geography="K02000001",
    level="country",
    value=325.0,
    source=OBR,
    **metadata,
):
    return {
        "name": name,
        "source": source,
        "target": value,
        "period": 2025,
        "metadata": {
            "ledger_measure_concept": concept,
            "ledger_measure_unit": "gbp",
            "ledger_geography_id": geography,
            "ledger_geography_level": level,
            "ledger_value_operation": "identity",
            **metadata,
        },
        **MODEL_FIGURES,
    }


def local_target(
    area="E14000001",
    metric="hmrc/employment_income/amount",
    level="constituency",
    area_type="constituency",
    value=10.0,
    source=HMRC_LOCAL,
):
    return {
        "name": f"{metric.replace('/', '.')}@{area}@2025",
        "source": source,
        "target": value,
        "period": 2025,
        "metadata": {
            "metric": metric,
            "family": "hmrc_income_by_area",
            "area_type": area_type,
            "area_code": area,
            "carrier_floor_met": True,
            "model_figures_withheld": False,
        },
        "hierarchy": {"geography": {"id": area, "level": level}},
        **MODEL_FIGURES,
    }


def diagnostics(targets, n_records=100, **overrides):
    diag = {
        "schema_version": 8,
        "weight_entity": "household",
        "n_records": n_records,
        "target_surface": {"n_targets": len(targets), "n_records": n_records},
        "targets": targets,
        "fraction_within_10pct": 0.5,
        "effective_sample_size": 42.5,
        **overrides,
    }
    return diag


def encode(obj) -> bytes:
    return json.dumps(obj).encode()


def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def bundle_for(national_raw: bytes) -> dict:
    return {
        "policyengine_version": "6.11.1",
        "data_releases": {
            "uk": {
                "build_id": NATIONAL_ID,
                "default_dataset": "microcosm_uk_2024_25",
                "policyengine_version": "6.11.1",
                "model_package": {"name": "policyengine-uk", "version": "2.151.0"},
                "datasets": {
                    "calibration_diagnostics": {"revision": NATIONAL_ID, "sha256": sha(national_raw)},
                    "microcosm_uk_2024_25_dense": {"revision": DENSE_ID, "sha256": DENSE_H5_SHA},
                },
            }
        },
    }


def dense_manifest_for(dense_raw: bytes) -> dict:
    return {
        "build": {"cut_tag": DENSE_ID},
        "artifacts": {
            "microcosm_uk_2024_25_dense": {"sha256": DENSE_H5_SHA},
            "calibration_diagnostics": {"sha256": sha(dense_raw)},
        },
    }


def run(national_targets, dense_targets):
    national_raw = encode(diagnostics(national_targets))
    dense_raw = encode(diagnostics(dense_targets, n_records=150))
    return extract(bundle_for(national_raw), dense_manifest_for(dense_raw), national_raw, dense_raw)


def default_pair():
    national = [ledger_target()]
    dense = [ledger_target(), local_target("E14000001"), local_target("E14000002")]
    return national, dense


def test_extracts_target_values_and_counts():
    output, _unused = run(*default_pair())
    assert output["calibrationYear"] == 2025
    assert output["totalTargets"] == {"national": 1, "localArea": 3, "union": 3}
    assert output["releases"]["national"]["buildId"] == NATIONAL_ID
    assert output["releases"]["localArea"]["households"] == 150
    rows = {r["key"]: r for r in output["rows"]}
    income_tax = rows["ledger|obr.income_tax|"]
    assert income_tax["label"] == "Income Tax receipts"
    assert income_tax["nationalValue"] == 325.0
    assert income_tax["nationalValueGeography"] == "United Kingdom"
    assert income_tax["nationalCount"] == 1
    assert income_tax["localAreaFileOnly"] is False
    local = rows["local|hmrc/employment_income/amount|"]
    assert local["constituencyCount"] == 2
    assert local["nationalValue"] is None
    assert local["localAreaFileOnly"] is True


def test_output_carries_no_model_figures():
    output, _unused = run(*default_pair())
    text = json.dumps(output)
    for key, value in MODEL_FIGURES.items():
        assert key not in text
        if not isinstance(value, bool):
            assert repr(value) not in text
    for key in ("carrier_floor_met", "model_figures_withheld", "effective_sample_size", "fraction_within_10pct"):
        assert key not in text


@pytest.mark.parametrize("key", sorted(FORBIDDEN_KEYS))
def test_assert_clean_refuses_forbidden_keys(key):
    with pytest.raises(AssertionError, match=key):
        assert_clean({"rows": [{"label": "x", "nested": {key: 1}}]})


def test_slim_target_keeps_only_whitelisted_fields():
    slim = slim_target(ledger_target(), "national")
    assert not set(slim) & FORBIDDEN_KEYS
    assert not set(slim) & set(MODEL_FIGURES)


@pytest.mark.parametrize(
    "source",
    [
        "obr | EFO tables | efo.xlsx | march_2026",  # four fields
        "obr | EFO tables | efo.xlsx | march_2026 | https://example.org | extra",  # six fields
        "obr |  | efo.xlsx | march_2026 | https://example.org",  # empty table
        "obr | EFO tables | efo.xlsx | march_2026 | example.org/obr",  # not a URL
        "nobody | EFO tables | efo.xlsx | march_2026 | https://example.org",  # unknown publisher
        "microcosm | HVH | f.json | v | /etc/passwd",  # absolute path
        "microcosm | HVH | f.json | v | tools/../../secret.py",  # path escape
        "microcosm | HVH | f.json | v | tools/build stock.py",  # not a path
    ],
)
def test_rejects_malformed_citations(source):
    national = [ledger_target(source=source)]
    with pytest.raises(UnsupportedDiagnostics):
        run(national, national)


def test_accepts_repository_path_for_microcosm_derivations():
    hvh = ledger_target(
        name="uk.dwelling.count.e12000007.over_1m@2025",
        concept="uk.dwelling.count",
        geography="E12000007",
        level="region",
        source=HVH,
        **{"ledger_filter_microcosm.value_threshold": "1000000", "ledger_filter_uk.dwelling.tenure": "owner_occupied"},
    )
    hvh["metadata"]["ledger_measure_unit"] = "count"
    output, _unused = run([ledger_target()], [ledger_target(), hvh])
    row = next(r for r in output["rows"] if r["key"].startswith("ledger|uk.dwelling.count|"))
    assert row["source"].startswith("Microcosm derivation from open data")
    assert row["localAreaFileOnly"] is True


@pytest.mark.parametrize(
    "geography,level",
    [
        ("E14000001", "country"),  # a constituency code at the ledger's country level
        ("E12000007", "country"),  # a region filed as a country
        ("K02000001", "state"),  # unknown ledger level
        ("E92000001", "region"),  # a nation filed as a region
        (None, "country"),
    ],
)
def test_rejects_unknown_ledger_geography(geography, level):
    national = [ledger_target(geography=geography, level=level)]
    with pytest.raises(UnsupportedDiagnostics, match="geography"):
        run(national, national)


@pytest.mark.parametrize(
    "level,area_type",
    [("ward", "ward"), ("constituency", "la"), ("statistical_scope", "lsoa"), (None, None)],
)
def test_rejects_unknown_local_geography(level, area_type):
    national, dense = default_pair()
    dense = dense + [local_target("E05000001", level=level, area_type=area_type)]
    with pytest.raises(UnsupportedDiagnostics, match="local geography"):
        run(national, dense)


def test_rejects_unlabelled_row_keys():
    national = [ledger_target(name="obr.new_line@2025", concept="obr.new_line")]
    with pytest.raises(UnsupportedDiagnostics, match=r"(?s)no label for row key.*ledger\|obr\.new_line\|"):
        run(national, national)


def test_rejects_unlabelled_local_metric():
    national, dense = default_pair()
    dense = dense + [local_target(metric="energy/heat_pumps")]
    with pytest.raises(UnsupportedDiagnostics, match=r"local\|energy/heat_pumps\|"):
        run(national, dense)


def test_rejects_unknown_value_operation_and_uprating_index():
    with pytest.raises(UnsupportedDiagnostics, match="value operation"):
        national = [ledger_target(ledger_value_operation="model_estimate")]
        run(national, national)
    with pytest.raises(UnsupportedDiagnostics, match="uprating index"):
        national = [ledger_target(uprating_factor="1.05", uprating_index="made.up.index")]
        run(national, national)


def test_rejects_breakdowns_without_a_name(monkeypatch):
    monkeypatch.setitem(LABELS, "ledger|obr.income_tax|new_dimension", {"label": "Income Tax receipts"})
    national = [
        ledger_target(name=f"obr.income_tax.{v}@2025", ledger_filter_new_dimension=v)
        for v in ("a", "b")
    ]
    with pytest.raises(UnsupportedDiagnostics, match="breakdown name"):
        run(national, national)


def _raw_pair():
    national, dense = default_pair()
    national_raw = encode(diagnostics(national))
    dense_raw = encode(diagnostics(dense, n_records=150))
    return national_raw, dense_raw


def test_rejects_national_sha_mismatch():
    national_raw, dense_raw = _raw_pair()
    bundle = bundle_for(national_raw)
    tampered = national_raw.replace(b"325.0", b"326.0")
    with pytest.raises(UnsupportedDiagnostics, match="national diagnostics sha256"):
        extract(bundle, dense_manifest_for(dense_raw), tampered, dense_raw)


def test_rejects_dense_sha_mismatch():
    national_raw, dense_raw = _raw_pair()
    manifest = dense_manifest_for(dense_raw)
    tampered = dense_raw.replace(b"10.0", b"11.0")
    with pytest.raises(UnsupportedDiagnostics, match="dense diagnostics sha256"):
        extract(bundle_for(national_raw), manifest, national_raw, tampered)


def test_rejects_dense_manifest_not_served_by_the_bundle():
    national_raw, dense_raw = _raw_pair()
    other_h5 = dense_manifest_for(dense_raw)
    other_h5["artifacts"]["microcosm_uk_2024_25_dense"]["sha256"] = "d" * 64
    with pytest.raises(UnsupportedDiagnostics, match="microcosm_uk_2024_25_dense sha256"):
        extract(bundle_for(national_raw), other_h5, national_raw, dense_raw)
    other_tag = dense_manifest_for(dense_raw)
    other_tag["build"]["cut_tag"] = "microcosm-uk-2024-25-dense-20250101T000000Z-cccccccc"
    with pytest.raises(UnsupportedDiagnostics, match="not the bundle's local-area release"):
        extract(bundle_for(national_raw), other_tag, national_raw, dense_raw)


def test_rejects_values_that_differ_between_releases():
    national = [ledger_target(value=325.0)]
    dense = [ledger_target(value=330.0)]
    with pytest.raises(UnsupportedDiagnostics, match="values differ"):
        run(national, dense)


@pytest.mark.parametrize(
    "change",
    [
        {"schema_version": 5},
        {"weight_entity": "person"},
        {"n_records": 0},
        {"target_surface": {"n_targets": 99, "n_records": 100}},
    ],
)
def test_rejects_diagnostics_it_would_misread(change):
    national, dense = default_pair()
    national_raw = encode({**diagnostics(national), **change})
    dense_raw = encode(diagnostics(dense, n_records=150))
    with pytest.raises(UnsupportedDiagnostics):
        extract(bundle_for(national_raw), dense_manifest_for(dense_raw), national_raw, dense_raw)


def test_rejects_non_finite_or_missing_values():
    for bad in (float("nan"), None, "1", True):
        target = ledger_target()
        target["target"] = bad
        with pytest.raises(UnsupportedDiagnostics, match="target value"):
            run([target], [copy.deepcopy(target)])


RELEASE_FILES = (
    "UK_NATIONAL_DIAGNOSTICS",
    "UK_DENSE_DIAGNOSTICS",
    "UK_DENSE_RELEASE_MANIFEST",
    "UK_BUNDLE_MANIFEST",
)


@pytest.mark.skipif(
    not all(os.environ.get(v) for v in RELEASE_FILES),
    reason="set " + ", ".join(RELEASE_FILES) + " to check the committed JSON",
)
def test_committed_json_is_the_extraction():
    output, _unused = extract(
        json.loads(read_bytes(os.environ["UK_BUNDLE_MANIFEST"])),
        json.loads(read_bytes(os.environ["UK_DENSE_RELEASE_MANIFEST"])),
        read_bytes(os.environ["UK_NATIONAL_DIAGNOSTICS"]),
        read_bytes(os.environ["UK_DENSE_DIAGNOSTICS"]),
    )
    with open(COMMITTED) as f:
        assert json.load(f) == json.loads(json.dumps(output))


def test_releases_must_match_the_pipeline_pages_engine():
    page = "export const ukPipelineSource = {\n  commit: 'abc',\n  modelVersion: '2.162.8',\n};\n"
    check_pipeline_version("2.162.8", page)
    with pytest.raises(
        UnsupportedDiagnostics, match="describes policyengine-uk 2.162.8, but these releases were built with 2.151.0"
    ):
        check_pipeline_version("2.151.0", page)
    with pytest.raises(UnsupportedDiagnostics, match="no ukPipelineSource"):
        check_pipeline_version("2.162.8", "export const ukPipelineStages = [];")


def test_the_pipeline_pages_engine_version_is_readable():
    with open(PIPELINE_SOURCE_PATH) as f:
        source = f.read()
    match = PIPELINE_MODEL_VERSION.search(source)
    assert match is not None
    check_pipeline_version(match.group(1), source)
