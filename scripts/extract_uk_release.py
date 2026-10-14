"""Summarise the UK data release that policyengine.py pins, for the model pages.

The UK pipeline, calibration and validation pages quote this file, not
typed-in numbers. Regenerate it whenever policyengine.py moves its UK pin:

    uv run --no-project --with h5py --with tables --with pandas --with numpy \\
      python scripts/extract_uk_release.py --artifacts <dir> \\
      --out src/data/ukDataRelease.json --rows-out src/data/ukTargetChecks.json

``<dir>`` holds the pinned release's files, unmodified:

- ``bundle_manifest.json``: policyengine.py ``src/policyengine/data/bundle/manifest.json``
  at the pinned tag.
- ``release_manifest.json``: the data release's manifest, from the revision the
  bundle names (``data_package.release_manifest_revision``).
- ``frs_2024_25.h5``, ``enhanced_frs_2024_25.h5``,
  ``parliamentary_constituency_weights.h5``, ``local_authority_weights.h5``:
  release files; their sha256 must match the release manifest.
- ``constituency_calibration_log.csv``, ``la_calibration_log.csv``: the
  calibration logs the publish run uploads as GitHub Actions artifacts.
- ``registry_targets.json``: the release's national target registry, dumped
  with ``scripts/dump_uk_target_registry.py`` from the data package at the
  release tag.
- ``pinned_target_check.csv``: every national target scored on the released
  file by the model version the bundle pins, from
  ``scripts/run_uk_target_check.py``.

Only aggregates are written. No household record leaves the input files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

SCHEMA_VERSION = 1
WITHIN = 0.10  # "within 10%" is |estimate / target - 1| < 0.10

# Who publishes each registry `source`. Labels follow GOV.UK's organisation titles.
PUBLISHERS = {
    "dwp": "DWP",
    "ehs": "English Housing Survey and ONS",
    "hmrc": "HMRC",
    "hmrc_spi": "HMRC Survey of Personal Incomes",
    "nts": "DfT National Travel Survey",
    "obr": "OBR",
    "ons": "ONS",
    "scotland_census": "Scotland's Census",
    "scottish_government": "Scottish Government",
    "slc": "Student Loans Company",
    "voa": "Valuation Office Agency",
}

# Registry targets whose `source` code names the wrong publisher; the
# reference URL in the registry is the authority.
PUBLISHER_BY_TARGET = {
    "obr/private_school_students": "Independent Schools Council census",
    "obr/salary_sacrifice_users_total": "HM Treasury and HMRC",
    "obr/salary_sacrifice_users_below_cap": "HM Treasury and HMRC",
    "obr/salary_sacrifice_users_above_cap": "HM Treasury and HMRC",
}

# One row per (source, variable, geographic level, breakdown). Every group in
# the release must have a label here, or extraction fails.
GROUP_LABELS = {
    (
        "dwp",
        "benefit_cap_reduction",
        "national",
        None,
    ): "Benefit cap: households capped and total reduction",
    ("dwp", "esa", "national", None): "Employment and Support Allowance claimants",
    ("dwp", "esa_contrib", "national", None): "Contribution-based ESA claimants",
    ("dwp", "esa_income", "national", None): "Income-related ESA claimants",
    ("dwp", "jsa_contrib", "national", None): "Jobseeker's Allowance claimants",
    (
        "dwp",
        "housing_benefit",
        "national",
        None,
    ): "Housing Benefit claims and spending, by age group",
    ("dwp", "pension_credit", "national", None): "Pension Credit claims and spending",
    (
        "dwp",
        "pip_dl_category",
        "national",
        None,
    ): "PIP daily living claimants, standard and enhanced rate",
    (
        "dwp",
        "universal_credit",
        "national",
        None,
    ): "Universal Credit households by family type and number of children",
    (
        "dwp",
        "universal_credit",
        "national",
        "universal_credit",
    ): "Universal Credit households by family type and annual award band",
    ("ehs", "rent", "national", None): "Private and social rent paid",
    (
        "hmrc",
        "capital_gains",
        "national",
        None,
    ): "Capital gains: taxpayers and gains, in total and by size of gain",
    (
        "hmrc",
        "income_tax",
        "national",
        None,
    ): "Salary sacrifice: income tax relief by rate band",
    (
        "hmrc",
        "ni_employee",
        "national",
        None,
    ): "Salary sacrifice: employee National Insurance relief",
    (
        "hmrc",
        "ni_employer",
        "national",
        None,
    ): "Salary sacrifice: employer National Insurance relief",
    (
        "hmrc",
        "pension_contributions_via_salary_sacrifice",
        "national",
        None,
    ): "Pension contributions made through salary sacrifice",
    (
        "hmrc_spi",
        "employment_income",
        "national",
        "total_income",
    ): "Employment income: taxpayers and amounts, by total income band",
    (
        "hmrc_spi",
        "self_employment_income",
        "national",
        "total_income",
    ): "Self-employment income: taxpayers and amounts, by total income band",
    (
        "hmrc_spi",
        "private_pension_income",
        "national",
        "total_income",
    ): "Private pension income: taxpayers and amounts, by total income band",
    (
        "hmrc_spi",
        "state_pension",
        "national",
        "total_income",
    ): "State Pension: taxpayers and amounts, by total income band",
    (
        "hmrc_spi",
        "property_income",
        "national",
        "total_income",
    ): "Property income: taxpayers and amounts, by total income band",
    (
        "hmrc_spi",
        "dividend_income",
        "national",
        "total_income",
    ): "Dividend income: taxpayers and amounts, by total income band",
    (
        "nts",
        "num_vehicles",
        "national",
        None,
    ): "Households with no, one, and two or more vehicles",
    ("obr", "income_tax", "national", None): "Income tax receipts",
    (
        "obr",
        "ni_employee",
        "national",
        None,
    ): "National Insurance receipts, in total and from employees",
    ("obr", "ni_employer", "national", None): "Employer National Insurance receipts",
    (
        "obr",
        "ni_self_employed",
        "national",
        None,
    ): "Self-employed National Insurance receipts",
    ("obr", "vat", "national", None): "VAT receipts",
    ("obr", "fuel_duty", "national", None): "Fuel duty receipts",
    ("obr", "capital_gains_tax", "national", None): "Capital gains tax receipts",
    ("obr", "stamp_duty_land_tax", "national", None): "Stamp Duty Land Tax receipts",
    ("obr", "council_tax", "national", None): "Council tax receipts, UK and by nation",
    (
        "obr",
        "domestic_rates",
        "national",
        None,
    ): "Northern Ireland domestic rates receipts",
    ("obr", "tv_licence", "national", None): "TV licence fee receipts",
    ("obr", "universal_credit", "national", None): "Universal Credit spending",
    ("obr", "state_pension", "national", None): "State Pension spending",
    ("obr", "pip", "national", None): "Personal Independence Payment spending",
    ("obr", "child_benefit", "national", None): "Child Benefit spending",
    ("obr", "attendance_allowance", "national", None): "Attendance Allowance spending",
    ("obr", "carers_allowance", "national", None): "Carer's Allowance spending",
    (
        "obr",
        "esa_income",
        "national",
        None,
    ): "Incapacity benefits spending, scored against income-related ESA",
    ("obr", "jsa", "national", None): "Jobseeker's Allowance spending",
    ("obr", "winter_fuel_allowance", "national", None): "Winter Fuel Payment spending",
    (
        "obr",
        "statutory_maternity_pay",
        "national",
        None,
    ): "Statutory Maternity Pay spending",
    (
        "obr",
        "attends_private_school",
        "national",
        None,
    ): "Pupils at independent schools",
    (
        "obr",
        "pension_contributions_via_salary_sacrifice",
        "national",
        None,
    ): "Salary sacrifice users, in total and either side of the £2,000 cap",
    (
        "ons",
        "age",
        "national",
        None,
    ): "UK population, in total and by sex and five-year age band",
    ("ons", "age", "region", None): "Population by region and ten-year age band",
    ("ons", "family_type", "national", None): "Households by family type",
    ("ons", "tenure_type", "country", None): "Dwellings by tenure, by nation",
    (
        "ons",
        "employment_status",
        "national",
        None,
    ): "Employees and self-employed people",
    ("ons", "employment_sector", "national", None): "Public sector employment",
    ("ons", "savings_interest_income", "national", None): "Household savings interest",
    ("ons", "mortgage_capital_repayment", "national", None): "Mortgage payments",
    ("ons", "land_value", "national", None): "Total land value",
    ("ons", "household_land_value", "national", None): "Household land value",
    ("ons", "household_land_value", "region", None): "Household land value by region",
    ("ons", "corporate_land_value", "national", None): "Corporate land value",
    (
        "scotland_census",
        "is_child",
        "country",
        None,
    ): "Scottish households with three or more children",
    (
        "scottish_government",
        "scottish_child_payment",
        "country",
        None,
    ): "Scottish Child Payment spending",
    (
        "slc",
        "maintenance_loan",
        "national",
        None,
    ): "Maintenance loans: recipients and spending",
    (
        "slc",
        "adult_dependants_grant",
        "national",
        None,
    ): "Adult Dependants' Grant: recipients and spending",
    (
        "slc",
        "parents_learning_allowance",
        "national",
        None,
    ): "Parents' Learning Allowance: recipients and spending",
    (
        "slc",
        "student_loan_plan",
        "national",
        None,
    ): "Plan 2 and Plan 5 borrowers, liable and above the repayment threshold",
    (
        "slc",
        "student_loan_repayment",
        "country",
        None,
    ): "Student loan repayments, by nation and plan",
    (
        "voa",
        "council_tax_band",
        "region",
        None,
    ): "Dwellings by council tax band and region",
}

# Local (per-area) metric families. Sources are the ones each loss builder's
# docstring and source module name.
LOCAL_FAMILIES = [
    (
        "age/",
        "Population by ten-year age band, 0 to 79",
        "ONS mid-year population estimates",
    ),
    (
        "hmrc/employment_income/amount",
        "Employment income of income taxpayers",
        "HMRC Survey of Personal Incomes, table 3.15",
    ),
    (
        "hmrc/employment_income/count",
        "Income taxpayers with employment income",
        "HMRC Survey of Personal Incomes, table 3.15",
    ),
    (
        "hmrc/self_employment_income/",
        "Self-employment income: taxpayers and amount",
        "HMRC Survey of Personal Incomes, table 3.15",
    ),
    ("uc_households", "Universal Credit households", "DWP Stat-Xplore"),
    ("uc_hh_", "Universal Credit households by number of children", "DWP Stat-Xplore"),
    (
        "housing/scotland_",
        "Private renters and rent in Scottish constituencies",
        "Country totals set in the build, shared by population",
    ),
    (
        "housing/wales_",
        "Private renters and rent in Welsh constituencies",
        "Country totals set in the build, shared by population",
    ),
    (
        "ons/equiv_",
        "Equivalised income before and after housing costs, and housing costs",
        "ONS small area income estimates",
    ),
    ("tenure/", "Households by tenure", "English Housing Survey"),
    ("rent/private_rent", "Private rent paid", "VOA private rental market statistics"),
    (
        "voa/council_tax/",
        "Dwellings by council tax band, A to H",
        "VOA council tax stock of properties",
    ),
    (
        "housing/council_tax_net",
        "Council tax paid, net of Council Tax Reduction",
        "MHCLG and Welsh Government council tax statistics",
    ),
]

# The build logs these by area but does not train on them (create_datasets.py,
# VALIDATION_ONLY_LOCAL_TARGETS).
HELD_OUT_LOCAL = "hmrc/employment_income/count"


class ExtractionError(ValueError):
    """The inputs do not describe one consistent, pinned release."""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fit_share(
    estimate: pd.Series, target: pd.Series, tolerance: float = WITHIN
) -> float | None:
    """Share of targets whose estimate is within `tolerance` of the target.

    Relative error is undefined for a zero target, so zero targets are left
    out (and counted separately by the callers that can have them). Returns
    None when no target is scorable.
    """
    scorable = target != 0
    if not scorable.any():
        return None
    error = (estimate[scorable] / target[scorable] - 1).abs()
    return round(float((error < tolerance).mean()), 4)


def pinned_release(bundle: dict) -> dict:
    try:
        release = bundle["data_releases"]["uk"]
        return {
            "policyengine": bundle["bundle_version"],
            "modelVersion": release["model_package"]["version"],
            "dataPackage": release["data_package"]["name"],
            "dataVersion": release["data_package"]["version"],
            "releaseManifestRevision": release["data_package"][
                "release_manifest_revision"
            ],
            "defaultDataset": release["default_dataset"],
            "datasetSha256": release["datasets"][release["default_dataset"]]["sha256"],
            "regionDatasets": sorted(release.get("region_datasets", {})),
        }
    except KeyError as missing:
        raise ExtractionError(
            f"bundle manifest has no UK release field {missing}"
        ) from None


def check_release(pin: dict, manifest: dict, artifacts: Path) -> dict:
    if manifest["data_package"]["version"] != pin["dataVersion"]:
        raise ExtractionError(
            f"release manifest is {manifest['data_package']['version']}, bundle pins {pin['dataVersion']}"
        )
    if manifest["default_datasets"].get("national") != pin["defaultDataset"]:
        raise ExtractionError(
            "release manifest's national default is not the bundle's default dataset"
        )
    files = {}
    for name in (
        pin["defaultDataset"],
        "frs_2024_25",
        "parliamentary_constituency_weights",
        "local_authority_weights",
    ):
        entry = manifest["artifacts"].get(name)
        if entry is None:
            raise ExtractionError(f"release manifest lists no artifact {name}")
        path = artifacts / entry["path"]
        actual = sha256(path)
        if actual != entry["sha256"]:
            raise ExtractionError(
                f"{entry['path']} sha256 {actual} does not match the release manifest"
            )
        files[name] = path
    if manifest["artifacts"][pin["defaultDataset"]]["sha256"] != pin["datasetSha256"]:
        raise ExtractionError(
            "bundle and release manifest disagree on the default dataset's sha256"
        )
    return files


def read_tables(path: Path) -> dict[str, pd.DataFrame]:
    return {
        table: pd.read_hdf(path, table)
        for table in ("household", "benunit", "person", "time_period")
    }


def household_summary(tables: dict[str, pd.DataFrame]) -> dict:
    household = tables["household"]
    return {
        "households": len(household),
        "benefitUnits": len(tables["benunit"]),
        "people": len(tables["person"]),
        "weightedHouseholds": int(round(float(household["household_weight"].sum()))),
        "timePeriod": str(np.asarray(tables["time_period"]).ravel()[0]),
    }


def composition(household: pd.DataFrame, base_households: int) -> dict:
    spi = household["household_is_spi_synthetic"].astype(bool)
    gains = household["household_is_capital_gains_clone"].astype(bool)
    donor = household["household_is_cgt_band_donor"].astype(bool)
    frs = ~spi & ~gains & ~donor
    spi_copies = spi & ~gains & ~donor
    if int(frs.sum()) != base_households:
        raise ExtractionError(
            f"{int(frs.sum())} unflagged households, base FRS has {base_households}"
        )
    if int(gains.sum() - (gains & donor).sum()) != int(frs.sum() + spi_copies.sum()):
        raise ExtractionError(
            "capital gains copies do not pair one-to-one with FRS and SPI households"
        )
    weight = household["household_weight"]
    return {
        "frs": int(frs.sum()),
        "spiCopies": int(spi_copies.sum()),
        "capitalGainsCopies": int((gains & ~donor).sum()),
        "cgtBandDonors": int(donor.sum()),
        "spiWeightShare": round(float(weight[spi].sum() / weight.sum()), 4),
    }


def geography(household: pd.DataFrame) -> dict:
    constituency = household["constituency_code_oa"].astype(str).str.strip()
    authority = household["la_code_oa"].astype(str).str.strip()
    has_area = constituency.str.len() > 0
    if not (has_area == (authority.str.len() > 0)).all():
        raise ExtractionError(
            "constituency and local authority codes are not assigned together"
        )
    region = household["region"].astype(str)
    without = region[~has_area].unique().tolist()
    clones = household["clone_index"].nunique()
    if household["source_household_id"].nunique() != len(household):
        raise ExtractionError(
            "source households repeat: the file has more than one Output Area draw per household"
        )
    per_area = constituency[has_area].value_counts()
    return {
        "outputAreaDrawsPerHousehold": int(clones),
        "householdsWithArea": int(has_area.sum()),
        "householdsWithoutArea": int((~has_area).sum()),
        "regionsWithoutArea": sorted(without),
        "constituenciesWithHouseholds": int(per_area.size),
        "householdsPerConstituency": {
            "min": int(per_area.min()),
            "median": float(per_area.median()),
            "max": int(per_area.max()),
        },
    }


def weight_matrix(path: Path, households: int) -> dict:
    import h5py

    with h5py.File(path, "r") as f:
        keys = list(f.keys())
        if len(keys) != 1:
            raise ExtractionError(
                f"{path.name} holds {keys}, expected one calibration year"
            )
        matrix = f[keys[0]][:]
    if matrix.ndim != 2 or matrix.shape[1] != households:
        raise ExtractionError(
            f"{path.name} has shape {matrix.shape}, expected (areas, {households})"
        )
    return {
        "areas": int(matrix.shape[0]),
        "households": int(matrix.shape[1]),
        "year": keys[0],
        "matrix": matrix,
    }


def last_epoch(log: pd.DataFrame) -> pd.DataFrame:
    epoch = log["epoch"].max()
    return log[log["epoch"] == epoch].copy()


GREAT_BRITAIN = {"ENGLAND", "SCOTLAND", "WALES"}


def area_label(level: str, countries: pd.Series) -> str:
    """The area a target family covers: the registry's country scope, else its level."""
    scopes = {
        tuple(sorted(c)) if isinstance(c, (list, tuple)) else None for c in countries
    }
    if len(scopes) != 1:
        raise ExtractionError(f"a target family mixes country scopes: {scopes}")
    scope = scopes.pop()
    if scope is None:
        return {"national": "UK", "region": "Region", "country": "Nation"}[level]
    if set(scope) == GREAT_BRITAIN:
        return "Great Britain"
    return ", ".join(c.replace("_", " ").title() for c in scope)


