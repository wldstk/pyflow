#!/usr/bin/env python3
"""
This script generates a new pyflow project scaffold by copying the _template directory

Usage
-----
  python3 register.py <project_id>
  python3 register.py <project_id> --name "Human Name" --description "..." --icon "🚀"

The project_id must be snake_case (letters, digits, underscores).
A new directory is created at backend/projects/<project_id>/ and the
project becomes immediately available in the canvas drop-down on the
next backend restart (or live-reload).
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

# Paths
ROOT = Path(__file__).parent
PROJECTS_DIR = ROOT / "backend" / "projects"
TEMPLATE_DIR = PROJECTS_DIR / "_template"

# Predefined themes (selectable via --theme)
ThemeDict = dict[str, str]

THEMES: dict[str, ThemeDict] = {
    "blue": {
        "primary": "#2563eb",
        "primaryDim": "#dbeafe",
        "animatedEdge": "#2563eb",
        "staticEdge": "#93c5fd",
        "canvasDot": "#dbeafe",
    },
    "green": {
        "primary": "#16a34a",
        "primaryDim": "#dcfce7",
        "animatedEdge": "#16a34a",
        "staticEdge": "#86efac",
        "canvasDot": "#dcfce7",
    },
    "purple": {
        "primary": "#7c3aed",
        "primaryDim": "#ede9fe",
        "animatedEdge": "#7c3aed",
        "staticEdge": "#a78bfa",
        "canvasDot": "#ddd6fe",
    },
    "amber": {
        "primary": "#d97706",
        "primaryDim": "#fef3c7",
        "animatedEdge": "#d97706",
        "staticEdge": "#fcd34d",
        "canvasDot": "#fef9c3",
    },
    "rose": {
        "primary": "#e11d48",
        "primaryDim": "#ffe4e6",
        "animatedEdge": "#e11d48",
        "staticEdge": "#fda4af",
        "canvasDot": "#ffe4e6",
    },
    "slate": {
        "primary": "#475569",
        "primaryDim": "#f1f5f9",
        "animatedEdge": "#475569",
        "staticEdge": "#94a3b8",
        "canvasDot": "#e2e8f0",
    },
    "cyan": {
        "primary": "#0891b2",
        "primaryDim": "#cffafe",
        "animatedEdge": "#0891b2",
        "staticEdge": "#67e8f9",
        "canvasDot": "#cffafe",
    },
}


# Helpers
def validate_id(project_id: str) -> None:
    if not re.fullmatch(r"[a-z][a-z0-9_]*", project_id):
        sys.exit(
            f"Error: '{project_id}' is not valid.\n"
            "Project IDs must start with a lowercase letter and contain only "
            "lowercase letters, digits, and underscores (e.g. my_project)."
        )
    if project_id == "_template":
        sys.exit("Error: '_template' is reserved.")


def next_order() -> int:
    """Return max(existing order values) + 1, ignoring _template."""
    orders: list[int] = []
    for cfg in PROJECTS_DIR.glob("*/project.json"):
        if cfg.parent.name == "_template":
            continue
        try:
            orders.append(int(json.loads(cfg.read_text(encoding="utf-8"))["order"]))
        except Exception:
            pass
    return max(orders, default=0) + 1


def to_title(snake: str) -> str:
    return " ".join(w.capitalize() for w in snake.split("_"))


def scaffold(
    project_id: str,
    name: str,
    description: str,
    icon: str,
    theme: ThemeDict,
) -> Path:
    dest = PROJECTS_DIR / project_id
    shutil.copytree(TEMPLATE_DIR, dest)

    config: dict[str, object] = {
        "id": project_id,
        "name": name,
        "description": description,
        "icon": icon,
        "order": next_order(),
        "theme": theme,
    }
    (dest / "project.json").write_text(
        json.dumps(config, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return dest


def print_tree(dest: Path) -> None:
    for path in sorted(dest.rglob("*")):
        rel = path.relative_to(dest.parent)
        indent = "  " * (len(rel.parts) - 1)
        marker = "/" if path.is_dir() else ""
        print(f"  {indent}{path.name}{marker}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scaffold a new pyflow project from the _template.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"Available themes: {', '.join(THEMES)}",
    )
    parser.add_argument("project_id", help="snake_case project identifier")
    parser.add_argument(
        "--name", default=None, help="Human-readable name (default: derived from id)"
    )
    parser.add_argument("--description", default="", help="One-line description")
    parser.add_argument("--icon", default="🔧", help="Emoji icon shown in the drop-down")
    parser.add_argument(
        "--theme",
        default="blue",
        choices=list(THEMES),
        metavar="THEME",
        help=f"Canvas colour theme: {', '.join(THEMES)} (default: blue)",
    )
    args = parser.parse_args()

    project_id: str = args.project_id.lower().strip()
    validate_id(project_id)

    dest = PROJECTS_DIR / project_id
    if dest.exists():
        sys.exit(f"Error: backend/projects/{project_id}/ already exists.")

    name: str = args.name or to_title(project_id)
    description: str = args.description or f"{name} pipeline"
    icon: str = args.icon
    theme: ThemeDict = THEMES[args.theme]

    dest = scaffold(project_id, name, description, icon, theme)

    print(f"Project '{project_id}' created at backend/projects/{project_id}/\n")
    print_tree(dest)
    print(
        f"\nNext steps"
        f"\n──────────"
        f"\n1. Add your data file to   backend/projects/{project_id}/data/"
        f"\n2. Edit nodes/step1.yml    - set label, params, report section"
        f"\n3. Edit nodes/step1.py     - implement run(inputs, params) -> dict"
        f"\n4. Wire nodes in           backend/projects/{project_id}/pipeline.yml"
        f"\n5. Restart the backend     - the project appears in the canvas drop-down automatically\n"
    )


if __name__ == "__main__":
    main()
