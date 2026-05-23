import datetime
from typing import Any


def run(inputs: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
    column_stats: dict[str, Any] = inputs.get("column_stats", {})
    anomaly_count: int = inputs.get("anomalies_found", 0)

    summary_rows: list[dict[str, Any]] = [
        {
            "metric": col,
            "mean": s.get("mean"),
            "min": s.get("min"),
            "max": s.get("max"),
            "unit": s.get("unit", ""),
        }
        for col, s in column_stats.items()
    ]

    return {
        "summary_rows": summary_rows,
        "anomaly_count": anomaly_count,
        "generated_at": datetime.datetime.utcnow().isoformat(),
    }
