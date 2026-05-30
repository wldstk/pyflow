import time
from typing import Any

from pyflow import tqdm

NUMERIC_COLS: list[str] = [
    "temperature_c",
    "humidity_pct",
    "pressure_hpa",
    "wind_kmh",
    "rainfall_mm",
]

_DEMO_SECONDS = 10


def run(inputs: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
    parsed: list[dict[str, Any]] = []
    errors = 0

    rows = inputs.get("rows", [])
    steps = 100
    interval = _DEMO_SECONDS / steps

    for _ in tqdm(range(steps), desc="Parsing types"):
        time.sleep(interval)

    for raw in rows:
        row: dict[str, Any] = dict(raw)
        for col in NUMERIC_COLS:
            val = row.get(col)
            if val is None or val == "":
                row[col] = None
                errors += 1
                continue
            try:
                row[col] = float(val)
            except ValueError:
                row[col] = None
                errors += 1
        parsed.append(row)

    return {"rows": parsed, "rows_parsed": len(parsed), "parse_errors": errors}
