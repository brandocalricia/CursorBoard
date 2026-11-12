#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/agents/lib.sh"
load_hd_env "$ROOT"
hd_set_auth

PORT="${HIGH_DASHBOARD_PORT:-3000}"
BASE="http://127.0.0.1:${PORT}"

STATUS="remind"
DETAIL="Verify Composio Canvas connection is ACTIVE. Manual DU tokens expire in ≤30 days."

if [[ -n "${COMPOSIO_API_KEY:-}" ]]; then
  BODY_JSON='{"arguments":{}}'
  if [[ -n "${COMPOSIO_CANVAS_ACCOUNT_ID:-}" ]]; then
    BODY_JSON=$(jq -nc --arg id "$COMPOSIO_CANVAS_ACCOUNT_ID" '{arguments:{}, connected_account_id:$id}')
  fi
  CODE=$(curl -sS -o /tmp/hd-canvas-auth.json -w "%{http_code}" \
    -X POST "https://backend.composio.dev/api/v3.1/tools/execute/CANVAS_GET_CURRENT_USER" \
    -H "content-type: application/json" \
    -H "x-api-key: ${COMPOSIO_API_KEY}" \
    -d "$BODY_JSON" || echo "000")
  if [[ "$CODE" == "200" ]] && grep -q '"successful"[[:space:]]*:[[:space:]]*true' /tmp/hd-canvas-auth.json; then
    STATUS="ok"
    DETAIL="Composio Canvas OAuth healthy (HTTP 200)."
  else
    STATUS="fail"
    DETAIL="Composio Canvas check failed (HTTP ${CODE}). Reconnect at https://app.composio.dev — see docs/CANVAS_TOKENS.md."
  fi
else
  STATUS="unconfigured"
  DETAIL="COMPOSIO_API_KEY unset. High Dashboard will show sample Canvas until you add it to .env.local."
fi

MD="## Canvas auth check"$'\n\n'"**Status:** ${STATUS}"$'\n\n'"${DETAIL}"$'\n\n'"Checked $(hd_now)"$'\n'

payload=$(jq -n --arg body "$MD" --arg status "$STATUS" \
  '{source:"canvas",kind:"auth_check",title:("Canvas auth · " + $status),body_md:$body,payload:{status:$status}}')

if curl -sS -f -X POST "${BASE}/api/ingest" \
  ${AUTH[@]+"${AUTH[@]}"} \
  -H "Content-Type: application/json" \
  -d "$payload" >/dev/null 2>&1; then
  echo "Recorded auth check (${STATUS}) → ${BASE}"
else
  echo "App not reachable at ${BASE}; status=${STATUS}"
  echo "$DETAIL"
fi

[[ "$STATUS" == "ok" || "$STATUS" == "remind" || "$STATUS" == "unconfigured" ]]
