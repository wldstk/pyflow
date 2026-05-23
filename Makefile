SHELL := /bin/bash
PYTHON := python3
PY_SOURCES := backend register.py

.PHONY: help install install-backend install-frontend run-backend run-frontend dev lint lint-check clean

help:
	@echo "Targets:"
	@echo "  install          Install backend (pip) and frontend (npm) dependencies"
	@echo "  install-backend  pip install -r backend/requirements.txt"
	@echo "  install-frontend npm ci inside frontend/"
	@echo "  run-backend      Start Flask backend"
	@echo "  run-frontend     Start React dev server (no auto-open)"
	@echo "  dev              Backend in background + frontend in foreground"
	@echo "  lint             Format (isort + black) then type-check (pyright)"
	@echo "  lint-check       Check formatting and types without modifying files"
	@echo "  clean            Remove caches and frontend build artifacts"

install-backend:
	$(PYTHON) -m pip install -r backend/requirements.txt

install-frontend:
	cd frontend && npm ci

install: install-backend install-frontend

run-backend:
	$(PYTHON) backend/app.py

run-frontend:
	cd frontend && BROWSER=none npm start

dev: install
	@$(PYTHON) backend/app.py & cd frontend && BROWSER=none npm start

lint:
	$(PYTHON) -m isort $(PY_SOURCES)
	$(PYTHON) -m black $(PY_SOURCES)
	$(PYTHON) -m pyright $(PY_SOURCES)

lint-check:
	$(PYTHON) -m isort --check $(PY_SOURCES)
	$(PYTHON) -m black --check $(PY_SOURCES)
	$(PYTHON) -m pyright $(PY_SOURCES)

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf frontend/build
