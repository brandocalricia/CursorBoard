# Canvas auth & the 30-day token limit

University of Denver Canvas (`canvas.du.edu`) caps **manual** API access tokens at **30 days**. That is an institution setting on “Approved Integrations” tokens — not something High Dashboard can raise.

## Recommended: Composio OAuth (already connected)

You connected Canvas through **Composio**. That path uses Canvas **OAuth** (developer-key style). Access tokens rotate (~1h); **refresh tokens** keep the connection alive without a 30-day cliff.

High Dashboard prefers:

1. `COMPOSIO_API_KEY` (+ optional `COMPOSIO_CANVAS_ACCOUNT_ID`) → `CANVAS_LIST_TODO_ITEMS`
2. Else `CANVAS_API_TOKEN` + `CANVAS_BASE_URL` (30-day manual token — last resort)
3. Else labeled sample data

Active Composio account (this machine’s check): `canvas_since-ergal` · Brandon Niehaus · DU Canvas.

### Env

```bash
COMPOSIO_API_KEY=...                 # from https://app.composio.dev
COMPOSIO_CANVAS_ACCOUNT_ID=canvas_since-ergal   # optional pin
# Avoid relying on these for daily use:
# CANVAS_API_TOKEN=
# CANVAS_BASE_URL=https://canvas.du.edu
```

## Automating the remaining risk

| Job | How | Why |
|-----|-----|-----|
| **Prefer Composio** | Set `COMPOSIO_API_KEY` in `.env.local` | No 30-day manual token |
| **Connection health** | Cursor Automation every **25 days** | If Composio Canvas status ≠ ACTIVE, Slack/email you a reconnect link |
| **Manual token renew** (only if you refuse Composio) | Automation every 25 days: Composio `CANVAS_UPDATE_USERS_TOKENS` with `regenerate: true` + `expires_at` ≈ +30d, then you paste the new secret into `.env.local` | Still needs a human paste step locally — cannot silently write your laptop secrets from the cloud |

### Cursor Automation prompt — Canvas connection health (copy into cursor.com/automations)

```text
Trigger: cron every 25 days
Repo: none (or CursorBoard)
Tools: Composio MCP (Canvas), Memories, Send to Slack (optional)

1) Call COMPOSIO_SEARCH_TOOLS / list Canvas connection status for this user.
2) If Canvas has an ACTIVE account, write Memory: "Canvas Composio OK <ISO date>" and stop.
3) If inactive/expired:
   - Call COMPOSIO_MANAGE_CONNECTIONS for toolkit canvas (add/reconnect).
   - Message Brandon with the markdown auth link to reconnect.
   - Do NOT invent tokens. Do NOT open PRs.
```

### Local systemd reminder (Fedora)

`agents/systemd/high-dashboard-canvas-auth.timer` fires every 25 days and curls a health note into `/api/ingest` so the dashboard can surface “Canvas auth check due”.

## What not to do

- Do not ask classmates for manual tokens (Canvas API policy).
- Do not embed long-lived tokens in the repo.
- Do not expect a cloud Automation to rewrite `~/.high-dashboard` secrets on your Hyprland box without a local agent.
