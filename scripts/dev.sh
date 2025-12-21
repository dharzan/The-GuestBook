#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "→ Starting Postgres (docker compose up -d postgres)..."
if command -v docker >/dev/null 2>&1; then
  if docker compose up -d postgres; then
    echo "→ Postgres started"
  else
    echo "⚠️  Could not start Postgres via docker compose. Make sure Docker Desktop is running or start Postgres manually, then re-run this script."
    exit 1
  fi
else
  echo "⚠️  Docker not installed. Start Postgres manually (see docker-compose.yml) and re-run."
  exit 1
fi

if [ -f "$ROOT/.env" ]; then
  echo "→ Loading Go env from .env"
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "→ Installing frontend deps"
  (cd "$ROOT/frontend" && npm install)
fi

echo "→ Starting Go API on :${PORT:-3000}"
go run main.go &
GO_PID=$!

echo "→ Starting Vite dev server on :5173"
(cd "$ROOT/frontend" && npm run dev -- --host) &
VITE_PID=$!

echo "→ Starting monitor dev server on :5273"
(cd "$ROOT/monitor" && npm install && npm run dev -- --host --port 5273) &
MONITOR_PID=$!

NGROK_PID=""
if command -v ngrok >/dev/null 2>&1; then
  echo "→ Starting ngrok tunnel to :${PORT:-3000} (log: $ROOT/.ngrok.log)"
  ngrok http "${PORT:-3000}" --log=stdout >"$ROOT/.ngrok.log" &
  NGROK_PID=$!
else
  echo "→ ngrok not found; skipping tunnel (install from https://ngrok.com/ if you need a public URL)"
fi

trap 'echo "→ Shutting down"; kill "$GO_PID" "$VITE_PID" ${NGROK_PID:+$NGROK_PID} 2>/dev/null || true' EXIT

echo "→ Dev servers running:"
echo "   API:    http://localhost:${PORT:-3000}"
echo "   Front:  http://localhost:5173"
echo "   Monitor: http://localhost:5273"
if [ -n "$NGROK_PID" ]; then
  echo "   ngrok:  tail -f $ROOT/.ngrok.log (public URL will appear in the log)"
fi

# Keep running until either process exits or you hit Ctrl+C
wait "$GO_PID" "$VITE_PID" "$MONITOR_PID"
