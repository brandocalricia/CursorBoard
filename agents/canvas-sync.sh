#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/agents/lib.sh"
load_hd_env "$ROOT"
hd_set_auth

PORT="${HIGH_DASHBOARD_PORT:-3000}"
BASE="http://127.0.0.1:${PORT}"

CODE=$(curl -sS -o /tmp/hd-canvas.json -w "%{http_code}" "${BASE}/api/canvas" || echo "000")
COUNT=$(jq -r '.assignments | length // 0' /tmp/hd-canvas.json 2>/dev/null || echo 0)
SAMPLE=$(jq -r '.sample // true' /tmp/hd-canvas.json 2>/dev/null || echo true)

STATUS="ok"
NOTE="Fetched ${COUNT} upcoming assignment(s)."
if [[ "$CODE" != "200" ]]; then
  STATUS="error"
  NOTE="Canvas API returned HTTP ${CODE}. Is High Dashboard running on :${PORT}?"
elif [[ "$SAMPLE" == "true" ]]; then
  STATUS="sample"
  NOTE="Serving sample Canvas data. Set COMPOSIO_API_KEY in .env.local (see docs/CANVAS_TOKENS.md)."
fi

BODY="## Canvas sync"$'\n\n'"**Status:** ${STATUS}"$'\n'"${NOTE}"$'\n\n'"Synced $(hd_now)"$'\n'

payload=$(jq -n \
  --arg body "$BODY" \
  --arg status "$STATUS" \
  --argjson count "$COUNT" \
  '{source:"canvas",kind:"canvas_sync",title:("Canvas sync · " + $status),body_md:$body,payload:{status:$status,count:$count}}')

curl -sS -f -X POST "${BASE}/api/ingest" \
  ${AUTH[@]+"${AUTH[@]}"} \
  -H "Content-Type: application/json" \
  -d "$payload"
echo
echo "Canvas sync ${STATUS} (${COUNT}) → ${BASE}"
