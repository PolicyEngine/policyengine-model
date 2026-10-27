"""
Extract the UK calibration targets from the Microcosm UK releases that
policyengine.py serves, and write a grouped JSON for the Calibration page.

Usage:
    uv run --no-project python scripts/extract_uk_calibration_targets.py \
        --national PATH/TO/national/calibration_diagnostics.json \
        --dense-release-manifest PATH/TO/dense/release_manifest.json \
        --dense PATH/TO/dense/calibration_diagnostics.json \
        [--bundle-manifest PATH_OR_URL]

policyengine.py serves two UK files built from one Microcosm spine: the
national file (the UK and its four nations) and the local-area file (the 650
constituencies and 361 local authorities). Each is calibrated separately, so
the page lists the union of both target surfaces.

The input files are licensed: only UK Data Service licence holders can read
them, so, unlike the US extractor, this script cannot run in CI. A maintainer
with access runs it locally on the three files below and commits only
src/data/ukCalibrationTargets.json.

- ``--national``: the national release's calibration_diagnostics.json. Its
  sha256 must equal ``data_releases.uk.datasets.calibration_diagnostics`` in
  the bundle manifest.
- ``--dense-release-manifest``: the local-area release's release_manifest.json.
  Its cut tag and its H5 artifact must equal the bundle's
  ``microcosm_uk_2024_25_dense`` entry.
- ``--dense``: the local-area release's calibration_diagnostics.json. Its
  sha256 must equal that release manifest's ``calibration_diagnostics``.
- ``--bundle-manifest``: policyengine.py's
  src/policyengine/data/bundle/manifest.json (default: main on GitHub).

TARGET VALUES ONLY. Every target is reduced to the whitelisted fields in
``slim_target``; nothing else in the inputs is read, and the output is scanned
for forbidden keys before it is written. Every target value is a published
official statistic or a Microcosm transformation of one.

Labels come from the LABELS table below, keyed by row key. A row without a
label stops the extraction, so a new release's new rows are named by hand.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import urllib.request
from collections import Counter, defaultdict

BUNDLE_MANIFEST_URL = (
    "https://raw.githubusercontent.com/PolicyEngine/policyengine.py/main/"
    "src/policyengine/data/bundle/manifest.json"
)
OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "src", "data", "ukCalibrationTargets.json"
)

# calibration_diagnostics.json schema versions this script understands.
SUPPORTED_SCHEMA_VERSIONS = {8}
# ledger_measure_unit values a national-scope target may carry.
MEASURE_UNITS = {"gbp", "count", "gbp_per_week x 52"}
# Plausible calibration years for a target's period.
CALIBRATION_YEARS = (2000, 2100)

# Page levels, in display order, and the row field counting each.
LEVEL_KEYS = (
    "uk",
    "gb",
    "englandAndWales",
    "nation",
    "region",
    "constituency",
    "localAuthority",
    "other",
)
COUNT_FIELDS = {
    "uk": "nationalCount",
    "gb": "gbCount",
    "englandAndWales": "englandAndWalesCount",
    "nation": "nationCount",
    "region": "regionCount",
    "constituency": "constituencyCount",
    "localAuthority": "localAuthorityCount",
    "other": "otherCount",
}
# Ledger geography ids above the English regions.
TOP_GEOGRAPHIES = {
    "K02000001": ("uk", "United Kingdom"),
    "K03000001": ("gb", "Great Britain"),
    "K04000001": ("englandAndWales", "England and Wales"),
}
NATIONS = {
    "E92000001": "England",
    "N92000002": "Northern Ireland",
    "S92000003": "Scotland",
    "W92000004": "Wales",
}
REGION_ID = re.compile(r"^E12\d{6}$")
# The row's headline value comes from its single target at the first of these
# levels that it has; failing that, from a row whose only target is a nation's.
HEADLINE_LEVELS = ("uk", "gb", "englandAndWales")
# Local (dense-release) geography levels. Scotland's Broad Rental Market Areas
# are 'statistical_scope' rows with area_type 'brma'; the page counts them
# under 'other'.
LOCAL_LEVELS = {
    ("constituency", "constituency"): "constituency",
    ("local_authority", "la"): "localAuthority",
    ("statistical_scope", "brma"): "other",
}
# Units of the local metrics that are not counts.
LOCAL_UNITS = {
    "hmrc/employment_income/amount": "gbp",
    "hmrc/self_employment_income/amount": "gbp",
    "rent/private_rent": "gbp",
    "rent/private_rent_brma": "gbp",
    "energy/electricity_kwh": "kwh",
    "energy/gas_kwh": "kwh",
}
# Local metric prefixes whose last segment is a breakdown cell.
LOCAL_STEMS = (
    (re.compile(r"^age/"), "age", "age_band"),
    (re.compile(r"^council_tax/band_"), "council_tax", "council_tax_band"),
    (re.compile(r"^uc_hh_"), "uc_households_by_children", "number_of_children"),
    (re.compile(r"^tenure/"), "tenure", "tenure"),
    (re.compile(r"^high_value_homes/"), "high_value_homes", "value_threshold"),
)

# Who publishes each citation family (the first field of a target's source).
# The diagnostics' hierarchy files NRS and NISRA rows under ONS, so the
# citation family is the authority.
PUBLISHERS = {
    "desnz": "DESNZ",
    "dfc_ni": "Department for Communities (NI)",
    "dfe": "DfE",
    "dfi_ni": "Department for Infrastructure (NI)",
    "dft": "DfT",
    "dwp": "DWP",
    "hmrc": "HMRC",
    "isc": "Independent Schools Council",
    "mhclg": "MHCLG",
    "nisra": "NISRA",
    "nithc": "NI Transport Holding Company",
    "nrs": "National Records of Scotland",
    "obr": "OBR",
    "ons": "ONS",
    "orr": "ORR",
    "scotgov": "Scottish Government",
    "slc": "Student Loans Company",
    "welshgov": "Welsh Government",
    # Built by Microcosm from open data only; each row names its inputs
    # (LABELS[...]["derivation"]).
    "microcosm": "Microcosm derivation from open data",
}
# Families whose citation locator is a repository path, not a URL.
NON_URL_FAMILIES = {"microcosm"}
REPO_PATH = re.compile(r"^(?!/)(?!.*\.\.)[A-Za-z0-9_./-]+$")

# Value operations that read, add, average or difference published cells:
# the target is the published figure as published.
PUBLISHED_OPERATIONS = {
    "identity",
    "sum",
    "difference",
    "linear_combination",
    "monthly_window_average",
    "monthly_window_sum_average",
    "calendar_year_average",
}
# Value operations that transform published figures, and how the page says so.
OPERATION_NOTES = {
    "calendar_year_window": "Calendar-year window of fiscal-year figures",
    "calendar_year_window_scaled_by_ratio": "Calendar-year window of fiscal-year figures, scaled by a published ratio",
    "scaled_by_ratio": "Scaled by a ratio of published figures",
    "rolled_forward_by_ratio": "Rolled forward by a ratio of published figures",
    "monthly_window_count_x_mean": "Published caseload times published mean award",
    "count_x_mean": "Published count times published mean",
}
# Uprating indices, as the page names them.
UPRATING_INDICES = {
    "hmrc.itl_2026.taxpayer_count_growth_by_total_income_band": "HMRC Income Tax liabilities statistics (taxpayer growth by income band)",
    "hmrc.itl_2026.total_income_growth_by_total_income_band": "HMRC Income Tax liabilities statistics (income growth by income band)",
    "hmrc.itl_2026.total_tax_growth_by_total_income_band": "HMRC Income Tax liabilities statistics (tax growth by income band)",
    "hmrc.itl_2026.taxpayer_count_growth_times_new_state_pension_rate_by_total_income_band": "HMRC Income Tax liabilities statistics (taxpayer growth by income band) and the new State Pension rate",
    "policyengine_uk.household_interest_income_to_dataset_year_then_per_capita_gdp": "policyengine-uk’s household interest income index, then OBR per-capita GDP",
    "policyengine_uk_parameter:gov.economic_assumptions.indices.obr.per_capita.gdp": "OBR per-capita GDP (policyengine-uk)",
    "policyengine_uk_parameter:gov.dwp.state_pension.new_state_pension.amount": "the new State Pension rate (policyengine-uk)",
    "policyengine_uk_parameter:gov.hmrc.national_insurance.class_1.rates.employer": "the employer National Insurance rate (policyengine-uk)",
    "dft.bus01.stage_pricing_year": "DfT bus statistics (BUS01)",
    "dft.local_bus_fares_index": "the DfT local bus fares index",
}
WEEKLY_NOTE = "Annual: 52 times the published weekly amount"
PROJECTION_NOTE = "The publisher’s forecast or projection"
CROSS_GRAIN_NOTE = "Rescaled to sum to its published higher-level control"

# Rows that put one band or line in each measure concept merge into one row,
# whose breakdown is named here.
CONCEPT_GROUPS = (
    (re.compile(r"^dwp\.uc_capped_households_(up_to_|\d+_01_)"), "dwp.uc_capped_households_by_band", "monthly cap reduction"),
    (re.compile(r"^dwp\.uc_tcl_households_by_children_"), "dwp.uc_tcl_households_by_children", "number of children"),
    (re.compile(r"^dwp\.uc_tcl_children_by_children_"), "dwp.uc_tcl_children_by_children", "number of children"),
    (re.compile(r"^dwp\.uc_tcl_households_by_disability_"), "dwp.uc_tcl_households_by_disability", "disability"),
    (re.compile(r"^dwp\.uc_tcl_children_by_disability_"), "dwp.uc_tcl_children_by_disability", "disability"),
    (re.compile(r"^scotgov\.chargeable_dwellings_band_"), "scotgov.chargeable_dwellings_by_band", "council tax band"),
)

# Breakdown names for the filter variables that vary within a row (and for the
# local stems' breakdowns). Variables fixed across a row are part of its label.
BREAKDOWNS = {
    "age": "age",
    "age_band": "age",
    "age_bands_and_single_year": "age",
    "annual_salary_sacrificed": "amount sacrificed",
    "salary_sacrifice_threshold_position": "amount sacrificed",
    "borrower_status": "borrower status",
    "category_of_pension": "State Pension type",
    "cgt_badr_ir_gain_band": "qualifying gain",
    "cgt_badr_ir_qualifying_gain": "qualifying gain",
    "cgt_gain": "size of gain",
    "cgt_gain_band": "size of gain",
    "cgt_taxable_income_band": "taxable income",
    "taxable_income": "taxable income",
    "council_tax_band": "council tax band",
    "entitlement_type": "entitlement",
    "family_type": "family type",
    "gender": "sex",
    "sex": "sex",
    "grouped_amount_of_benefit": "weekly amount",
    "household_type": "household type",
    "housing_entitlement_tenure": "tenure",
    "marginal_rate": "marginal tax rate",
    "microcosm.value_threshold": "value threshold",
    "monthly_award_amount_bands": "monthly award",
    "number_of_children": "number of children",
    "partner_indicator": "single or couple",
    "payment_type": "payment type",
    "private_or_social_rented": "private or social rented",
    "student_support_product": "product",
    "tenure": "tenure",
    "total_income": "total income band",
    "type_of_pension_credit": "Pension Credit type",
    "value_threshold": "value threshold",
}

# Row labels, keyed by row key: '<scope>|<concept>|<filter variables>'. Never
# build a label from the concept string: a linear combination takes the
# concept of its first operand (e.g. the MHCLG and Welsh dwelling-stock rows).
# Optional fields: 'notes' (how a local row's values are built, which the
# local diagnostics do not record) and 'derivation' (the inputs of a
# Microcosm-derived row, shown as its source).
HVH_DERIVATION = (
    "Microcosm derivation from open data (HM Land Registry Price Paid, UK HPI, "
    "ONS NSPL, VOA council tax stock, Census 2021 tenure)"
)
LABELS: dict[str, dict] = {
    # Benefits, DWP and Department for Communities (NI)
    "ledger|dwp.attendance_allowance_cases_with_entitlement|aa_award_type,age_bands_and_single_year,gender": {"label": "Attendance Allowance cases with entitlement"},
    "ledger|dwp.benefit_expenditure_amount|benefit_family,benefit_forecast_line": {"label": "Housing Benefit spending, pension age"},
    "ledger|dwp.esa_claimants|payment_type,phase_of_esa_claim": {"label": "Employment and Support Allowance claimants"},
    "ledger|dwp.hb_claimants|client_type,private_or_social_rented": {"label": "Housing Benefit claimants of pension age"},
    "ledger|dwp.pension_credit_benefit_units|": {"label": "Pension Credit caseload"},
    "ledger|dwp.pension_credit_benefit_units|age,age_bands_and_single_year,partner_indicator,type_of_pension_credit": {"label": "Pension Credit caseload"},
    "ledger|dwp.pension_credit_benefit_units|age_bands_and_single_year,partner_indicator,type_of_pension_credit": {"label": "Pension Credit caseload"},
    "ledger|dwp.state_pension_mean_weekly_amount|": {"label": "State Pension paid"},
    "ledger|dwp.state_pension_mean_weekly_amount|age_bands_and_single_year,category_of_pension,gender": {"label": "State Pension paid"},
    "ledger|dwp.state_pension_recipients|": {"label": "State Pension recipients"},
    "ledger|dwp.state_pension_recipients|age,age_bands_and_single_year,category_of_pension,gender": {"label": "State Pension recipients"},
    "ledger|dwp.state_pension_recipients|age_bands_and_single_year,category_of_pension,gender": {"label": "State Pension recipients"},
    "ledger|dwp.state_pension_recipients|category_of_pension,gender": {"label": "State Pension recipients"},
    "ledger|dwp.state_pension_recipients|category_of_pension,grouped_amount_of_benefit": {"label": "State Pension recipients"},
    "ledger|dwp.uc_benefit_units|age_of_youngest_child_bands_and_single_year": {"label": "Universal Credit households with a child under 1"},
    "ledger|dwp.uc_benefit_units|carer_entitlement,payment_indicator": {"label": "Universal Credit households with carer entitlement"},
    "ledger|dwp.uc_benefit_units|child_entitlement,family_type,payment_indicator": {"label": "Universal Credit households with child entitlement"},
    "ledger|dwp.uc_benefit_units|child_entitlement,number_of_children,payment_indicator": {"label": "Universal Credit households"},
    "ledger|dwp.uc_benefit_units|family_type,monthly_award_amount_bands": {"label": "Universal Credit households"},
    "ledger|dwp.uc_benefit_units|housing_entitlement_tenure,payment_indicator": {"label": "Universal Credit households with housing entitlement"},
    "ledger|dwp.uc_benefit_units|limited_capability_for_work_entitlement,payment_indicator": {"label": "Universal Credit households with LCWRA entitlement"},
    "ledger|dwp.uc_benefit_units_with_childcare_element|uc_element": {"label": "Universal Credit households receiving the childcare element"},
    "ledger|dwp.uc_benefit_units_with_deduction|": {"label": "Universal Credit households with a deduction"},
    "ledger|dwp.uc_capped_households_by_band|": {"label": "Benefit-capped households"},
    "ledger|dwp.uc_capped_households_total|": {"label": "Benefit-capped households"},
    "ledger|dwp.uc_tcl_headline_households_affected|two_child_limit_status": {"label": "Households affected by the two-child limit"},
    "ledger|dwp.uc_tcl_households_by_children|two_child_limit_status": {"label": "Households affected by the two-child limit"},
    "ledger|dwp.uc_tcl_households_by_disability|two_child_limit_status": {"label": "Households affected by the two-child limit"},
    "ledger|dwp.uc_tcl_headline_children_affected_by_policy|two_child_limit_status": {"label": "Children not receiving the child element under the two-child limit"},
    "ledger|dwp.uc_tcl_headline_children_within_affected_households|two_child_limit_status": {"label": "Children in households affected by the two-child limit"},
    "ledger|dwp.uc_tcl_children_by_children|two_child_limit_status": {"label": "Children in households affected by the two-child limit"},
    "ledger|dwp.uc_tcl_children_by_disability|two_child_limit_status": {"label": "Children in households affected by the two-child limit"},
    "ledger|dwp.workplace_pension_annual_saving|price_basis,saver_population,saving_component,sector": {"label": "Employer workplace pension contributions"},
    # Capital Gains Tax, HMRC
    "ledger|hmrc.cgt_badr_ir_qualifying_gains|cgt_badr_ir_gain_band,cgt_badr_ir_qualifying_gain,taxpayer_type": {"label": "Capital Gains Tax: gains qualifying for Business Asset Disposal or Investors’ Relief"},
    "ledger|hmrc.cgt_badr_ir_taxpayers|cgt_badr_ir_gain_band,cgt_badr_ir_qualifying_gain,taxpayer_type": {"label": "Capital Gains Tax: Business Asset Disposal or Investors’ Relief claimants"},
    "ledger|hmrc.cgt_gains_individuals|": {"label": "Capital Gains Tax: gains of individuals"},
    "ledger|hmrc.cgt_gains_individuals|age,age_band": {"label": "Capital Gains Tax: gains of individuals"},
    "ledger|hmrc.cgt_gains_individuals|cgt_gain,cgt_gain_band": {"label": "Capital Gains Tax: gains of individuals"},
    "ledger|hmrc.cgt_gains_individuals|cgt_taxable_income_band,taxable_income": {"label": "Capital Gains Tax: gains of individuals"},
    "ledger|hmrc.cgt_gains_total|": {"label": "Capital Gains Tax: gains"},
    "ledger|hmrc.cgt_residential_property_gains|channel": {"label": "Capital Gains Tax: residential property gains"},
    "ledger|hmrc.cgt_residential_property_taxpayers|channel": {"label": "Capital Gains Tax: residential property taxpayers"},
    "ledger|hmrc.cgt_tax_individuals|": {"label": "Capital Gains Tax: liabilities of individuals"},
    "ledger|hmrc.cgt_tax_individuals|age,age_band": {"label": "Capital Gains Tax: liabilities of individuals"},
    "ledger|hmrc.cgt_taxpayers_individuals|": {"label": "Capital Gains Tax: individual taxpayers"},
    "ledger|hmrc.cgt_taxpayers_individuals|age,age_band": {"label": "Capital Gains Tax: individual taxpayers"},
    "ledger|hmrc.cgt_taxpayers_individuals|cgt_gain,cgt_gain_band": {"label": "Capital Gains Tax: individual taxpayers"},
    "ledger|hmrc.cgt_taxpayers_individuals|cgt_taxable_income_band,taxable_income": {"label": "Capital Gains Tax: individual taxpayers"},
    "ledger|hmrc.cgt_taxpayers_total|": {"label": "Capital Gains Tax: taxpayers"},
    # Incomes and Income Tax, HMRC
    "ledger|hmrc.spi_dividend_income_amount|total_income": {"label": "Income: dividends"},
    "ledger|hmrc.spi_dividend_income_count|total_income": {"label": "Income: people with dividends"},
    "ledger|hmrc.spi_employment_income_amount|total_income": {"label": "Income: employment"},
    "ledger|hmrc.spi_employment_income_count|total_income": {"label": "Income: people with employment income"},
    "ledger|hmrc.spi_private_pension_income_amount|total_income": {"label": "Income: private pensions"},
    "ledger|hmrc.spi_private_pension_income_count|total_income": {"label": "Income: people with private pension income"},
    "ledger|hmrc.spi_property_income_amount|total_income": {"label": "Income: property"},
    "ledger|hmrc.spi_property_income_count|total_income": {"label": "Income: people with property income"},
    "ledger|hmrc.spi_savings_interest_income_amount|total_income": {"label": "Income: savings interest"},
    "ledger|hmrc.spi_savings_interest_income_count|total_income": {"label": "Income: people with savings interest"},
    "ledger|hmrc.spi_self_employment_income_amount|total_income": {"label": "Income: self-employment"},
    "ledger|hmrc.spi_self_employment_income_count|total_income": {"label": "Income: people with self-employment income"},
    "ledger|hmrc.spi_state_pension_amount|total_income": {"label": "Income: State Pension"},
    "ledger|hmrc.spi_state_pension_count|total_income": {"label": "Income: people with State Pension income"},
    "ledger|hmrc.spi_total_income_before_tax_amount|sex,total_income": {"label": "Income: total before tax"},
    "ledger|hmrc.spi_total_income_before_tax_amount|total_income": {"label": "Income: total before tax"},
    "ledger|hmrc.spi_total_income_before_tax_count|sex,total_income": {"label": "Income: people with income"},
    "ledger|hmrc.spi_taxpayer_count|marginal_rate": {"label": "Income Tax payers"},
    "ledger|hmrc.spi_taxpayer_count|total_income": {"label": "Income Tax payers"},
    "ledger|hmrc.spi_total_tax_amount|sex,total_income": {"label": "Income Tax liabilities"},
    "ledger|hmrc.spi_total_tax_amount|total_income": {"label": "Income Tax liabilities"},
    # Pensions and childcare, HMRC
    "ledger|hmrc.salary_sacrifice_pension_users|annual_salary_sacrificed,salary_sacrifice_threshold_position": {"label": "Salary-sacrifice pension users"},
    "ledger|hmrc.ss_income_tax_relief_basic_rate|": {"label": "Salary-sacrifice pension contributions: Income Tax relief at the basic rate"},
    "ledger|hmrc.ss_income_tax_relief_higher_rate|": {"label": "Salary-sacrifice pension contributions: Income Tax relief at the higher rate"},
    "ledger|hmrc.ss_income_tax_relief_additional_rate|": {"label": "Salary-sacrifice pension contributions: Income Tax relief at the additional rate"},
    "ledger|hmrc.ss_nics_relief_employee|": {"label": "Salary-sacrifice pension contributions: employee National Insurance relief"},
    "ledger|hmrc.ss_nics_relief_employer|": {"label": "Salary-sacrifice pension contributions: employer National Insurance relief"},
    "ledger|hmrc.tfc_children_with_used_accounts_annual_unique|account_status,count_basis,definition_regime,source_release": {"label": "Tax-Free Childcare: children with a used account"},
    "ledger|hmrc.tfc_government_top_up|flow_basis,flow_type,source_release": {"label": "Tax-Free Childcare: government top-up"},
    # Expected in the release built from microcosm 90ff43f95 (HMRC Child
    # Benefit families by number of children); unused until then.
    "ledger|hmrc.child_benefit_families_in_payment|number_of_children": {"label": "Child Benefit families in payment"},
    # Government receipts and spending, OBR
    "ledger|obr.attendance_allowance|": {"label": "Attendance Allowance spending"},
    "ledger|obr.carers_allowance|": {"label": "Carer’s Allowance spending"},
    "ledger|obr.child_benefit|": {"label": "Child Benefit spending"},
    "ledger|obr.council_tax_receipts_england_scotland_wales|": {"label": "Council Tax receipts (England, Scotland and Wales)"},
    "ledger|obr.dla_and_pip|": {"label": "Disability Living Allowance and Personal Independence Payment spending"},
    "ledger|obr.incapacity_benefits|": {"label": "Incapacity benefits spending"},
    "ledger|obr.income_tax|": {"label": "Income Tax receipts"},
    "ledger|obr.jobseekers_allowance|": {"label": "Jobseeker’s Allowance spending"},
    "ledger|obr.ni_employee|": {"label": "Employee National Insurance contributions"},
    "ledger|obr.ni_self_employed|": {"label": "Self-employed National Insurance contributions"},
    "ledger|obr.pension_credit|": {"label": "Pension Credit spending"},
    "ledger|obr.sdlt|": {"label": "Stamp Duty Land Tax receipts"},
    "ledger|obr.statutory_maternity_pay|": {"label": "Statutory Maternity Pay spending"},
    "ledger|obr.tv_licence_fee|": {"label": "TV licence fee receipts"},
    "ledger|obr.universal_credit_outside_cap|": {"label": "Universal Credit spending outside the welfare cap"},
    "ledger|obr.winter_fuel_payment|": {"label": "Winter Fuel Payment spending"},
    # Population, households and the economy, ONS, NRS, NISRA, Welsh Government
    "ledger|ons.mid_year_population_estimate|": {"label": "Population"},
    "ledger|ons.mid_year_population_estimate|age": {"label": "Population"},
    "ledger|ons.mid_year_population_estimate|age,sex": {"label": "Population"},
    "ledger|ons.households_by_type|household_type": {"label": "Households"},
    "ledger|ons.households_total|": {"label": "Households"},
    "ledger|nrs.households_total|": {"label": "Households"},
    "ledger|nisra.census2021_households|": {"label": "Households"},
    "ledger|welshgov.households_total|Data description,Household Type": {"label": "Households"},
    "ledger|ons.household_expenditure.personal_transport_fuels_lubricants|coicop,consumption_concept,frequency,price_basis,published_unit,seasonal_adjustment,source_sheet": {"label": "Household spending on fuels and lubricants for personal transport"},
    "ledger|ons.nbs_land_value_households|publication_status": {"label": "Land held by households (national balance sheet)"},
    "ledger|ons.nbs_land_value_nfc|publication_status": {"label": "Land held by non-financial corporations (national balance sheet)"},
    "ledger|ons.nbs_land_value_total|publication_status": {"label": "Land, all sectors (national balance sheet)"},
    "ledger|ons.pse_headcount_total_public_sector|": {"label": "Public sector employment"},
    # Council Tax and housing, MHCLG, Scottish Government, Welsh Government
    "ledger|mhclg.council_taxbase.empty_dwellings|": {"label": "Council Tax dwelling stock"},
    "ledger|mhclg.council_taxbase.empty_dwellings|council_tax_band": {"label": "Council Tax dwelling stock"},
    "ledger|mhclg.council_taxbase.single_adult_discount_dwellings|": {"label": "Dwellings with a Council Tax single-adult discount"},
    "ledger|scotgov.chargeable_dwellings_by_band|": {"label": "Council Tax dwelling stock"},
    "ledger|scotgov.chargeable_dwellings_total|": {"label": "Council Tax dwelling stock"},
    "ledger|welshgov.council_tax_dwellings.total_chargeable_second_homes|": {"label": "Council Tax dwelling stock"},
    "ledger|welshgov.council_tax_dwellings.total_chargeable_second_homes|council_tax_band": {"label": "Council Tax dwelling stock"},
    "ledger|uk.dwelling.count|microcosm.value_threshold,uk.dwelling.tenure": {"label": "Owner-occupied homes above high-value thresholds", "derivation": HVH_DERIVATION},
    # Public transport
    "ledger|dft.local_bus_passenger_fare_receipts|": {"label": "Local bus passenger fare receipts"},
    "ledger|dft.local_bus_passenger_journeys|": {"label": "Local bus passenger journeys"},
    "ledger|dft.local_bus_total_estimated_net_support|": {"label": "Local bus services: estimated net government support"},
    "ledger|scotgov.bus.government_support|funding_component": {"label": "Bus services: government support"},
    "ledger|scotgov.bus.operator_revenue|revenue_component": {"label": "Bus services: passenger revenue"},
    "ledger|welshgov.local_transport.gross_expenditure|expenditure_component,service_line": {"label": "Local authority support to bus operators"},
    "ledger|dfi_ni.translink_bus.passenger_receipts|service": {"label": "Ulsterbus passenger receipts"},
    "ledger|nithc.dfi_transaction_value|funding_component,mode_scope": {"label": "Public transport Public Service Obligation compensation"},
    # Education and childcare, DfE, ISC, SLC, Scottish Government
    "ledger|dfe.funded_childcare_registered_children_nursery|age,entitlement_type,provision,registration_basis": {"label": "Funded early education: 3-year-olds using the universal hours at a nursery"},
    "ledger|dfe.funded_childcare_registered_children_total|age,entitlement_type,provision,registration_basis": {"label": "Funded early education and childcare: registered children"},
    "ledger|isc.pupils_at_member_schools|school_membership": {"label": "Pupils at Independent Schools Council schools"},
    "ledger|slc.maintenance_loan_amount_paid|": {"label": "Student maintenance loans paid"},
    "ledger|slc.maintenance_loan_recipients|": {"label": "Student maintenance loan recipients"},
    "ledger|slc.student_loan_borrowers|borrower_status,repayment_plan,row_group": {"label": "Plan 5 student loan borrowers"},
    "ledger|slc.student_loan_net_repayments_plan_1|": {"label": "Student loan net repayments: Plan 1"},
    "ledger|slc.student_loan_net_repayments_plan_2_full_time|": {"label": "Student loan net repayments: Plan 2, full-time"},
    "ledger|slc.student_loan_net_repayments_total_higher_education|": {"label": "Student loan net repayments: all higher education"},
    "ledger|slc.targeted_support_amount_awarded|student_support_product": {"label": "Targeted student support awarded"},
    "ledger|slc.targeted_support_recipients|student_support_product": {"label": "Targeted student support recipients"},
    "ledger|scotgov.social_security_assistance_spending|social_security_line": {"label": "Scottish Child Payment spending"},
    # Constituency, local authority and Scottish BRMA cells (local-area file)
    "local|age|age_band": {
        "label": "Population",
        "notes": ["Published small-area and local-authority estimates summed to ten-year bands", CROSS_GRAIN_NOTE],
    },
    "local|households|": {
        "label": "Households",
        "notes": ["Census 2021 counts (Scotland: Census 2022)", CROSS_GRAIN_NOTE],
    },
    "local|tenure|tenure": {
        "label": "Households",
        "notes": ["Census tenure counts moved to 2025 with ONS tenure shares", CROSS_GRAIN_NOTE],
    },
    "local|uc_households|": {
        "label": "Universal Credit households",
        "notes": ["Average of the published 2025 months, paid claims only", CROSS_GRAIN_NOTE],
    },
    "local|uc_households_by_children|number_of_children": {
        "label": "Universal Credit households",
        "notes": ["Average of the published 2025 months, paid claims only", CROSS_GRAIN_NOTE],
    },
    "local|hmrc/employment_income/amount|": {
        "label": "Income: employment",
        "notes": ["Published count times published mean, uprated with HMRC Income Tax liabilities statistics", CROSS_GRAIN_NOTE],
    },
    "local|hmrc/employment_income/count|": {
        "label": "Income: people with employment income",
        "notes": ["Uprated with HMRC Income Tax liabilities statistics", CROSS_GRAIN_NOTE],
    },
    "local|hmrc/self_employment_income/amount|": {
        "label": "Income: self-employment",
        "notes": ["Published count times published mean, uprated with HMRC Income Tax liabilities statistics", CROSS_GRAIN_NOTE],
    },
    "local|hmrc/self_employment_income/count|": {
        "label": "Income: people with self-employment income",
        "notes": ["Uprated with HMRC Income Tax liabilities statistics", CROSS_GRAIN_NOTE],
    },
    "local|hmrc/higher_rate_taxpayers/count|": {
        "label": "Higher-rate Income Tax payers",
        "notes": ["Uprated with HMRC Income Tax liabilities statistics", CROSS_GRAIN_NOTE],
    },
    "local|council_tax|council_tax_band": {
        "label": "Council Tax dwelling stock",
        "notes": ["Sum of published taxbase lines", CROSS_GRAIN_NOTE],
    },
    # Expected in the release built from microcosm 90ff43f95; unused until then.
    "local|council_tax/single_adult_discount|": {
        "label": "Dwellings with a Council Tax single-adult discount",
        "notes": ["Sum of published taxbase lines"],
    },
    "local|rent/private_rent|": {
        "label": "Private rents paid",
        "notes": ["12 times the ONS Price Index of Private Rents mean monthly rent for 2025, times private-renter households"],
    },
    "local|rent/private_rent_brma|": {
        "label": "Private rents paid",
        "notes": ["12 times the ONS Price Index of Private Rents mean monthly rent for 2025, times private-renter households"],
    },
    "local|energy/electricity_kwh|": {
        "label": "Domestic electricity consumption",
        "notes": ["Uprated to 2025 with DESNZ Energy Trends (Great Britain domestic level)"],
        "derivation": "Microcosm derivation from open data (DESNZ LSOA and data zone consumption)",
    },
    "local|energy/gas_kwh|": {
        "label": "Domestic gas consumption",
        "notes": ["Uprated to 2025 with DESNZ Energy Trends (Great Britain domestic level)"],
        "derivation": "Microcosm derivation from open data (DESNZ LSOA and data zone consumption)",
    },
    "local|energy/gas_connected_households|": {
        "label": "Gas-connected households",
        "notes": ["Census households times the DESNZ share of households with a gas meter"],
        "derivation": "Microcosm derivation from open data (DESNZ LSOA and data zone consumption)",
    },
    "local|high_value_homes|value_threshold": {
        "label": "Owner-occupied homes above high-value thresholds",
        "derivation": HVH_DERIVATION,
    },
}

# Never copied from the diagnostics; the output is scanned for these keys.
FORBIDDEN_KEYS = {
    "initial_estimate",
    "final_estimate",
    "relative_error",
    "within_tolerance",
    "compiled_target",
    "target_loss_weight",
    "target_loss_weight_share",
    "target_loss_scale",
    "final_capped_scaled_error",
    "final_loss_contribution",
    "fraction_within_10pct",
    "withinTenPctShare",
    "uk_diagnostics",
    "effective_sample_size",
    "realized_max_weight_ratio",
    "top_1pct_weight_share",
    "n_nonzero",
    "loss_trajectory",
    "initial_loss",
    "final_loss",
    "past_cap_census",
    "carrier_floor_met",
    "model_figures_withheld",
    "area_support",
    "reviewed_limitations",
}


class UnsupportedDiagnostics(ValueError):
    """The input files are not what this extraction understands."""


def fetch_bytes(url: str) -> bytes:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "policyengine-model"})
        with urllib.request.urlopen(req) as resp:
            return resp.read()
    except Exception:
        # Fallback to curl if Python SSL certs aren't configured
        return subprocess.check_output(["curl", "-sfL", url])


def read_bytes(path_or_url: str) -> bytes:
    if path_or_url.startswith(("http://", "https://")):
        return fetch_bytes(path_or_url)
    with open(path_or_url, "rb") as f:
        return f.read()


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _is_finite_number(value) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    return isinstance(value, float) and math.isfinite(value)


def _is_nonempty_string(value) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _as_factor(value) -> float | None:
    """A finite number, or a string holding one (metadata stores some factors
    as strings); None when the value is neither."""
    if isinstance(value, str):
        try:
            value = float(value)
        except ValueError:
            return None
    return float(value) if _is_finite_number(value) else None


def _field(obj, *path):
    for key in path:
        if not isinstance(obj, dict) or key not in obj:
            raise UnsupportedDiagnostics(f"missing {'.'.join(path)}")
        obj = obj[key]
    return obj


def verify_releases(
    bundle: dict, dense_manifest: dict, national_raw: bytes, dense_raw: bytes
) -> dict:
    """Tie both diagnostics files to the UK pair the bundle manifest serves."""
    uk = _field(bundle, "data_releases", "uk")
    datasets = _field(uk, "datasets")

    national_entry = _field(datasets, "calibration_diagnostics")
    national_id = _field(uk, "build_id")
    if national_entry.get("revision") != national_id:
        raise UnsupportedDiagnostics(
            f"bundle calibration_diagnostics revision {national_entry.get('revision')!r} "
            f"is not the UK build {national_id!r}"
        )
    if sha256(national_raw) != national_entry.get("sha256"):
        raise UnsupportedDiagnostics(
            f"national diagnostics sha256 {sha256(national_raw)} does not match the "
            f"bundle manifest ({national_entry.get('sha256')})"
        )

    dense_entry = _field(datasets, "microcosm_uk_2024_25_dense")
    dense_id = dense_entry.get("revision")
    if _field(dense_manifest, "build", "cut_tag") != dense_id:
        raise UnsupportedDiagnostics(
            f"dense release manifest is for {dense_manifest['build']['cut_tag']!r}, "
            f"not the bundle's local-area release {dense_id!r}"
        )
    artifacts = _field(dense_manifest, "artifacts")
    if _field(artifacts, "microcosm_uk_2024_25_dense", "sha256") != dense_entry.get("sha256"):
        raise UnsupportedDiagnostics(
            "dense release manifest's microcosm_uk_2024_25_dense sha256 does not "
            "match the bundle manifest"
        )
    expected = _field(artifacts, "calibration_diagnostics", "sha256")
    if sha256(dense_raw) != expected:
        raise UnsupportedDiagnostics(
            f"dense diagnostics sha256 {sha256(dense_raw)} does not match the "
            f"dense release manifest ({expected})"
        )

    model = uk.get("model_package") or {}
    return {
        "policyengineVersion": uk.get("policyengine_version") or bundle.get("policyengine_version"),
        "modelVersion": model.get("version"),
        "national": {
            "buildId": national_id,
            "dataset": uk.get("default_dataset"),
            "diagnosticsSha256": national_entry["sha256"],
        },
        "localArea": {
            "buildId": dense_id,
            "dataset": "microcosm_uk_2024_25_dense",
            "diagnosticsSha256": expected,
        },
    }


def source_parts(t: dict) -> tuple[str, str, str]:
    """(family, table, locator) from 'family | table | file | vintage | locator'."""
    name = t.get("name")
    source = t.get("source")
    parts = [p.strip() for p in source.split(" | ")] if isinstance(source, str) else []
    if len(parts) != 5 or not all(parts):
        raise UnsupportedDiagnostics(
            f"target {name!r}: source {source!r} is not 'family | table | file | vintage | url'"
        )
    family, table, _file, _vintage, locator = parts
    if family not in PUBLISHERS:
        raise UnsupportedDiagnostics(f"target {name!r}: no publisher label for {family!r}")
    if family in NON_URL_FAMILIES:
        if not (locator.startswith("https://") or REPO_PATH.match(locator)):
            raise UnsupportedDiagnostics(
                f"target {name!r}: locator {locator!r} is neither a URL nor a repository path"
            )
    elif not locator.startswith(("http://", "https://")):
        raise UnsupportedDiagnostics(f"target {name!r}: citation {locator!r} is not a URL")
    return family, table, locator


def ledger_level(md: dict, name: str) -> tuple[str, str | None]:
    gid = md.get("ledger_geography_id")
    level = md.get("ledger_geography_level")
    if level == "country" and gid in TOP_GEOGRAPHIES:
        return TOP_GEOGRAPHIES[gid][0], None
    if level == "country" and gid in NATIONS:
        return "nation", NATIONS[gid]
    if level == "region" and isinstance(gid, str) and REGION_ID.match(gid):
        return "region", None
    raise UnsupportedDiagnostics(
        f"target {name!r}: unrecognised geography {gid!r} at level {level!r}"
    )


def local_level(t: dict, md: dict) -> str:
    geo = (t.get("hierarchy") or {}).get("geography") or {}
    key = (geo.get("level"), md.get("area_type"))
    if key not in LOCAL_LEVELS:
        raise UnsupportedDiagnostics(
            f"target {t.get('name')!r}: unrecognised local geography {key!r}"
        )
    return LOCAL_LEVELS[key]


def filters_of(md: dict) -> dict[str, str]:
    """Filter variable -> canonical JSON of its filter values (bounds folded in)."""
    by_var: dict[str, dict] = defaultdict(dict)
    for key, value in md.items():
        if key.startswith("ledger_filter_"):
            var = key[len("ledger_filter_"):]
            base = re.sub(r"_(lower|upper)_bound(_inclusive|_exclusive)?$", "", var)
            by_var[base][var] = value
    return {var: json.dumps(v, sort_keys=True) for var, v in by_var.items()}


def concept_group(concept: str) -> tuple[str, str | None]:
    for pattern, group, breakdown in CONCEPT_GROUPS:
        if pattern.search(concept):
            return group, breakdown
    return concept, None


def slim_target(t, release: str) -> dict:
    """The only fields kept from a diagnostics target; anything malformed stops."""
    if not isinstance(t, dict) or not _is_nonempty_string(t.get("name")):
        raise UnsupportedDiagnostics(f"target without a name: {t!r:.200}")
    name = t["name"]
    md = t.get("metadata")
    if not isinstance(md, dict):
        raise UnsupportedDiagnostics(f"target {name!r}: metadata is not an object")
    value = t.get("target")
    if not _is_finite_number(value):
        raise UnsupportedDiagnostics(f"target {name!r}: target value {value!r} is not a finite number")
    period = t.get("period")
    if (
        not isinstance(period, int)
        or isinstance(period, bool)
        or not CALIBRATION_YEARS[0] <= period <= CALIBRATION_YEARS[1]
    ):
        raise UnsupportedDiagnostics(f"target {name!r}: period {period!r} is not a calibration year")
    family, table, _locator = source_parts(t)
    out = {
        "name": name,
        "release": release,
        "value": float(value),
        "period": period,
        "family": family,
        "table": table,
    }

    concept = md.get("ledger_measure_concept")
    if concept is not None:
        if not _is_nonempty_string(concept) or concept != concept.strip():
            raise UnsupportedDiagnostics(f"target {name!r}: ledger_measure_concept {concept!r} is missing or padded")
        unit = md.get("ledger_measure_unit")
        if unit not in MEASURE_UNITS:
            raise UnsupportedDiagnostics(f"target {name!r}: ledger_measure_unit {unit!r} is not one of {sorted(MEASURE_UNITS)}")
        level, nation = ledger_level(md, name)
        notes = []
        op = md.get("ledger_value_operation")
        if op not in PUBLISHED_OPERATIONS:
            if op not in OPERATION_NOTES:
                raise UnsupportedDiagnostics(f"target {name!r}: unknown value operation {op!r}")
            notes.append(OPERATION_NOTES[op])
        factor = md.get("uprating_factor")
        if factor is not None:
            if _as_factor(factor) is None:
                raise UnsupportedDiagnostics(f"target {name!r}: uprating_factor {factor!r} is not a number")
            if abs(_as_factor(factor) - 1.0) > 1e-12:
                index = md.get("uprating_index")
                if index not in UPRATING_INDICES:
                    raise UnsupportedDiagnostics(f"target {name!r}: no label for uprating index {index!r}")
                to = md.get("uprating_to_period")
                notes.append(f"Uprated{f' to {to}' if to else ''} with {UPRATING_INDICES[index]}")
        cross = md.get("cross_grain_factor")
        if cross is not None:
            if _as_factor(cross) is None:
                raise UnsupportedDiagnostics(f"target {name!r}: cross_grain_factor {cross!r} is not a number")
            if abs(_as_factor(cross) - 1.0) > 1e-12:
                notes.append(CROSS_GRAIN_NOTE)
        if md.get("ledger_assertion") == "source_projection":
            notes.append(PROJECTION_NOTE)
        if unit == "gbp_per_week x 52":
            notes.append(WEEKLY_NOTE)
        group, group_breakdown = concept_group(concept)
        filters = filters_of(md)
        out.update(
            scope="ledger",
            level=level,
            nation=nation,
            concept=group,
            groupBreakdown=group_breakdown,
            filters=filters,
            unit="gbp" if unit == "gbp_per_week x 52" else unit,
            notes=notes,
        )
    else:
        if any(str(k).startswith("ledger_") for k in md):
            raise UnsupportedDiagnostics(f"target {name!r}: ledger metadata without a measure concept")
        metric = md.get("metric")
        if not _is_nonempty_string(metric):
            raise UnsupportedDiagnostics(f"target {name!r}: local target without a metric")
        stem, breakdown_var = metric, None
        for pattern, s, var in LOCAL_STEMS:
            if pattern.search(metric):
                stem, breakdown_var = s, var
                break
        out.update(
            scope="local",
            level=local_level(t, md),
            nation=None,
            concept=stem,
            groupBreakdown=None,
            filters={breakdown_var: json.dumps(metric)} if breakdown_var else {},
            unit=LOCAL_UNITS.get(metric, "count"),
            notes=[],
        )
    return out


def read_release(raw: bytes, release: str) -> tuple[dict, list[dict]]:
    """Validate a diagnostics file and slim its targets."""
    try:
        diagnostics = json.loads(raw)
    except ValueError as e:
        raise UnsupportedDiagnostics(f"{release} diagnostics are not JSON: {e}") from e
    if not isinstance(diagnostics, dict):
        raise UnsupportedDiagnostics(f"{release} diagnostics is not an object")
    version = diagnostics.get("schema_version")
    if not isinstance(version, int) or isinstance(version, bool) or version not in SUPPORTED_SCHEMA_VERSIONS:
        raise UnsupportedDiagnostics(
            f"{release} diagnostics schema_version {version!r} is not one of {sorted(SUPPORTED_SCHEMA_VERSIONS)}"
        )
    if diagnostics.get("weight_entity") != "household":
        raise UnsupportedDiagnostics(f"{release} weight_entity {diagnostics.get('weight_entity')!r} is not 'household'")
    n_records = diagnostics.get("n_records")
    if not isinstance(n_records, int) or isinstance(n_records, bool) or n_records <= 0:
        raise UnsupportedDiagnostics(f"{release} n_records {n_records!r} is not a positive integer")
    targets = diagnostics.get("targets")
    if not isinstance(targets, list) or not targets:
        raise UnsupportedDiagnostics(f"{release} targets is missing or empty")
    slim = [slim_target(t, release) for t in targets]

    # Cross-checks against the totals the diagnostics state about themselves,
    # so a truncated or duplicated target list is caught.
    names = [t["name"] for t in slim]
    if len(set(names)) != len(names):
        raise UnsupportedDiagnostics(f"{release} target names are not unique")
    surface = diagnostics.get("target_surface")
    surface = surface if isinstance(surface, dict) else {}
    if surface.get("n_targets") != len(slim):
        raise UnsupportedDiagnostics(
            f"{release} target_surface.n_targets {surface.get('n_targets')!r} does not match {len(slim)} targets"
        )
    if surface.get("n_records") != n_records:
        raise UnsupportedDiagnostics(
            f"{release} target_surface.n_records {surface.get('n_records')!r} does not match n_records {n_records!r}"
        )
    return {"households": n_records, "targets": len(slim)}, slim


def merge_releases(national: list[dict], dense: list[dict]) -> list[dict]:
    """Union of both target surfaces. A target in both releases (same name)
    must carry the same value there; it is kept once."""
    by_name: dict[str, dict] = {}
    for t in dense:
        by_name[t["name"]] = dict(t, inNational=False)
    for t in national:
        if t["name"] in by_name:
            d = by_name[t["name"]]
            if abs(d["value"] - t["value"]) > 1e-9 * max(1.0, abs(t["value"])):
                raise UnsupportedDiagnostics(f"target {t['name']!r}: national and local-area values differ")
            d["inNational"] = True
        else:
            by_name[t["name"]] = dict(t, inNational=True)
    return list(by_name.values())


def row_key(scope: str, concept: str, filters) -> str:
    return "|".join([scope, concept, ",".join(sorted(filters))])


def breakdown_of(targets: list[dict]) -> str | None:
    """Names of the filter variables whose values differ within the row."""
    names: list[str] = []
    group = {t["groupBreakdown"] for t in targets}
    if len(group) != 1:
        raise UnsupportedDiagnostics(f"row {targets[0]['concept']!r} mixes concept groups")
    variables = sorted({v for t in targets for v in t["filters"]})
    for var in variables:
        values = {t["filters"].get(var) for t in targets}
        if len(values) > 1:
            if var not in BREAKDOWNS:
                raise UnsupportedDiagnostics(f"no breakdown name for filter variable {var!r}")
            if BREAKDOWNS[var] not in names:
                names.append(BREAKDOWNS[var])
    breakdown = next(iter(group))
    if breakdown and breakdown not in names:
        names.append(breakdown)
    if not names:
        return None
    text = " × ".join(names)
    return text[:1].upper() + text[1:]


def group_rows(targets: list[dict]) -> tuple[list[dict], list[str]]:
    """One row per (scope, measure concept, filter variable names).

    This is the US page's (variable, domain) grouping: the ledger measure
    concept stands for the variable and the filter variable names (never
    their values) for the domain. Local rows key on the metric stem.
    Returns the rows and the LABELS keys no row used.
    """
    grouped: dict[str, list[dict]] = defaultdict(list)
    for t in targets:
        grouped[row_key(t["scope"], t["concept"], t["filters"])].append(t)

    unlabelled = sorted(k for k in grouped if k not in LABELS)
    if unlabelled:
        raise UnsupportedDiagnostics(
            "no label for row key(s):\n  " + "\n  ".join(unlabelled)
            + "\nAdd them to LABELS in scripts/extract_uk_calibration_targets.py"
        )

    rows = []
    for key, ts in grouped.items():
        entry = LABELS[key]
        counts = Counter(t["level"] for t in ts)
        headline_value, headline_geo = None, None
        for level in HEADLINE_LEVELS:
            at_level = [t for t in ts if t["level"] == level]
            if at_level:
                if len(at_level) == 1:
                    headline_value = at_level[0]["value"]
                    headline_geo = next(n for lv, n in TOP_GEOGRAPHIES.values() if lv == level)
                break
        else:
            if len(ts) == 1 and ts[0]["level"] == "nation":
                headline_value, headline_geo = ts[0]["value"], ts[0]["nation"]
        families = [f for f, _ in Counter(t["family"] for t in ts).most_common()]
        sources = []
        for f in families:
            label = entry.get("derivation") if f == "microcosm" else PUBLISHERS[f]
            if f == "microcosm" and not label:
                raise UnsupportedDiagnostics(f"row {key!r}: Microcosm-derived targets need a 'derivation' label")
            sources.append(label)
        units = {t["unit"] for t in ts}
        if len(units) != 1:
            raise UnsupportedDiagnostics(f"row {key!r} mixes units {sorted(units)}")
        periods = {t["period"] for t in ts}
        notes = sorted({n for t in ts for n in t["notes"]}) + list(entry.get("notes", []))
        rows.append(
            {
                "key": key,
                "scope": "national" if ts[0]["scope"] == "ledger" else "local",
                "label": entry["label"],
                "breakdown": breakdown_of(ts),
                "geoLevels": [lvl for lvl in LEVEL_KEYS if counts.get(lvl)],
                **{COUNT_FIELDS[lvl]: counts.get(lvl, 0) for lvl in LEVEL_KEYS},
                "nations": sorted({t["nation"] for t in ts if t["nation"]}),
                "targetCount": len(ts),
                "nationalValue": headline_value,
                "nationalValueGeography": headline_geo,
                "unit": next(iter(units)),
                "source": ", ".join(sources),
                "sourceTables": sorted({t["table"] for t in ts}),
                "period": next(iter(periods)) if len(periods) == 1 else None,
                "notes": notes,
                # True when the national file calibrates none of the row's targets.
                "localAreaFileOnly": not any(t["inNational"] for t in ts),
            }
        )
    rows.sort(key=lambda r: (r["scope"] != "national", r["label"].lower(), (r["breakdown"] or "").lower(), r["key"]))
    unused = sorted(k for k in LABELS if k not in grouped)
    return rows, unused


def level_counts(targets: list[dict]) -> dict:
    return {lvl: sum(1 for t in targets if t["level"] == lvl) for lvl in LEVEL_KEYS}


def assert_clean(obj, path="$"):
    """Refuse output that carries any key a diagnostics file uses for model figures."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in FORBIDDEN_KEYS:
                raise AssertionError(f"forbidden key {k!r} at {path}")
            assert_clean(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            assert_clean(v, f"{path}[{i}]")


def extract(bundle: dict, dense_manifest: dict, national_raw: bytes, dense_raw: bytes) -> tuple[dict, list[str]]:
    releases = verify_releases(bundle, dense_manifest, national_raw, dense_raw)
    national_info, national = read_release(national_raw, "national")
    dense_info, dense = read_release(dense_raw, "localArea")
    merged = merge_releases(national, dense)
    years = sorted({t["period"] for t in merged})
    if len(years) != 1:
        raise UnsupportedDiagnostics(f"targets span several calibration years: {years}")
    rows, unused = group_rows(merged)
    output = {
        "schemaVersion": 1,
        "country": "uk",
        "policyengineVersion": releases["policyengineVersion"],
        "modelVersion": releases["modelVersion"],
        "calibrationYear": years[0],
        "releases": {
            "national": {**releases["national"], **national_info},
            "localArea": {**releases["localArea"], **dense_info},
        },
        "totalTargets": {
            "national": len(national),
            "localArea": len(dense),
            "union": len(merged),
        },
        "levelCounts": {
            "national": level_counts(national),
            "localArea": level_counts(dense),
            "union": level_counts(merged),
        },
        "rows": rows,
    }
    assert_clean(output)
    return output, unused


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--national", required=True, help="national release calibration_diagnostics.json")
    parser.add_argument("--dense", required=True, help="local-area release calibration_diagnostics.json")
    parser.add_argument("--dense-release-manifest", required=True, help="local-area release release_manifest.json")
    parser.add_argument("--bundle-manifest", default=BUNDLE_MANIFEST_URL, help="policyengine.py bundle manifest (path or URL)")
    parser.add_argument("--out", default=os.path.normpath(OUTPUT_PATH))
    args = parser.parse_args()

    bundle = json.loads(read_bytes(args.bundle_manifest))
    dense_manifest = json.loads(read_bytes(args.dense_release_manifest))
    output, unused = extract(bundle, dense_manifest, read_bytes(args.national), read_bytes(args.dense))

    total = output["totalTargets"]
    print(
        f"policyengine.py {output['policyengineVersion']}: national {output['releases']['national']['buildId']} "
        f"({total['national']} targets), local area {output['releases']['localArea']['buildId']} "
        f"({total['localArea']} targets); {total['union']} in all, in {len(output['rows'])} rows"
    )
    if unused:
        print("Labels no row used (expected for a later release, or stale):\n  " + "\n  ".join(unused))
    with open(args.out, "w") as f:
        json.dump(output, f, indent=2, allow_nan=False, ensure_ascii=False)
        f.write("\n")
    print(f"Written to {args.out}")


if __name__ == "__main__":
    main()
