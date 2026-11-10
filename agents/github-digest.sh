#!/usr/bin/env bash
set -euo pipefail
# Emits a markdown digest from `gh` when available; posts to local High Dashboard.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1090
[[ -f "$HOME/.high-dashboard/env" ]] && source "$HOME/.high-dashboard/env"
PORT="${HIGH_DASHBOARD_PORT:-3000}"
BODY="## GitHub digest\n\nGenerated $(date -Iseconds)\n"
if command -v gh >/dev/null 2>&1; then
  BODY+=$'\n'"$(gh api user/events?per_page=5 --jq '.[] | "- \(.type) \(.repo.name)"' 2>/dev/null || true)"
fi
payload=$(jq -n --arg body "$BODY" '{source:"github",kind:"daily_digest",title:"GitHub digest",body_md:$body}')
curl -sS -X POST "http://127.0.0.1:${PORT}/api/ingest" \
  -H "Authorization: Bearer ${INGEST_SECRET:-}" \
  -H "Content-Type: application/json" \
  -d "$payload"
echo
