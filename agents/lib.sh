#!/usr/bin/env bash
# Shared helpers for High Dashboard agent scripts (macOS Bash 3.2 + Linux).
#
# Do not use mapfile/readarray or GNU-only date flags — macOS /bin/bash is 3.2.

load_hd_env() {
  local root="$1"
  # shellcheck disable=SC1090
  [[ -f "$HOME/.high-dashboard/env" ]] && source "$HOME/.high-dashboard/env"
  if [[ -f "$root/.env.local" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$root/.env.local"
    set +a
  fi
}

# Sets global AUTH array: empty, or (-H "Authorization: Bearer …")
hd_set_auth() {
  AUTH=()
  if [[ -n "${INGEST_SECRET:-}" ]]; then
    AUTH=(-H "Authorization: Bearer ${INGEST_SECRET}")
  fi
}

# ISO-8601 UTC timestamp (portable; no GNU date -Iseconds)
hd_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}
