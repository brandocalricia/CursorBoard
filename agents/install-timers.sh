#!/usr/bin/env bash
set -euo pipefail
# Installs High Dashboard systemd --user timers on Fedora/Linux.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UNIT_DIR="$HOME/.config/systemd/user"
SCRIPT_DIR="$ROOT/agents"

mkdir -p "$UNIT_DIR" "$HOME/.high-dashboard"
chmod +x "$SCRIPT_DIR"/*.sh

# Ensure env file exists (never overwrite secrets)
if [[ ! -f "$HOME/.high-dashboard/env" ]]; then
  cat > "$HOME/.high-dashboard/env" <<'EOF'
# Sourced by High Dashboard agent scripts / systemd units
HIGH_DASHBOARD_PORT=3000
# INGEST_SECRET=   # optional; required if you bind beyond loopback
# COMPOSIO_API_KEY=
# COMPOSIO_CANVAS_ACCOUNT_ID=canvas_since-ergal
# GITHUB_TOKEN=
EOF
  echo "Created ~/.high-dashboard/env — add secrets there or in the repo .env.local"
fi

install_unit() {
  local name="$1"
  sed "s|__ROOT__|${ROOT}|g" "$SCRIPT_DIR/systemd/${name}" > "$UNIT_DIR/${name}"
}

for f in \
  high-dashboard-github-digest.service \
  high-dashboard-github-digest.timer \
  high-dashboard-canvas-sync.service \
  high-dashboard-canvas-sync.timer \
  high-dashboard-canvas-auth.service \
  high-dashboard-canvas-auth.timer
do
  install_unit "$f"
done

systemctl --user daemon-reload
systemctl --user enable --now \
  high-dashboard-github-digest.timer \
  high-dashboard-canvas-sync.timer \
  high-dashboard-canvas-auth.timer

echo
systemctl --user list-timers 'high-dashboard-*' --no-pager
echo
echo "Timers installed. Keep High Dashboard running (npm start / desktop) so ingest can land."
echo "Smoke-test: ${SCRIPT_DIR}/run-all-once.sh"
