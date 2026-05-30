"""
app.py
──────
Flask entry-point.  Auto-discovers all projects under backend/projects/<id>/
that contain both project.json and pipeline.yml, then exposes:

  GET /api/projects           — list of project configs (id, name, icon, theme …)
  GET /api/pipeline?project=  — run a project's pipeline, return ReactFlow graph
  GET /api/health             — liveness check
"""

import json
import os
import sys
import threading
import time
import traceback
import uuid
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS
from lib.models import ProjectConfig
from lib.pipeline_runner import run as run_pipeline
from lib.pipeline_runner import run_streaming

# ── Live-run tracker ────────────────────────────────────────────
# Maps run_id → {queue: list[event], done: bool}
_runs: dict[str, dict] = {}

# ── Per-project output cache ─────────────────────────────────────
# Maps project_id → {node_id: payload_dict} from the last completed run.
# Used to supply upstream inputs for partial (run-from-node) executions.
_output_cache: dict[str, dict[str, dict]] = {}


def _execute_run(
    run_id: str,
    project_dir: Path,
    from_node_id: str | None = None,
    only_node_id: str | None = None,
    project_id: str | None = None,
) -> None:
    run = _runs[run_id]

    def _on_event(event: dict) -> None:
        run["queue"].append(event)

    partial = bool(from_node_id or only_node_id)
    initial_outputs = dict(_output_cache.get(project_id or "", {})) if partial else {}
    outputs_collector: dict[str, dict] = {}

    try:
        for event in run_streaming(
            project_dir,
            on_event=_on_event,
            from_node_id=from_node_id,
            only_node_id=only_node_id,
            initial_outputs=initial_outputs,
            outputs_collector=outputs_collector,
        ):
            run["queue"].append(event)
    except Exception as exc:
        traceback.print_exc()
        run["queue"].append({"type": "error", "message": str(exc)})
    finally:
        run["done"] = True
        if project_id and outputs_collector:
            _output_cache[project_id] = outputs_collector


load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

PROJECTS_DIR = Path(__file__).parent / "projects"

_ProjectEntry = dict[str, object]


def _discover_projects() -> dict[str, _ProjectEntry]:
    projects: dict[str, _ProjectEntry] = {}
    if not PROJECTS_DIR.exists():
        return projects

    for proj_dir in sorted(PROJECTS_DIR.iterdir()):
        if not proj_dir.is_dir() or proj_dir.name.startswith("_"):
            continue
        config_path = proj_dir / "project.json"
        pipeline_path = proj_dir / "pipeline.yml"
        if not config_path.exists() or not pipeline_path.exists():
            continue
        try:
            raw = json.loads(config_path.read_text(encoding="utf-8"))
            config = ProjectConfig.model_validate(raw)
            projects[proj_dir.name] = {"config": config, "dir": proj_dir}
        except Exception as exc:
            print(f"[pyflow] Skipping '{proj_dir.name}': {exc}")

    return dict(sorted(projects.items(), key=lambda kv: _get_order(kv[1])))


def _get_order(entry: _ProjectEntry) -> int:
    config = entry["config"]
    return config.order if isinstance(config, ProjectConfig) else 99


@app.route("/api/projects", methods=["GET"])
def get_projects() -> Response:
    projects = _discover_projects()
    configs = [
        entry["config"].model_dump()
        for entry in projects.values()
        if isinstance(entry["config"], ProjectConfig)
    ]
    return jsonify(configs)


@app.route("/api/pipeline/graph", methods=["GET"])
def get_pipeline_graph() -> tuple[Response, int] | Response:
    """Return the static graph (all nodes pending, no execution) for a project."""
    projects = _discover_projects()
    project_id = request.args.get("project") or next(iter(projects), None)
    if not project_id or project_id not in projects:
        return jsonify({"error": f"Unknown project '{project_id}'."}), 404
    entry = projects[project_id]
    project_dir = entry["dir"]
    if not isinstance(project_dir, Path):
        return jsonify({"error": "Invalid project directory"}), 500
    try:
        from lib.pipeline_runner import pending_graph
        graph = pending_graph(project_dir)
        return jsonify(graph)
    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.route("/api/pipeline", methods=["GET"])
def get_pipeline() -> tuple[Response, int] | Response:
    projects = _discover_projects()
    project_id = request.args.get("project") or next(iter(projects), None)
    if not project_id or project_id not in projects:
        return jsonify({"error": f"Unknown project '{project_id}'."}), 404
    entry = projects[project_id]
    project_dir = entry["dir"]
    if not isinstance(project_dir, Path):
        return jsonify({"error": "Invalid project directory"}), 500
    try:
        graph = run_pipeline(project_dir)
    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500
    return jsonify(graph.model_dump())


@app.route("/api/pipeline/stream", methods=["GET"])
def stream_pipeline() -> tuple[Response, int] | Response:
    projects = _discover_projects()
    project_id = request.args.get("project") or next(iter(projects), None)
    if not project_id or project_id not in projects:
        return jsonify({"error": f"Unknown project '{project_id}'."}), 404
    entry = projects[project_id]
    project_dir = entry["dir"]
    if not isinstance(project_dir, Path):
        return jsonify({"error": "Invalid project directory"}), 500

    from_node_id: str | None = request.args.get("from_node") or None
    only_node_id: str | None = request.args.get("only_node") or None

    run_id = uuid.uuid4().hex
    _runs[run_id] = {"queue": [], "cursor": 0, "done": False}
    threading.Thread(
        target=_execute_run,
        args=(run_id, project_dir, from_node_id, only_node_id, project_id),
        daemon=True,
    ).start()

    def generate():
        try:
            while True:
                run = _runs.get(run_id)
                if run is None:
                    break
                cursor = run["cursor"]
                pending = run["queue"][cursor:]
                for event in pending:
                    yield f"event: {event['type']}\ndata: {json.dumps(event)}\n\n"
                run["cursor"] += len(pending)
                if run["done"] and run["cursor"] >= len(run["queue"]):
                    _runs.pop(run_id, None)
                    break
                # Heartbeat comment forces Werkzeug to flush its socket buffer
                yield ": heartbeat\n\n"
                time.sleep(0.15)
        except GeneratorExit:
            _runs.pop(run_id, None)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.route("/api/health", methods=["GET"])
def health() -> Response:
    return jsonify(
        {
            "status": "ok",
            "python": f"{sys.version_info[0]}.{sys.version_info[1]}",
            "projects": list(_discover_projects().keys()),
        }
    )


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    print(f"[pyflow] Starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug, threaded=True)
