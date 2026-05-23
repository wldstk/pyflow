# pyflow

A YAML-driven pipeline visualizer built on Flask + ReactFlow.
Each project is a folder of YAML node specs and plain Python functions — no framework lock-in, no boilerplate React components.

---

## How it works

```
backend/projects/<id>/
  project.json        ← name, icon, theme colors
  pipeline.yml        ← node wiring (topology)
  data/               ← input files
  nodes/
    step1.yml         ← node contract: params + report section
    step1.py          ← run(inputs, params) -> dict
```

The Flask backend discovers every project folder at startup, executes the pipeline, evaluates the report expressions, and returns a ReactFlow graph. The frontend picks up the theme from `project.json` and renders nodes + custom edges with no per-project React code.

---

## Quick start

```bash
# Install dependencies
make install

# Start backend (Flask :5000) + frontend (React :3000)
make dev
```

The canvas opens at `http://localhost:3000`. Use `make run-backend` / `make run-frontend` to start them separately.

---

## Project structure

```
pyflow/
├── register.py                   ← scaffold a new project (see below)
├── Makefile
│
├── backend/
│   ├── app.py                    ← Flask entry-point, project discovery, API routes
│   ├── requirements.txt
│   └── lib/
│   │   ├── node_runner.py        ← loads YAML spec + Python module, executes run()
│   │   └── pipeline_runner.py    ← chains nodes, resolves inputs, builds RF graph
│   └── projects/
│       ├── _template/            ← copy this to create a new project
│       ├── daily_data_dose/      ← weather CSV: load → parse → clean → analyse
│
└── frontend/
    └── src/
        ├── App.js                ← ReactFlow canvas, theme switching
        ├── edges/
        │   └── FlowEdge.js       ← custom edge: animated / dashed / solid / dotted
        ├── nodes/
        │   ├── GenericNode.js    ← single component for all node types
        │   └── nodeStyles.js     ← shared style tokens
        ├── components/
        │   ├── Toolbar.js
        │   ├── ProjectSelector.js
        │   └── ErrorBanner.js
        └── hooks/
            ├── usePipeline.js
            └── useProjects.js
```

---

## API

| Endpoint                         | Description                                                |
| -------------------------------- | ---------------------------------------------------------- |
| `GET /api/projects`              | List of all discovered projects (id, name, icon, theme, …) |
| `GET /api/pipeline?project=<id>` | Execute a project's pipeline and return a ReactFlow graph  |
| `GET /api/health`                | Liveness check                                             |

---

## Node anatomy

Every pipeline step is two files with the same base name:

**`nodes/step1.yml`** — interface contract

```yaml
id: step1
label: Step 1
description: "Source: {filename}" # {param} substitution supported
node_type: input # input | default | averages | anomaly | output
icon: "📄"

params:
  filename:
    type: str
    default: sample.csv

report:
  headline:
    label: Rows loaded
    expr: "len(rows)" # evaluated against run() output
    unit: rows
  stats:
    - { key: rows, label: Rows, expr: "len(rows)" }
    - { key: columns, label: Columns, expr: "len(columns)" }
  detail: [] # output keys forwarded to the detail panel
```

**`nodes/step1.py`** — pure logic

```python
def run(inputs: dict, params: dict) -> dict:
    # inputs  — merged outputs from all predecessor nodes
    # params  — YAML defaults, overridden by pipeline.yml per-node values
    # return  — flat dict; keys become available to successors and report exprs
    ...
    return {"rows": rows, "columns": columns}
```

`run()` returns data only — display logic lives entirely in the YAML `report` section.

---

## Pipeline wiring

**`pipeline.yml`**

```yaml
nodes:
  - id: "1"
    spec: step1 # maps to nodes/step1.yml + nodes/step1.py
    position: { x: 50, y: 220 }
    params:
      filename: data.csv # overrides the YAML default

  - id: "2"
    spec: step2
    position: { x: 320, y: 220 }
    input_from:
      "1" # string  → all outputs from node "1"
      # list    → merge outputs from multiple nodes

edges:
  - { id: e1-2, source: "1", target: "2", style: animated }
  # style: animated | solid | dashed | dotted
```

---

## Edge styles

| Style      | Appearance                   | Typical use         |
| ---------- | ---------------------------- | ------------------- |
| `animated` | Moving dashes, accent colour | Active data flow    |
| `solid`    | Solid line, muted colour     | Passive / transform |
| `dashed`   | Static dashes, muted colour  | Diagnostic / branch |
| `dotted`   | Tight dots, muted colour     | Aggregation input   |

Colours are resolved from `project.json` → `theme.animatedEdge` / `theme.staticEdge`.
Each edge also shows a **flow-count badge** (row count of the source node's output).

---

## Node types

| `node_type` | Handles             | Special behaviour                                 |
| ----------- | ------------------- | ------------------------------------------------- |
| `input`     | source only (right) | —                                                 |
| `output`    | target only (left)  | —                                                 |
| `default`   | both                | —                                                 |
| `averages`  | both                | Renders `detail.column_stats` as expandable table |
| `anomaly`   | both                | Amber header when `headline.value > 0`            |

---

## Registering a new project

```bash
python3 register.py <project_id> [options]
```

| Option          | Default             | Description                  |
| --------------- | ------------------- | ---------------------------- |
| `--name`        | Derived from id     | Human-readable display name  |
| `--description` | `"<name> pipeline"` | One-line description         |
| `--icon`        | `🔧`                | Emoji shown in the drop-down |
| `--theme`       | `blue`              | Canvas colour theme          |

Available themes: `blue`, `green`, `purple`, `amber`, `rose`, `slate`, `cyan`

```bash
python3 register.py sensor_pipeline --name "Sensor Pipeline" --icon "📡" --theme cyan
```

This creates `backend/projects/sensor_pipeline/` from the `_template`, assigns the next `order` value, and writes a `project.json` with the chosen theme. The project appears in the drop-down on the next backend restart.

---

## Themes

Each `project.json` carries a `theme` block that sets CSS custom properties at runtime:

```json
"theme": {
  "primary":      "#7c3aed",
  "primaryDim":   "#ede9fe",
  "animatedEdge": "#7c3aed",
  "staticEdge":   "#a78bfa",
  "canvasDot":    "#ddd6fe"
}
```

---

## Makefile targets

| Target              | Description                                         |
| ------------------- | --------------------------------------------------- |
| `make install`      | Install backend (pip) + frontend (npm) dependencies |
| `make dev`          | Backend in background + frontend in foreground      |
| `make run-backend`  | Flask only                                          |
| `make run-frontend` | React dev server only (no auto-open)                |
| `make clean`        | Remove `__pycache__` and `frontend/build`           |
