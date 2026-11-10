#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/agents/lib.sh"
load_hd_env "$ROOT"

PORT="${HIGH_DASHBOARD_PORT:-3000}"
BASE="http://127.0.0.1:${PORT}"
mapfile -t AUTH < <(hd_auth_args)

BODY="## GitHub digest"$'\n\n'"Generated $(date -Iseconds)"$'\n'

if command -v gh >/dev/null 2>&1; then
  EVENTS="$(gh api user/events?per_page=8 --jq '.[] | "- \(.type | sub("Event$";"")) · \(.repo.name) (\(.created_at))"' 2>/dev/null || true)"
  PRS="$(gh api search/issues -f q='author:@me type:pr state:open' --jq '.items[:5][] | "- #\(.number) \(.title) (\(.repository_url | split("/") | .[-2:] | join("/")))"' 2>/dev/null || true)"
  BODY+=$'\n### Recent activity\n'"${EVENTS:-_No recent events_}"$'\n'
  BODY+=$'\n### Open PRs\n'"${PRS:-_No open PRs_}"$'\n'
else
  BODY+=$'\n_Install GitHub CLI (`gh`) for live digests. Dashboard GitHub widget still works via `GITHUB_TOKEN`._\n'
fi

command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 1; }

payload=$(jq -n --arg body "$BODY" \
  '{source:"github",kind:"daily_digest",title:"GitHub digest",body_md:$body}')

curl -sS -f -X POST "${BASE}/api/ingest" \
  ${AUTH[@]+"${AUTH[@]}"} \
  -H "Content-Type: application/json" \
  -d "$payload"
echo
echo "Posted GitHub digest → ${BASE}"
