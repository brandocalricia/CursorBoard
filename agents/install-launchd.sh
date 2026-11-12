#!/usr/bin/env bash
set -euo pipefail
# Installs High Dashboard launchd agents on macOS (same cadences as systemd timers).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$ROOT/agents"
LAUNCH_DIR="$HOME/Library/LaunchAgents"
LABEL_PREFIX="com.highdashboard"

mkdir -p "$LAUNCH_DIR" "$HOME/.high-dashboard"
chmod +x "$SCRIPT_DIR"/*.sh

if [[ ! -f "$HOME/.high-dashboard/env" ]]; then
  cat > "$HOME/.high-dashboard/env" <<'EOF'
HIGH_DASHBOARD_PORT=3000
# GITHUB_TOKEN=
# CANVAS_API_TOKEN=
# CANVAS_BASE_URL=https://canvas.du.edu
EOF
  echo "Created ~/.high-dashboard/env — add secrets there or in the repo .env.local"
fi

write_plist() {
  local name="$1"
  local script="$2"
  local seconds="$3"
  local label="${LABEL_PREFIX}.${name}"
  local plist="$LAUNCH_DIR/${label}.plist"
  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${SCRIPT_DIR}/${script}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>StartInterval</key>
  <integer>${seconds}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${HOME}/.high-dashboard/${name}.log</string>
  <key>StandardErrorPath</key>
  <string>${HOME}/.high-dashboard/${name}.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
</dict>
</plist>
EOF
  launchctl bootout "gui/$(id -u)/${label}" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$plist"
  launchctl enable "gui/$(id -u)/${label}" 2>/dev/null || true
  echo "Loaded ${label} every ${seconds}s"
}

# Canvas sync ~30m, GitHub ~3h, host ~5m, auth ~25d
write_plist "canvas-sync" "canvas-sync.sh" "1800"
write_plist "github-digest" "github-digest.sh" "10800"
write_plist "host-snapshot" "host-snapshot.sh" "300"
write_plist "canvas-auth" "canvas-auth-check.sh" "2160000"

echo
echo "launchd agents installed. Keep npm start running so /api/ingest works."
echo "Smoke-test: ${SCRIPT_DIR}/run-all-once.sh"
echo "Logs: ~/.high-dashboard/*.log"