def national_groups(
    national: pd.DataFrame, registry: pd.DataFrame, pinned: pd.DataFrame
) -> tuple[list[dict], list[dict]]:
    missing = sorted(set(national["metric"]) - set(registry.index))
    if missing:
        raise ExtractionError(
            f"logged national targets missing from the registry: {missing[:5]}"
        )
    rows = national.join(registry, on="metric")
    rows = rows.join(
        pinned.set_index("metric")[["target", "estimate"]].add_prefix("pinned_"),
        on="metric",
    )
    rows["breakdown"] = rows["breakdown_variable"].where(
        rows["breakdown_variable"].notna(), None
    )
    groups = []
    target_rows = []
    for key, group in rows.groupby(
        ["source", "variable", "geographic_level", "breakdown"],
        dropna=False,
        sort=False,
    ):
        source, variable, level, breakdown = key
        breakdown = (
            None
            if breakdown is None
            or (isinstance(breakdown, float) and math.isnan(breakdown))
            else breakdown
        )
        label = GROUP_LABELS.get((source, variable, level, breakdown))
        if label is None:
            raise ExtractionError(
                f"no label for target group {(source, variable, level, breakdown)}"
            )
        publishers = sorted(
            {
                PUBLISHER_BY_TARGET.get(m, PUBLISHERS.get(source, source))
                for m in group["metric"]
            }
        )
        units = sorted(set(group["unit"]))
        entry = {
            "source": source,
            "label": label,
            "publisher": " and ".join(publishers),
            "geography": area_label(level, group["countries"]),
            "units": units,
            "targets": len(group),
            "zeroTargets": int((group["target"] == 0).sum()),
            "within10": fit_share(group["estimate"], group["target"]),
            "pinnedWithin10": fit_share(
                group["pinned_estimate"], group["pinned_target"]
            ),
            "urls": sorted(set(group["reference_url"].dropna())),
            "vintages": sorted(set(group["forecast_vintage"].dropna())),
        }
        if len(group) == 1:
            entry["value"] = float(group["target"].iloc[0])
        groups.append(entry)
        for _, row in group.iterrows():
            target_rows.append(
                {
                    "id": row["metric"],
                    "group": label,
                    "unit": row["unit"],
                    "target": float(row["pinned_target"]),
                    "estimate": float(row["pinned_estimate"]),
                    "calibrationEstimate": float(row["estimate"]),
                }
            )
    order = [
        "obr",
        "hmrc",
        "hmrc_spi",
        "dwp",
        "ons",
        "voa",
        "slc",
        "nts",
        "ehs",
        "scottish_government",
        "scotland_census",
    ]
    groups.sort(
        key=lambda g: (
            order.index(g["source"]) if g["source"] in order else len(order),
            -g["targets"],
            g["label"],
        )
    )
    target_rows.sort(key=lambda r: r["id"])
    return groups, target_rows


