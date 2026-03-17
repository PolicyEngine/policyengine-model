"""
Extract calibration targets from policyengine-us-data policy_data.db
and output a deduplicated JSON for the Calibration page.

Usage:
    python scripts/extract_calibration_targets.py

Downloads policy_data.db from HuggingFace, queries the target_overview view,
groups by (variable, domain_variable), and writes src/data/calibrationTargets.json.
"""

import json
import os
import sqlite3
import tempfile
import urllib.request

DB_URL = "https://huggingface.co/policyengine/policyengine-us-data/resolve/main/calibration/policy_data.db"
OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "src", "data", "calibrationTargets.json"
)


def download_db(dest: str) -> None:
    print(f"Downloading policy_data.db from HuggingFace...")
    try:
        urllib.request.urlretrieve(DB_URL, dest)
    except Exception:
        # Fallback to curl if Python SSL certs aren't configured
        import subprocess

        subprocess.check_call(["curl", "-sL", "-o", dest, DB_URL])
    print(f"Downloaded to {dest}")


def extract_targets(db_path: str) -> list[dict]:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute(
        """
        SELECT
            to2.variable,
            to2.domain_variable,
            GROUP_CONCAT(DISTINCT to2.geo_level) AS geo_levels,
            MAX(CASE WHEN to2.geo_level = 'national' THEN to2.value END) AS national_value,
            SUM(CASE WHEN to2.geo_level = 'national' THEN 1 ELSE 0 END) AS national_count,
            SUM(CASE WHEN to2.geo_level = 'state' THEN 1 ELSE 0 END) AS state_count,
            SUM(CASE WHEN to2.geo_level = 'district' THEN 1 ELSE 0 END) AS district_count,
            MAX(t.source) AS source,
            MAX(t.period) AS period
        FROM target_overview to2
        JOIN targets t ON to2.target_id = t.target_id
        WHERE to2.active = 1
        GROUP BY to2.variable, to2.domain_variable
        ORDER BY to2.variable, to2.domain_variable
        """
    )

    rows = []
    for row in cur.fetchall():
        variable, domain, geo_csv, nat_val, n_nat, n_state, n_dist, source, period = row
        geo_levels = sorted(geo_csv.split(",")) if geo_csv else []

        rows.append(
            {
                "variable": variable,
                "domain": domain,
                "geoLevels": geo_levels,
                "nationalValue": nat_val,
                "nationalCount": n_nat or 0,
                "stateCount": n_state or 0,
                "districtCount": n_dist or 0,
                "source": source,
                "period": period,
            }
        )

    conn.close()
    return rows


def main():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    try:
        download_db(db_path)
        targets = extract_targets(db_path)
        print(f"Extracted {len(targets)} unique (variable, domain) combinations")

        output = os.path.normpath(OUTPUT_PATH)
        with open(output, "w") as f:
            json.dump(targets, f, indent=2)
        print(f"Written to {output}")
    finally:
        os.unlink(db_path)


if __name__ == "__main__":
    main()
