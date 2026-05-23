import csv
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent.parent / "data"


def run(inputs: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
    filepath = DATA_DIR / params.get("filename", "weather.csv")
    if not filepath.exists():
        raise FileNotFoundError(f"CSV not found: {filepath}")
    rows: list[dict[str, Any]] = []
    columns: list[str] = []
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        columns = list(reader.fieldnames or [])
        rows = [dict(row) for row in reader]
    return {"rows": rows, "columns": columns}