def read_pinned_check(path: Path, model_version: str) -> tuple[dict, pd.DataFrame]:
    meta = {}
    with open(path) as f:
        for line in f:
            if not line.startswith("# "):
                break
            key, value = line[2:].strip().split("=", 1)
            meta[key] = value
    if meta.get("policyengine_uk") != model_version:
        raise ExtractionError(
            f"pinned check ran policyengine-uk {meta.get('policyengine_uk')}, the bundle pins {model_version}"
        )
    checked = pd.read_csv(path, comment="#")
    if (
        checked["metric"].duplicated().any()
        or not np.isfinite(checked[["target", "estimate"]].to_numpy()).all()
    ):
        raise ExtractionError("pinned check has repeated or non-finite rows")
    return meta, checked


def local_summary(local: pd.DataFrame, areas: int) -> dict:
    if local["index"].nunique() != areas:
        raise ExtractionError(
            f"log covers {local['index'].nunique()} areas, the weight matrix {areas}"
        )
    finite = local[np.isfinite(local["target"])]
    trained = finite[finite["metric"] != HELD_OUT_LOCAL]
    nonzero = trained[trained["target"] != 0]
    zero = trained[trained["target"] == 0]
    if (zero["estimate"].abs() > 1e-6).any():
        raise ExtractionError(
            "a zero local target has a non-zero estimate; it is not a structural zero"
        )
    held = finite[finite["metric"] == HELD_OUT_LOCAL]
    families = []
    claimed: set[str] = set()
    for prefix, label, source in LOCAL_FAMILIES:
        metrics = sorted(
            m
            for m in local["metric"].unique()
            if m.startswith(prefix) and m not in claimed
        )
        if prefix == "uc_households":
            metrics = [m for m in metrics if m == "uc_households"]
        if not metrics:
            continue
        claimed.update(metrics)
        cells = nonzero[nonzero["metric"].isin(metrics)]
        held_family = held[held["metric"].isin(metrics)]
        family = {
            "label": label,
            "source": source,
            "metrics": len(metrics),
            "heldOut": bool(len(held_family)) and not len(cells),
        }
        scored = held_family if family["heldOut"] else cells
        family["cells"] = len(scored)
        family["within10"] = fit_share(scored["estimate"], scored["target"])
        families.append(family)
    unclaimed = sorted(set(local["metric"]) - claimed)
    if unclaimed:
        raise ExtractionError(f"local metrics with no family: {unclaimed}")
    return {
        "areas": int(areas),
        "metrics": int(local["metric"].nunique()),
        "cellsWithTarget": len(finite),
        "cellsWithoutSource": int(len(local) - len(finite)),
        "structuralZeroCells": len(zero),
        "trainingCells": len(nonzero),
        "trainingWithin10": fit_share(nonzero["estimate"], nonzero["target"]),
        "heldOut": {
            "metric": HELD_OUT_LOCAL,
            "cells": len(held),
            "within10": fit_share(held["estimate"], held["target"]),
        },
        "families": families,
    }


