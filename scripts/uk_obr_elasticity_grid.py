"""Print the OBR-method labour supply elasticities policyengine-uk assigns to
every family type, by running its own functions on made-up people.

    uv run --no-project --with numpy --with pandas python \\
      scripts/uk_obr_elasticity_grid.py /path/to/policyengine-uk

It lifts calculate_labour_substitution_elasticities and
calculate_labour_net_income_elasticities out of dynamics/progression.py and
calls them with a stand-in simulation, so it needs no policyengine-uk install.
Output is JSON: one row per gender, marital status and age of the youngest
child under 18 (null for no children), with both elasticities.
src/test/ukBehavioural.test.tsx compares the page's table with it.
"""

import ast
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

FUNCTIONS = (
    "calculate_labour_substitution_elasticities",
    "calculate_labour_net_income_elasticities",
)


def load_functions(source: Path) -> dict:
    tree = ast.parse((source / "policyengine_uk/dynamics/progression.py").read_text())
    found = [
        n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in FUNCTIONS
    ]
    if {n.name for n in found} != set(FUNCTIONS):
        raise SystemExit(f"progression.py no longer defines {FUNCTIONS}")
    namespace = {
        "np": np,
        "Simulation": object,
        "benunit_age_18_composition": lambda sim, year: sim.composition,
    }
    exec(
        compile(ast.Module(body=found, type_ignores=[]), "progression.py", "exec"),
        namespace,
    )
    return {name: namespace[name] for name in FUNCTIONS}


class People:
    """The variables the two functions read, one entry per person."""

    def __init__(self, rows: list[dict]):
        self.columns = {
            "gender": np.array([r["gender"] for r in rows]),
            "is_married": np.array([r["married"] for r in rows]),
        }
        youngest = [r["youngest"] for r in rows]
        self.composition = pd.DataFrame(
            {
                "count_under_18": [0 if y is None else 1 for y in youngest],
                "youngest_under_18_age": [-1 if y is None else y for y in youngest],
            }
        )

    def calculate(self, name, year=None, map_to=None):
        return self.columns[name]


def grid() -> list[dict]:
    return [
        {"gender": gender, "married": married, "youngest": youngest}
        for gender in ("FEMALE", "MALE")
        for married in (True, False)
        for youngest in [None, *range(18)]
    ]


def main(source: str) -> None:
    functions = load_functions(Path(source))
    rows = grid()
    people = People(rows)
    substitution = functions[FUNCTIONS[0]](people)
    income = functions[FUNCTIONS[1]](people)
    for row, s, i in zip(rows, substitution, income):
        row["substitution"] = round(float(s), 6)
        row["income"] = round(float(i), 6)
    json.dump(rows, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1])
