from typing import Any

from pydantic import BaseModel, ConfigDict

# ── YAML spec models ───────────────────────────────────────────


class ParamSpec(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: str = "str"
    default: Any = None
    description: str = ""


class StatSpec(BaseModel):
    model_config = ConfigDict(extra="ignore")

    key: str = ""
    label: str = ""
    expr: str


class HeadlineSpec(BaseModel):
    model_config = ConfigDict(extra="ignore")

    label: str = ""
    expr: str
    unit: str = ""


class ReportSpec(BaseModel):
    model_config = ConfigDict(extra="ignore")

    headline: HeadlineSpec | None = None
    stats: list[StatSpec] = []
    detail: list[str] = []


class NodeSpec(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    label: str
    description: str = ""
    node_type: str = "default"
    icon: str = ""
    params: dict[str, ParamSpec] = {}
    report: ReportSpec = ReportSpec()


# ── Node execution result ──────────────────────────────────────


class HeadlineData(BaseModel):
    label: str
    value: Any
    unit: str = ""


class NodeResult(BaseModel):
    status: str
    label: str
    description: str
    node_type: str
    icon: str
    elapsed_ms: float | None
    stats: dict[str, Any]
    headline: HeadlineData | None
    payload: dict[str, Any]
    detail: dict[str, Any]


# ── ReactFlow graph models ─────────────────────────────────────


class Position(BaseModel):
    x: float
    y: float


class NodeData(BaseModel):
    label: str
    description: str
    status: str
    stats: dict[str, Any]
    headline: HeadlineData | None
    detail: dict[str, Any]
    icon: str
    elapsed_ms: float | None


class RFNode(BaseModel):
    id: str
    type: str
    position: Position
    data: NodeData


class MarkerEnd(BaseModel):
    type: str
    color: str


class EdgeData(BaseModel):
    edgeStyle: str
    strokeColor: str
    flowCount: int | None


class RFEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str
    markerEnd: MarkerEnd
    data: EdgeData


class PipelineGraph(BaseModel):
    nodes: list[RFNode]
    edges: list[RFEdge]


# ── Project config ─────────────────────────────────────────────


class ProjectTheme(BaseModel):
    model_config = ConfigDict(extra="ignore")

    primary: str = "#2563eb"
    primaryDim: str = "#dbeafe"
    animatedEdge: str = "#16a34a"
    staticEdge: str = "#94a3b8"
    canvasDot: str = "#cbd5e1"


class ProjectConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    description: str = ""
    icon: str = ""
    order: int = 99
    auto_run: bool = True
    theme: ProjectTheme = ProjectTheme()
