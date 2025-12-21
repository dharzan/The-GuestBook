#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo " starting Postgres via docker compose..."
if command -v docker >/dev/null 2>&1; then
  if docker compose up -d postgres; then
    echo "→ Postgres container is up"
  else
    echo "⚠️  Could not start Postgres via docker compose. Ensure Postgres is running on 5432 and rerun."
  fi
else
  echo "⚠️  Docker not found; skipping Postgres start. Ensure Postgres is running on 5432."
fi

if [ -f "$ROOT/.env" ]; then
  echo "→ Loading Go env from .env"
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "→ Installing guest frontend deps"
  (cd "$ROOT/frontend" && npm install)
fi
MONITOR_PM="npm"
if command -v pnpm >/dev/null 2>&1; then
  MONITOR_PM="pnpm"
fi
if [ ! -d "$ROOT/monitor/node_modules" ]; then
  echo "→ Installing monitor deps with ${MONITOR_PM}"
  (cd "$ROOT/monitor" && ${MONITOR_PM} install)
fi

echo "→ Starting Go API on :${PORT:-3000}"
go run main.go &
GO_PID=$!

echo "→ Starting guest app (frontend) on :5173"
(cd "$ROOT/frontend" && npm run dev -- --host --port 5173) &
FRONT_PID=$!

MONITOR_API_BASE="${VITE_API_BASE:-http://localhost:3000}"
MONITOR_PORT="${MONITOR_PORT:-4174}"
echo "→ Starting monitor app on :${MONITOR_PORT} with ${MONITOR_PM} (API_BASE=${MONITOR_API_BASE})"
(cd "$ROOT/monitor" VITE_API_BASE="$MONITOR_API_BASE" VITE_ADMIN_USERNAME="$ADMIN_USERNAME" VITE_ADMIN_PASSWORD="$ADMIN_PASSWORD" ${MONITOR_PM} run dev -- --host --port "${MONITOR_PORT}") &
MONITOR_PID=$!

trap 'echo "→ Shutting down"; kill "$GO_PID" "$FRONT_PID" "$MONITOR_PID" 2>/dev/null || true' EXIT

echo "→ Dev stack running:"
echo "   API:     http://localhost:${PORT:-3000}"
echo "   Guest:   http://localhost:5173"
echo "   Monitor: http://localhost:${MONITOR_PORT} (pulls from ${MONITOR_API_BASE})"
echo "Press Ctrl+C to stop."

wait "$GO_PID" "$FRONT_PID" "$MONITOR_PID"
