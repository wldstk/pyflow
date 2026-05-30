"""
Node implementation template

Contract
  run(inputs, params) -> dict

  inputs  flat dict of all named outputs from predecessor nodes
  params  dict of resolved params (YAML defaults + pipeline overrides)

  Return a flat dict of named outputs.
  The YAML spec's report section drives what gets displayed — do not
  build stats / headline / status here; just return the data.
"""

import csv
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent.parent / "data"


def run(inputs: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
    filepath = DATA_DIR / params.get("filename", "sample.csv")

    if not filepath.exists():
        raise FileNotFoundError(f"File not found: {filepath}")

    rows: list[dict[str, Any]] = []
    columns: list[str] = []
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        columns = list(reader.fieldnames or [])
        rows = [dict(row) for row in reader]

    return {"rows": rows, "columns": columns}
