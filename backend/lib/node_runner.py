"""
lib/node_runner.py
──────────────────
Generic node execution engine.

Each node is a pair of files inside a project's nodes/ directory:
  <name>.yml   — interface contract: params, report (stats + headline + detail)
  <name>.py    — pure implementation: run(inputs, params) -> dict
"""

import importlib.util
import sys
import time
import traceback
from pathlib import Path
from typing import Any

import yaml

from .models import HeadlineData, NodeResult, NodeSpec

# Safe builtins exposed in report expression evaluation
_SAFE: dict[str, Any] = {
    "len": len,
    "round": round,
    "sum": sum,
    "min": min,
    "max": max,
    "abs": abs,
    "int": int,
    "float": float,
    "str": str,
    "bool": bool,
    "list": list,
    "dict": dict,
    "sorted": sorted,
    "enumerate": enumerate,
}


# ── Expression evaluator ───────────────────────────────────────


def _eval(expr: str, context: dict[str, Any]) -> Any:
    try:
        return eval(str(expr), {"__builtins__": _SAFE}, context)
    except Exception:
        return None


# ── Spec loader ────────────────────────────────────────────────


def load_spec(nodes_dir: Path, spec_name: str) -> NodeSpec:
    path = nodes_dir / f"{spec_name}.yml"
    if not path.exists():
        raise FileNotFoundError(f"Node spec not found: {path}")
    with open(path, encoding="utf-8") as f:
        raw: Any = yaml.safe_load(f)
    return NodeSpec.model_validate(raw)


# ── Node executor ──────────────────────────────────────────────


def execute(
    nodes_dir: Path,
    spec_name: str,
    inputs: dict[str, Any],
    params_override: dict[str, Any] | None = None,
) -> NodeResult:
    """
    Load the spec YAML and implementation, execute run(inputs, params),
    then evaluate the report section to build the standard NodeResult.
    """
    spec = load_spec(nodes_dir, spec_name)

    py_path = nodes_dir / f"{spec_name}.py"
    if not py_path.exists():
        raise FileNotFoundError(f"Node script not found: {py_path}")

    # Resolve params: YAML defaults overridden by pipeline-level values
    params: dict[str, Any] = {k: v.default for k, v in spec.params.items()}
    params.update(params_override or {})

    # Load the implementation module with a unique key per project+spec
    mod_key = f"pyflow_node_{nodes_dir.parent.name}_{spec_name}"
    if mod_key in sys.modules:
        del sys.modules[mod_key]
    mod_spec = importlib.util.spec_from_file_location(mod_key, py_path)
    if mod_spec is None or mod_spec.loader is None:
        raise ImportError(f"Cannot load module from {py_path}")
    mod = importlib.util.module_from_spec(mod_spec)
    mod_spec.loader.exec_module(mod)  # type: ignore[union-attr]

    try:
        t0 = time.perf_counter()
        outputs: dict[str, Any] = mod.run(inputs=inputs, params=params)  # type: ignore[attr-defined]
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)
    except Exception as exc:
        traceback.print_exc()
        return NodeResult(
            status="error",
            label=spec.label,
            description=spec.description,
            node_type=spec.node_type,
            icon=spec.icon,
            elapsed_ms=None,
            stats={"error": str(exc)},
            headline=None,
            payload={},
            detail={},
        )

    # ── Build report from spec ─────────────────────────────────
    report = spec.report

    stats: dict[str, Any] = {}
    for stat in report.stats:
        key = stat.key or stat.label.lower().replace(" ", "_")
        stats[key] = _eval(stat.expr, outputs)

    headline: HeadlineData | None = None
    if report.headline is not None:
        h = report.headline
        headline = HeadlineData(
            label=h.label,
            value=_eval(h.expr, outputs),
            unit=h.unit,
        )

    detail: dict[str, Any] = {field: outputs[field] for field in report.detail if field in outputs}

    raw_desc = spec.description
    try:
        description = raw_desc.format(**params)
    except (KeyError, ValueError):
        description = raw_desc

    return NodeResult(
        status="done",
        label=spec.label,
        description=description,
        node_type=spec.node_type,
        icon=spec.icon,
        elapsed_ms=elapsed_ms,
        stats=stats,
        headline=headline,
        payload=outputs,
        detail=detail,
    )
