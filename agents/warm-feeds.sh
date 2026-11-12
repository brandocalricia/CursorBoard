#!/usr/bin/env bash
# Warm Canvas / GitHub / Email / Calendar / Host caches while the desk is up.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/agents/lib.sh"
load_hd_env "$ROOT"
hd_set_auth

PORT="${HIGH_DASHBOARD_PORT:-3000}"
BASE="http://127.0.0.1:${PORT}"

warm() {
  local path="$1"
  local code
  code=$(curl -sS -o /tmp/hd-warm.json -w "%{http_code}" "${BASE}${path}" || echo "000")
  echo "warm ${path} → HTTP ${code}"
}

warm "/api/canvas"
warm "/api/github"
warm "/api/email"
warm "/api/calendar"
warm "/api/host"

NOW="$(hd_now)"
BODY="## Feed warm"$'\n\n'"Warmed Canvas, GitHub, Email, Calendar, and Host."$'\n\n'"At ${NOW}"$'\n'
payload=$(jq -n \
  --arg body "$BODY" \
  --arg now "$NOW" \
  '{source:"warm-feeds",kind:"feed_warm",title:("Feed warm · " + $now),body_md:$body}')

curl -sS -f -X POST "${BASE}/api/ingest" \
  ${AUTH[@]+"${AUTH[@]}"} \
  -H "Content-Type: application/json" \
  -d "$payload" >/dev/null || true

echo "Feed warm done → ${BASE}"
