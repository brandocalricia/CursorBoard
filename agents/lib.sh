#!/usr/bin/env bash
# Shared env loading for High Dashboard agent scripts.
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

hd_auth_args() {
  if [[ -n "${INGEST_SECRET:-}" ]]; then
    printf '%s\n' -H "Authorization: Bearer ${INGEST_SECRET}"
  fi
}
