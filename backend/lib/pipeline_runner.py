"""
lib/pipeline_runner.py
──────────────────────
Reads a project's pipeline.yml, resolves input wiring between nodes,
executes each node via node_runner, and returns a ReactFlow graph.

pipeline.yml schema
───────────────────
nodes:
  - id: "1"
    spec: load_csv            # maps to nodes/load_csv.yml + nodes/load_csv.py
    position: {x: 50, y: 220}
    params:                   # optional overrides for YAML-defined defaults
      filename: weather.csv

  - id: "2"
    spec: parse_types
    position: {x: 320, y: 220}
    input_from: "1"           # string  → take all outputs of that node
                              # list    → merge outputs from multiple nodes

edges:
  - {id: e1-2, source: "1", target: "2", style: animated}
  # style: animated | solid | dashed | dotted   (default: solid)
  # animated: true is also accepted (legacy, treated as style: animated)
"""

import json
import traceback
from collections.abc import Generator
from pathlib import Path
from typing import Any

import yaml

from . import node_runner
from .models import (
    EdgeData,
    MarkerEnd,
    NodeData,
    NodeResult,
    PipelineGraph,
    Position,
    ProjectConfig,
    RFEdge,
    RFNode,
)

# ── Helpers ────────────────────────────────────────────────────


def _safe_execute(
    nodes_dir: Path,
    spec_name: str,
    inputs: dict[str, Any],
    params: dict[str, Any],
) -> NodeResult:
    try:
        return node_runner.execute(nodes_dir, spec_name, inputs, params)
    except Exception as exc:
        traceback.print_exc()
        return NodeResult(
            status="error",
            label=spec_name,
            description=str(exc),
            node_type="default",
            icon="",
            elapsed_ms=None,
            stats={"error": str(exc)},
            headline=None,
            payload={},
            detail={},
        )


def _flow_count(payload: dict[str, Any]) -> int | None:
    """Return the length of the primary data list in a node's output payload."""
    for key in ("rows", "records", "messages", "signals", "anomalies", "lines"):
        if key in payload and isinstance(payload[key], list):
            return len(payload[key])
    for v in payload.values():
        if isinstance(v, list):
            return len(v)
    return None


def _load_config(project_dir: Path) -> ProjectConfig:
    config_path = project_dir / "project.json"
    try:
        raw: Any = json.loads(config_path.read_text(encoding="utf-8"))
        return ProjectConfig.model_validate(raw)
    except Exception:
        return ProjectConfig(id=project_dir.name, name=project_dir.name)


def _build_rf_node(node_id: str, position: dict[str, Any], result: NodeResult) -> RFNode:
    return RFNode(
        id=node_id,
        type=result.node_type,
        position=Position(x=float(position.get("x", 0)), y=float(position.get("y", 0))),
        data=NodeData(
            label=result.label,
            description=result.description,
            status=result.status,
            stats=result.stats,
            headline=result.headline,
            detail=result.detail,
            icon=result.icon,
            elapsed_ms=result.elapsed_ms,
        ),
    )


def _edge_style(edge_def: dict[str, Any]) -> str:
    explicit = str(edge_def.get("style", "")).strip().lower()
    if explicit in ("animated", "dashed", "solid", "dotted"):
        return explicit
    return "animated" if edge_def.get("animated") else "solid"


def _build_edges(
    edge_defs: list[dict[str, Any]],
    node_outputs: dict[str, dict[str, Any]],
    animated_color: str,
    static_color: str,
) -> list[dict[str, Any]]:
    rf_edges: list[dict[str, Any]] = []
    for e in edge_defs:
        source_id = str(e["source"])
        style = _edge_style(e)
        stroke = animated_color if style == "animated" else static_color
        flow_count = _flow_count(node_outputs.get(source_id, {})) if node_outputs else None
        rf_edges.append(
            RFEdge(
                id=e.get("id", f"e{e['source']}-{e['target']}"),
                source=source_id,
                target=str(e["target"]),
                type="flowEdge",
                markerEnd=MarkerEnd(type="arrowclosed", color=stroke),
                data=EdgeData(edgeStyle=style, strokeColor=stroke, flowCount=flow_count),
            ).model_dump()
        )
    return rf_edges


# ── Runner ─────────────────────────────────────────────────────


