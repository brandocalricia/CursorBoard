#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/agents/lib.sh"
load_hd_env "$ROOT"

PORT="${HIGH_DASHBOARD_PORT:-3000}"
BASE="http://127.0.0.1:${PORT}"

curl -sS -f "${BASE}/api/host" >/tmp/hd-host.json
HOST=$(jq -r '.hostname // "host"' /tmp/hd-host.json)
CPU=$(jq -r '.cpu.usagePercent // "n/a"' /tmp/hd-host.json)
MEM=$(jq -r '"\(.memory.memUsedMb)/\(.memory.memTotalMb) MB"' /tmp/hd-host.json)

echo "Host snapshot ok · ${HOST} · CPU ${CPU}% · mem ${MEM}"
