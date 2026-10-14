"""Run the pinned UK model on the pinned dataset and score every national target.

This is the check behind the UK validation page: the released household file,
run by the model version policyengine.py pins, for the calibration year,
against the same national targets the release was calibrated to. It writes
one row per target (aggregates only).

    git -C policyengine-uk-data archive 1.58.0 | tar -x -C /tmp/uk-data-1.58.0
    uv run --no-project --python 3.13 --with policyengine-uk==2.126.12 \\
      --with policyengine-core==3.33.0 --with pydantic --with pyyaml \\
      --with /tmp/uk-data-1.58.0 python scripts/run_uk_target_check.py \\
      <artifacts>/enhanced_frs_2024_25.h5 2025 <artifacts>/pinned_target_check.csv
"""

import hashlib
import sys
from importlib.metadata import version

import pandas as pd
from policyengine_uk import Microsimulation
from policyengine_uk.data import UKSingleYearDataset
from policyengine_uk_data.targets.build_loss_matrix import create_target_matrix


def sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main(dataset_path: str, year: str, out_path: str) -> None:
    dataset = UKSingleYearDataset(file_path=dataset_path)
    matrix, targets = create_target_matrix(dataset, time_period=year)
    sim = Microsimulation(dataset=dataset)
    weights = sim.calculate("household_weight", int(year)).values
    estimates = weights @ matrix.values
    out = pd.DataFrame(
        {"metric": targets.index, "target": targets.values, "estimate": estimates}
    )
    out.attrs = {}
    meta = {
        "policyengine_uk": version("policyengine-uk"),
        "policyengine_core": version("policyengine-core"),
        "policyengine_uk_data": version("policyengine-uk-data"),
        "dataset_sha256": sha256(dataset_path),
        "year": year,
        "people": float(sim.calculate("people", int(year)).sum()),
        "households": float(weights.sum()),
    }
    with open(out_path, "w") as f:
        for key, value in meta.items():
            f.write(f"# {key}={value}\n")
        out.to_csv(f, index=False)
    print(meta, len(out), "targets")


if __name__ == "__main__":
    main(*sys.argv[1:4])
