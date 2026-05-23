from typing import Any

NUMERIC_COLS: list[str] = [
    "temperature_c",
    "humidity_pct",
    "pressure_hpa",
    "wind_kmh",
    "rainfall_mm",
]


def run(inputs: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
    rows: list[dict[str, Any]] = inputs.get("rows", [])
    clean = [r for r in rows if all(r.get(c) is not None for c in NUMERIC_COLS)]
    dropped = len(rows) - len(clean)
    return {
        "rows": clean,
        "rows_in": len(rows),
        "rows_out": len(clean),
        "dropped": dropped,
    }
