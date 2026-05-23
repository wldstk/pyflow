from typing import Any

NUMERIC_COLS: list[str] = [
    "temperature_c",
    "humidity_pct",
    "pressure_hpa",
    "wind_kmh",
    "rainfall_mm",
]


def run(inputs: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
    parsed: list[dict[str, Any]] = []
    errors = 0
    for raw in inputs.get("rows", []):
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
