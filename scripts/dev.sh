#!/usr/bin/env bash
# Start backend (:8000) and frontend (:3000) together. Ctrl+C stops both.
# Usage: bash scripts/dev.sh

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT=8000
FRONTEND_PORT=3000

cleanup() {
  echo ""
  echo "Stopping servers..."
  kill "${BACKEND_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null
  wait 2>/dev/null
  exit 0
}
trap cleanup INT TERM

echo "── RBridge dev stack ─────────────────────"

cd "$ROOT/backend" || exit 1
if [[ ! -x .venv/bin/uvicorn ]]; then
  echo "Backend venv missing. Run: cd backend && uv venv && uv pip install -r requirements.txt"
  exit 1
fi
[[ -f .env.local ]] || echo "note: backend/.env.local not found, using defaults (SQLite, AI off)"
.venv/bin/alembic upgrade head >/dev/null
.venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT" 2>&1 | sed 's/^/[backend]  /' &
BACKEND_PID=$!

for _ in {1..20}; do
  curl -s "http://localhost:$BACKEND_PORT/api/v1/health" | grep -q '"ok"' && break
  sleep 0.5
done

cd "$ROOT/frontend" || exit 1
[[ -d node_modules ]] || npm install
npm run dev -- --port "$FRONTEND_PORT" 2>&1 | sed 's/^/[frontend] /' &
FRONTEND_PID=$!

echo "Backend:  http://localhost:$BACKEND_PORT  (health: /api/v1/health)"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Ctrl+C to stop both"
wait
