import math
from typing import Any

NUMERIC_COLS: list[str] = [
    "temperature_c",
    "humidity_pct",
    "pressure_hpa",
    "wind_kmh",
    "rainfall_mm",
]
UNITS: dict[str, str] = {
    "temperature_c": "°C",
    "humidity_pct": "%",
    "pressure_hpa": "hPa",
    "wind_kmh": "km/h",
    "rainfall_mm": "mm",
}


def _stats(values: list[float]) -> dict[str, Any]:
    n = len(values)
    if n == 0:
        return {"mean": None, "min": None, "max": None, "std": None, "count": 0}
    mean = sum(values) / n
    return {
        "mean": round(mean, 2),
        "min": round(min(values), 2),
        "max": round(max(values), 2),
        "std": round(math.sqrt(sum((x - mean) ** 2 for x in values) / n), 2),
        "count": n,
    }


def run(inputs: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
    rows: list[dict[str, Any]] = inputs.get("rows", [])
    column_stats: dict[str, Any] = {}
    for col in NUMERIC_COLS:
        values: list[float] = [r[col] for r in rows if r.get(col) is not None]
        s = _stats(values)
        s["unit"] = UNITS.get(col, "")
        column_stats[col] = s
    return {
        "column_stats": column_stats,
        "columns_computed": len(column_stats),
        "sample_size": len(rows),
        "rows": rows,
    }
