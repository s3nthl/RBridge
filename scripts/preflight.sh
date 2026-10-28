#!/usr/bin/env bash
# Environment check before a build session. Exits non-zero on any failure.
# Usage: bash scripts/preflight.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="http://localhost:8000/api/v1"
FAIL=0

pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; FAIL=1; }
warn() { echo "  ⚠ $1"; }

echo "── RBridge preflight ─────────────────────"

echo "Environment"
[[ -f "$ROOT/backend/.env.local" ]] && pass "backend/.env.local exists" || warn "backend/.env.local missing (defaults: SQLite, AI off)"
[[ -f "$ROOT/frontend/.env.local" ]] && pass "frontend/.env.local exists" || warn "frontend/.env.local missing (lookup needs ATTOM_API_KEY, map needs NEXT_PUBLIC_MAPBOX_TOKEN)"
[[ -x "$ROOT/backend/.venv/bin/python" ]] && pass "backend venv present" || fail "backend venv missing: cd backend && uv venv && uv pip install -r requirements.txt"
[[ -d "$ROOT/frontend/node_modules" ]] && pass "frontend node_modules present" || fail "frontend deps missing: cd frontend && npm install"

echo "Backend :8000"
health=$(curl -s --max-time 3 "$API/health")
if echo "$health" | grep -q '"ok"'; then
  pass "healthy ($health)"
else
  fail "not running. Start with: bash scripts/dev.sh"
fi

echo "Frontend :3000"
if curl -s --max-time 5 -o /dev/null -w '%{http_code}' http://localhost:3000 | grep -q 200; then
  pass "serving"
else
  fail "not running. Start with: bash scripts/dev.sh"
fi

if echo "$health" | grep -q '"ok"'; then
  echo "CORS"
  if curl -s -D - -o /dev/null -X OPTIONS "$API/calculate" \
      -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" \
      | grep -qi "access-control-allow-origin"; then
    pass "CORS headers present for http://localhost:3000"
  else
    fail "CORS headers missing; check FRONTEND_URL in backend/.env.local"
  fi

  echo "Smoke test: POST /calculate (Portland case)"
  out=$(curl -s --max-time 5 -X POST "$API/calculate" -H "Content-Type: application/json" -d '{
    "tenant_id":"preflight",
    "scenario":{"purchase_price":600000,"first_lien_rate":0.071,"tax_rate":0.01,"insurance_annual":1600,"refi_rate":0.061}
  }')
  if echo "$out" | grep -q '"first_lien_pi":"3225.753406"'; then
    pass "engine returns the partner golden P&I"
  else
    fail "unexpected response: ${out:0:200}"
  fi
fi

echo ""
[[ $FAIL -eq 0 ]] && echo "All checks passed." || echo "Preflight failed. Fix the ✗ items above."
exit $FAIL
