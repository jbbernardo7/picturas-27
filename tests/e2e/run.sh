#!/usr/bin/env bash
# Runs the end-to-end tests against a running PictuRAS (docker compose up -d).
#   ./tests/e2e/run.sh              all tests
#   ./tests/e2e/run.sh -k extract   only the extraction tests (any pytest option works)
# Environment: E2E_BASE_URL (default https://localhost:8080),
#              E2E_FREE_DAILY_EXTRACT (default 5, must match FREE_DAILY_EXTRACT of `users`).
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then
  echo "Creating the virtual environment (first run only)..."
  python3 -m venv .venv
  .venv/bin/pip install -q --upgrade pip
  .venv/bin/pip install -q -r requirements.txt
fi

status=0
.venv/bin/python -m pytest -v "$@" || status=$?
echo
echo "Report written to tests/e2e/report.md"
exit $status
