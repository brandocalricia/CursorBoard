#!/usr/bin/env bash
set -euo pipefail
# One-shot: run every local automation against a live High Dashboard.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
chmod +x "$ROOT/agents"/*.sh

PORT="${HIGH_DASHBOARD_PORT:-3000}"
if ! curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
  echo "High Dashboard not healthy on :${PORT}. Start it with: npm run build && npm start" >&2
  exit 1
fi

echo "== GitHub digest =="
"$ROOT/agents/github-digest.sh"
echo "== Canvas sync =="
"$ROOT/agents/canvas-sync.sh"
echo "== Canvas auth =="
"$ROOT/agents/canvas-auth-check.sh" || true
echo "== Host snapshot =="
"$ROOT/agents/host-snapshot.sh"
echo
echo "All local automations finished. Open the Briefs widget on the dashboard."
