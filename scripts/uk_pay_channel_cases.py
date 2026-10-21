"""Run policyengine-uk's pay-channel formulas on made-up people and print what
they return, so the behavioural page's claims about them can be checked.

    uv run --no-project --with numpy python scripts/uk_pay_channel_cases.py \\
      /path/to/policyengine-uk

It lifts the `formula` of three variables out of their source files and calls
it with stand-in person, parameter and baseline objects, so it needs no
policyengine-uk install:
- employer_ni_fixed_employer_cost_change (pay under an employer NI reform)
- salary_sacrifice_broad_base_haircut (the cut to every worker's pay)
- salary_sacrifice_returned_to_income (contributions above the cap)
Output is JSON: one record per case. src/test/ukBehavioural.test.tsx reads it.
"""

import ast
import json
import sys
from pathlib import Path
from types import SimpleNamespace as NS

import numpy as np

WEEKS_IN_YEAR = 52
FILES = {
    "employer_ni_fixed_employer_cost_change": "variables/contrib/policyengine/employer_ni/employer_ni_fixed_employer_cost_change.py",
    "salary_sacrifice_broad_base_haircut": "variables/gov/hmrc/national_insurance/salary_sacrifice_broad_base_haircut.py",
    "salary_sacrifice_returned_to_income": "variables/gov/hmrc/pensions/salary_sacrifice_returned_to_income.py",
}


def load_formula(source: Path, variable: str):
    tree = ast.parse((source / "policyengine_uk" / FILES[variable]).read_text())
    cls = next(
        n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == variable
    )
    formula = next(
        n for n in cls.body if isinstance(n, ast.FunctionDef) and n.name == "formula"
    )
    namespace = {
        "np": np,
        "max_": np.maximum,
        "where": np.where,
        "WEEKS_IN_YEAR": WEEKS_IN_YEAR,
        "add": lambda entity, period, names: sum(
            entity(name, period) for name in names
        ),
    }
    exec(
        compile(ast.Module(body=[formula], type_ignores=[]), FILES[variable], "exec"),
        namespace,
    )
    return namespace["formula"]


def parameters(
    *,
    rate=0.15,
    threshold_weekly=96.0,
    exempt=True,
    incidence=1.0,
    cap=np.inf,
    haircut=0.0016,
):
    tree = NS(
        gov=NS(
            hmrc=NS(
                national_insurance=NS(
                    class_1=NS(
                        rates=NS(employer=rate),
                        thresholds=NS(secondary_threshold=threshold_weekly),
                    ),
                    salary_sacrifice_pension_cap=cap,
                )
            ),
            contrib=NS(
                policyengine=NS(
                    employer_ni=NS(
                        employee_incidence=incidence,
                        exempt_employer_pension_contributions=exempt,
                    )
                ),
                behavioral_responses=NS(
                    salary_sacrifice_broad_base_haircut_rate=haircut
                ),
            ),
        )
    )
    return lambda period: tree


class Person:
    def __init__(self, values: dict, baseline_parameters=None):
        self.values = {k: np.asarray(v, dtype=float) for k, v in values.items()}
        baseline = None
        if baseline_parameters is not None:
            baseline = NS(tax_benefit_system=NS(parameters=baseline_parameters))
        self.simulation = NS(baseline=baseline)

    def __call__(self, name, period):
        return self.values.get(name, np.zeros(1))


def employer_cost(pay, rate, threshold_weekly):
    return pay + rate * max(pay - threshold_weekly * WEEKS_IN_YEAR, 0)


def main(source: str) -> None:
    src = Path(source)
    employer = load_formula(src, "employer_ni_fixed_employer_cost_change")
    haircut = load_formula(src, "salary_sacrifice_broad_base_haircut")
    returned = load_formula(src, "salary_sacrifice_returned_to_income")
    cases = []

    def employer_case(label, pay, baseline, reform):
        person = Person({"employment_income_before_lsr": [pay]}, parameters(**baseline))
        change = float(
            np.asarray(employer(person, 2026, parameters(**reform))).ravel()[0]
        )
        new_pay = pay + change
        cases.append(
            {
                "kind": "employer_ni",
                "label": label,
                "pay": pay,
                "change": change,
                "baselineCost": employer_cost(
                    pay,
                    baseline.get("rate", 0.15),
                    baseline.get("threshold_weekly", 96.0),
                ),
                "reformCost": employer_cost(
                    new_pay,
                    reform.get("rate", 0.15),
                    reform.get("threshold_weekly", 96.0),
                ),
            }
        )

    employer_case(
        "rate rise, pay above both thresholds", 40_000, {"rate": 0.138}, {"rate": 0.15}
    )
    employer_case(
        "rate rise, incidence 0",
        40_000,
        {"rate": 0.138, "incidence": 0.0},
        {"rate": 0.15, "incidence": 0.0},
    )
    employer_case(
        "rate rise, pay below the baseline threshold",
        4_000,
        {"rate": 0.138},
        {"rate": 0.15},
    )
    employer_case(
        "threshold lifted past pay",
        30_000,
        {"rate": 0.10, "threshold_weekly": 10_000 / WEEKS_IN_YEAR},
        {"rate": 0.10, "threshold_weekly": 50_000 / WEEKS_IN_YEAR},
    )
    employer_case("no change", 40_000, {}, {})

    for label, cap in (("cap off", np.inf), ("cap £2,000", 2_000.0)):
        person = Person({"employment_income_before_lsr": [40_000.0]})
        cases.append(
            {
                "kind": "haircut",
                "label": label,
                "pay": 40_000.0,
                "change": float(
                    np.asarray(haircut(person, 2030, parameters(cap=cap))).ravel()[0]
                ),
            }
        )
    for label, cap, sacrificed in (
        ("cap off", np.inf, 5_000.0),
        ("cap £2,000, below it", 2_000.0, 1_500.0),
        ("cap £2,000, above it", 2_000.0, 5_000.0),
    ):
        person = Person(
            {"pension_contributions_via_salary_sacrifice_from_pay": [sacrificed]}
        )
        cases.append(
            {
                "kind": "returned",
                "label": label,
                "sacrificed": sacrificed,
                "change": float(
                    np.asarray(returned(person, 2030, parameters(cap=cap))).ravel()[0]
                ),
            }
        )
    json.dump(cases, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1])