def calibration(
    log_path: Path, registry: pd.DataFrame, areas: int
) -> tuple[dict, pd.DataFrame]:
    columns = ["index", "name", "metric", "estimate", "target", "validation", "epoch"]
    log = last_epoch(pd.read_csv(log_path, usecols=columns))
    national = log[log["name"] == "UK"]
    local = log[log["name"] != "UK"]
    if national["metric"].duplicated().any():
        raise ExtractionError(f"{log_path.name} repeats a national target")
    if national["validation"].astype(bool).any():
        raise ExtractionError(
            "a national target is marked validation-only; the pages assume all train"
        )
    flagged = set(local.loc[local["validation"].astype(bool), "metric"])
    if flagged != {HELD_OUT_LOCAL}:
        raise ExtractionError(
            f"held-out local metrics are {sorted(flagged)}, expected [{HELD_OUT_LOCAL}]"
        )
    summary = {
        "epoch": int(log["epoch"].iloc[0]),
        "nationalTargets": len(national),
        "nationalWithin10": fit_share(national["estimate"], national["target"]),
        "nationalWithin5": fit_share(national["estimate"], national["target"], 0.05),
        "nationalZeroTargets": int((national["target"] == 0).sum()),
        "local": local_summary(local, areas),
    }
    return summary, national


