import math
from typing import Any

NUMERIC_COLS: list[str] = [
    "temperature_c",
    "humidity_pct",
    "pressure_hpa",
    "wind_kmh",
    "rainfall_mm",
]


def _col_stats(rows: list[dict[str, Any]], col: str) -> tuple[float, float]:
    values: list[float] = [r[col] for r in rows if r.get(col) is not None]
    if not values:
        return 0.0, 1.0
    mean = sum(values) / len(values)
    std = math.sqrt(sum((x - mean) ** 2 for x in values) / len(values)) or 1.0
    return mean, std


def run(inputs: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
    rows: list[dict[str, Any]] = inputs.get("rows", [])
    threshold = float(params.get("z_threshold", 2.5))
    col_params: dict[str, tuple[float, float]] = {
        col: _col_stats(rows, col) for col in NUMERIC_COLS
    }
    flagged: list[dict[str, Any]] = []
    for row in rows:
        reasons: list[dict[str, Any]] = []
        for col in NUMERIC_COLS:
            val = row.get(col)
            if val is None:
                continue
            mean, std = col_params[col]
            z = abs(val - mean) / std
            if z > threshold:
                reasons.append({"column": col, "value": val, "z_score": round(z, 2)})
        if reasons:
            flagged.append({"timestamp": row.get("timestamp"), "flags": reasons})
    return {
        "rows": rows,
        "total_rows": len(rows),
        "anomalies_found": len(flagged),
        "anomalies": flagged,
    }