def run(project_dir: Path) -> PipelineGraph:
    """Execute the project's pipeline.yml and return a ReactFlow graph."""
    pipeline_path = project_dir / "pipeline.yml"
    nodes_dir = project_dir / "nodes"

    config = _load_config(project_dir)
    theme = config.theme
    animated_color = theme.animatedEdge
    static_color = theme.staticEdge

    with open(pipeline_path, encoding="utf-8") as f:
        raw_pipeline: Any = yaml.safe_load(f)

    node_outputs: dict[str, dict[str, Any]] = {}
    rf_nodes: list[RFNode] = []

    for node_def in raw_pipeline.get("nodes", []):
        node_id: str = str(node_def["id"])
        spec_name: str = node_def["spec"]
        position: dict[str, Any] = node_def.get("position", {"x": 0, "y": 0})
        params: dict[str, Any] = node_def.get("params") or {}

        inputs: dict[str, Any] = {}
        src = node_def.get("input_from")
        if isinstance(src, str):
            inputs.update(node_outputs.get(src, {}))
        elif isinstance(src, list):
            for s in src:
                inputs.update(node_outputs.get(str(s), {}))

        result = _safe_execute(nodes_dir, spec_name, inputs, params)
        node_outputs[node_id] = result.payload

        rf_nodes.append(_build_rf_node(node_id, position, result))

    edge_defs = raw_pipeline.get("edges", [])
    rf_edges_dicts = _build_edges(edge_defs, node_outputs, animated_color, static_color)
    rf_edges = [RFEdge.model_validate(e) for e in rf_edges_dicts]

    return PipelineGraph(nodes=rf_nodes, edges=rf_edges)


def run_streaming(project_dir: Path) -> Generator[dict[str, Any], None, None]:
    """Yield SSE event dicts as the pipeline executes node by node."""
    pipeline_path = project_dir / "pipeline.yml"
    nodes_dir = project_dir / "nodes"

    config = _load_config(project_dir)
    theme = config.theme
    animated_color = theme.animatedEdge
    static_color = theme.staticEdge

    with open(pipeline_path, encoding="utf-8") as f:
        raw_pipeline: Any = yaml.safe_load(f)

    node_defs: list[dict[str, Any]] = raw_pipeline.get("nodes", [])
    edge_defs: list[dict[str, Any]] = raw_pipeline.get("edges", [])

    # Build initial pending nodes from spec metadata (no execution yet)
    rf_nodes_init: list[dict[str, Any]] = []
    for node_def in node_defs:
        node_id = str(node_def["id"])
        spec_name: str = node_def["spec"]
        position = node_def.get("position", {"x": 0, "y": 0})
        try:
            spec = node_runner.load_spec(nodes_dir, spec_name)
            node_type, label, description, icon = spec.node_type, spec.label, spec.description, spec.icon
        except Exception:
            node_type, label, description, icon = "default", spec_name, "", ""

        rf_nodes_init.append(
            RFNode(
                id=node_id,
                type=node_type,
                position=Position(x=float(position.get("x", 0)), y=float(position.get("y", 0))),
                data=NodeData(
                    label=label,
                    description=description,
                    status="pending",
                    stats={},
                    headline=None,
                    detail={},
                    icon=icon,
                    elapsed_ms=None,
                ),
            ).model_dump()
        )

    yield {
        "type": "init",
        "nodes": rf_nodes_init,
        "edges": _build_edges(edge_defs, {}, animated_color, static_color),
    }

    # Execute nodes sequentially, streaming status updates
    node_outputs: dict[str, dict[str, Any]] = {}

    for node_def in node_defs:
        node_id = str(node_def["id"])
        spec_name = node_def["spec"]
        position = node_def.get("position", {"x": 0, "y": 0})
        params: dict[str, Any] = node_def.get("params") or {}

        inputs: dict[str, Any] = {}
        src = node_def.get("input_from")
        if isinstance(src, str):
            inputs.update(node_outputs.get(src, {}))
        elif isinstance(src, list):
            for s in src:
                inputs.update(node_outputs.get(str(s), {}))

        yield {"type": "node_update", "node_id": node_id, "data": {"status": "running"}}

        result = _safe_execute(nodes_dir, spec_name, inputs, params)
        node_outputs[node_id] = result.payload

        rf_node = _build_rf_node(node_id, position, result)
        yield {"type": "node_update", "node_id": node_id, "data": rf_node.data.model_dump()}

    yield {
        "type": "pipeline_done",
        "edges": _build_edges(edge_defs, node_outputs, animated_color, static_color),
    }
