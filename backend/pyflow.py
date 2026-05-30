"""
pyflow.py
─────────
Public helpers available to node implementations.

Usage inside a node:

    from pyflow import tqdm

    def run(inputs, params):
        for row in tqdm(inputs["rows"], desc="Processing rows"):
            ...

tqdm reports iteration progress (%, ETA) to the live canvas via SSE.
Outside a pyflow execution context it is a silent no-op, so nodes can
be run standalone without modification.
"""

import threading
import time

# ── Thread-local progress context ──────────────────────────────
# Set by node_runner.execute() before calling mod.run(); cleared after.
_ctx = threading.local()

_MIN_INTERVAL = 0.15  # seconds between progress events (throttle)


def _set_callback(fn):
    _ctx.callback = fn


def _clear_callback():
    _ctx.callback = None


def _get_callback():
    return getattr(_ctx, "callback", None)


# ── tqdm wrapper ────────────────────────────────────────────────

class tqdm:
    """
    Drop-in subset of tqdm that forwards progress to the pyflow canvas.

    Supports:
      - for item in tqdm(iterable, total=n, desc="…"):
      - with tqdm(total=n, desc="…") as bar: bar.update(k)
      - bar.set_description("…")

    Falls back silently when used outside a pipeline run.
    """

    def __init__(self, iterable=None, *, total=None, desc="", unit="it", **_):
        self._iter   = iterable
        self._total  = total if total is not None else (
            len(iterable) if hasattr(iterable, "__len__") else None
        )
        self._desc         = desc
        self._n            = 0
        self._t0: float | None = None
        self._last_report  = -999.0
        self._emit(force=True)

    # ── Iteration ────────────────────────────────────────────────

    def __iter__(self):
        self._t0 = time.perf_counter()
        self._emit(force=True)
        for item in self._iter:  # type: ignore[union-attr]
            yield item
            self._n += 1
            self._emit()
        self._emit(force=True)  # 100 %

    # ── Context manager ──────────────────────────────────────────

    def __enter__(self):
        self._t0 = time.perf_counter()
        self._emit(force=True)
        return self

    def __exit__(self, *_):
        self._emit(force=True)

    # ── Manual API ───────────────────────────────────────────────

    def update(self, n: int = 1):
        if self._t0 is None:
            self._t0 = time.perf_counter()
        self._n += n
        self._emit()

    def set_description(self, desc: str):
        self._desc = desc
        self._emit(force=True)

    @property
    def n(self) -> int:
        return self._n

    # ── Internal ─────────────────────────────────────────────────

    def _emit(self, *, force: bool = False):
        cb = _get_callback()
        if cb is None:
            return
        now = time.perf_counter()
        if not force and (now - self._last_report) < _MIN_INTERVAL:
            return
        self._last_report = now

        elapsed = (now - self._t0) if self._t0 else 0.0
        pct: float | None = None
        eta: float | None = None
        if self._total:
            pct = round(min(self._n / self._total * 100, 100.0), 1)
            if self._n > 0 and elapsed > 0:
                rate = self._n / elapsed
                remaining = self._total - self._n
                eta = round(remaining / rate, 1) if rate > 0 else None

        cb(
            n=self._n,
            total=self._total,
            pct=pct,
            elapsed=round(elapsed, 2),
            eta=eta,
            desc=self._desc,
        )
