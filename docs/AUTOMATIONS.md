# Automations & local sync

High Dashboard is **not hosted**. Cloud agents cannot POST to `127.0.0.1` without a tunnel — **local timers are the primary sync path**. Cloud jobs cover what they can (Composio health, CI).

## Quick start (wire everything)

```bash
# 1) App must be running locally
npm run build && npm start

# 2) Smoke-test every local automation once
./agents/run-all-once.sh

# 3) Install Fedora/Linux user timers (optional but recommended)
./agents/install-timers.sh
```

Then open the dashboard → **Briefs & automations** → digests appear; **Run once** re-triggers scripts.

Put secrets in `~/.high-dashboard/env` and/or `.env.local` (`COMPOSIO_API_KEY`, `GITHUB_TOKEN`, optional `INGEST_SECRET`).

## Local scripts (`agents/`)

| Script | What it does | How it helps |
|--------|----------------|--------------|
| `github-digest.sh` | Builds activity + open-PR markdown via `gh`, POSTs `/api/ingest` | Morning Briefs without opening GitHub |
| `canvas-sync.sh` | Hits `/api/canvas` (warms cache) + records status brief | Keeps Canvas fresh every 6h |
| `canvas-auth-check.sh` | Composio `CANVAS_GET_CURRENT_USER` + brief | Catches OAuth death before the 30-day cliff matters |
| `host-snapshot.sh` | Forces `/api/host` snapshot | Confirms metrics path for probes |
| `run-all-once.sh` | Runs the above | Manual / UI **Run once** |
| `install-timers.sh` | Enables systemd `--user` timers | Hands-free after reboot |

## Systemd timers (Fedora / Hyprland)

Installed by `agents/install-timers.sh` into `~/.config/systemd/user/`:

| Timer | Cadence | Service |
|-------|---------|---------|
| `high-dashboard-github-digest.timer` | Daily 07:00 | `github-digest.sh` |
| `high-dashboard-canvas-sync.timer` | Every 6h | `canvas-sync.sh` |
| `high-dashboard-canvas-auth.timer` | ~every 25 days | `canvas-auth-check.sh` |

Host metrics refresh **in-app every 15s** — no timer required.

Ingest example:

```bash
curl -sS -X POST http://127.0.0.1:3000/api/ingest \
  -H "Authorization: Bearer $INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"source":"github","kind":"daily_digest","title":"GitHub digest","body_md":"## Ships\n- ..."}'
```

Without `INGEST_SECRET`, only **loopback** requests are accepted.

## Dashboard surfaces

| Surface | Role |
|---------|------|
| **Briefs & automations** widget | Last pulses, recent digests, **Run once** |
| `GET /api/automations` | Status JSON for timers / last runs |
| `POST /api/automations` `{ "id": "all" }` | Trigger scripts from the UI |
| `GET /api/digests` | Brief list |
| `GET /api/health` | DB + secret configuration probe |

## Cloud / Cursor (cannot write your laptop DB)

| Automation | Status | Purpose |
|------------|--------|---------|
| Canvas Composio health timer | Subscribed in Cloud Agent (`0 15 1,26 * *`) | Ping Composio; Slack reconnect link if dead |
| GitHub Action `canvas-composio-health.yml` | In repo | Same check via `COMPOSIO_API_KEY` secret |
| Prompt template | `docs/automations/canvas-composio-health.md` | Create matching Automation at cursor.com if desired |

### Marketplace templates (enable once on this repo)

Cloud agents **cannot create** Automations via API — open [cursor.com/automations/new](https://cursor.com/automations/new) or marketplace:

| Template | URL | Trigger |
|----------|-----|---------|
| Find critical bugs | https://cursor.com/marketplace/automations/find-bugs | Daily |
| Find vulnerabilities | https://cursor.com/marketplace/automations/find-vulnerabilities | PR |
| Autofix PR review comments | https://cursor.com/marketplace/automations/autofix-pr-review-comments | Review comment |
| Summarize changes daily | https://cursor.com/marketplace/automations/daily-digest | Daily |
| Triage GitHub Actions failures | https://cursor.com/marketplace/automations/triage-github-workflow-failures | Workflow failed |

Also enable Cursor **Bugbot** + **Security Agents** on the repo.

## Canvas 30-day token limit (DU)

Prefer Composio OAuth — see [`docs/CANVAS_TOKENS.md`](CANVAS_TOKENS.md). Manual tokens are last resort.

## Live QA

```bash
npm run build && npm run test:e2e
```

See `docs/QA_CHECKLIST.md`.
