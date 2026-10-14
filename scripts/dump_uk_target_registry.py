"""Dump policyengine-uk-data's calibration target registry to JSON.

Run it against the data package at the release tag, with the model version
that built the release, e.g. for policyengine-uk-data 1.58.0:

    git -C policyengine-uk-data archive 1.58.0 | tar -x -C /tmp/uk-data-1.58.0
    uv run --no-project --python 3.13 --with policyengine-uk==2.122.2 \\
      --with policyengine-core==3.32.13 --with pydantic --with pyyaml \\
      --with /tmp/uk-data-1.58.0 python scripts/dump_uk_target_registry.py registry_targets.json

The registry reads only target statistics bundled with the package, no microdata.
"""

import json
import sys

from policyengine_uk_data.targets.registry import get_all_targets


def main(out_path: str) -> None:
    targets = []
    for target in get_all_targets():
        row = target.model_dump(exclude={"custom_compute"})
        row["values"] = {str(year): value for year, value in row["values"].items()}
        targets.append(row)
    with open(out_path, "w") as f:
        json.dump(targets, f, indent=1, default=str)
    print(f"wrote {len(targets)} targets to {out_path}")


if __name__ == "__main__":
    main(sys.argv[1])