def extract(artifacts: Path, registry_path: Path) -> dict:
    bundle = json.loads((artifacts / "bundle_manifest.json").read_text())
    manifest = json.loads((artifacts / "release_manifest.json").read_text())
    pin = pinned_release(bundle)
    files = check_release(pin, manifest, artifacts)

    base = read_tables(files["frs_2024_25"])
    enhanced = read_tables(files[pin["defaultDataset"]])
    base_summary = household_summary(base)
    enhanced_summary = household_summary(enhanced)
    household = enhanced["household"]

    constituency = weight_matrix(
        files["parliamentary_constituency_weights"], len(household)
    )
    authority = weight_matrix(files["local_authority_weights"], len(household))
    ratio = (
        constituency["matrix"].sum(axis=0) / household["household_weight"].to_numpy()
    )
    if ratio.max() - ratio.min() > 1e-4:
        raise ExtractionError(
            "constituency matrix column sums are not one uniform multiple of the saved weights"
        )

    registry = pd.DataFrame(json.loads(registry_path.read_text())).set_index("name")
    run, pinned = read_pinned_check(
        artifacts / "pinned_target_check.csv", pin["modelVersion"]
    )
    constituency_cal, national = calibration(
        artifacts / "constituency_calibration_log.csv", registry, constituency["areas"]
    )
    authority_cal, authority_national = calibration(
        artifacts / "la_calibration_log.csv", registry, authority["areas"]
    )
    if set(national["metric"]) != set(authority_national["metric"]):
        raise ExtractionError("the two calibrations fit different national targets")
    if set(pinned["metric"]) != set(national["metric"]):
        raise ExtractionError(
            "the pinned check scored a different set of national targets from calibration"
        )
    groups, target_rows = national_groups(national, registry, pinned)

    build = manifest["build"]
    return {
        "schemaVersion": SCHEMA_VERSION,
        "release": {
            **{k: v for k, v in pin.items() if k != "datasetSha256"},
            "datasetSha256": pin["datasetSha256"],
            "builtAt": build["built_at"],
            "builtWithModelVersion": build["built_with_model_package"]["version"],
            "dataGitSha": build["metadata"]["data_package_git_sha"],
        },
        "base": {**base_summary, "dataset": "frs_2024_25"},
        "enhanced": {
            **enhanced_summary,
            "dataset": pin["defaultDataset"],
            "composition": composition(household, base_summary["households"]),
            "geography": geography(household),
        },
        "weightMatrices": {
            "constituency": {k: v for k, v in constituency.items() if k != "matrix"},
            "localAuthority": {k: v for k, v in authority.items() if k != "matrix"},
            "columnSumPerSavedWeight": round(float(ratio.mean()), 6),
        },
        "calibration": {
            "epoch": constituency_cal["epoch"],
            "nationalTargets": constituency_cal["nationalTargets"],
            "nationalZeroTargets": constituency_cal["nationalZeroTargets"],
            "nationalWithin10": constituency_cal["nationalWithin10"],
            "nationalWithin5": constituency_cal["nationalWithin5"],
            "constituency": constituency_cal["local"],
            "localAuthority": authority_cal["local"],
            "nationalGroups": groups,
        },
        "validation": {
            "modelVersion": run["policyengine_uk"],
            "coreVersion": run["policyengine_core"],
            "year": int(run["year"]),
            "people": int(round(float(run["people"]))),
            "households": int(round(float(run["households"]))),
            "targets": len(pinned),
            "zeroTargets": int((pinned["target"] == 0).sum()),
            "within10": fit_share(pinned["estimate"], pinned["target"]),
            "within5": fit_share(pinned["estimate"], pinned["target"], 0.05),
            "rows": target_rows,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--artifacts", type=Path, required=True)
    parser.add_argument(
        "--registry", type=Path, help="defaults to <artifacts>/registry_targets.json"
    )
    parser.add_argument("--out", type=Path, required=True, help="release summary JSON")
    parser.add_argument(
        "--rows-out", type=Path, required=True, help="per-target check rows JSON"
    )
    args = parser.parse_args()
    summary = extract(
        args.artifacts, args.registry or args.artifacts / "registry_targets.json"
    )
    rows = summary["validation"].pop("rows")
    args.out.write_text(json.dumps(summary, indent=2, allow_nan=False) + "\n")
    args.rows_out.write_text(
        json.dumps(rows, separators=(",", ":"), allow_nan=False) + "\n"
    )
    print(f"wrote {args.out} and {args.rows_out} ({len(rows)} targets)")


if __name__ == "__main__":
    main()
