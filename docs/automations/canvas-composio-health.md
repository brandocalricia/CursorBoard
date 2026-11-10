# Automation: Canvas Composio health

Create at: https://cursor.com/automations/new

## Settings

| Field | Value |
|-------|--------|
| Name | High Dashboard · Canvas Composio health |
| Trigger | Schedule cron `0 15 1,26 * *` (1st & 26th ~15:00 UTC) |
| Repository | **No repository** (or `brandocalricia/CursorBoard` if you want Memories tied to the repo) |
| Tools | Composio MCP, Memories, Send to Slack (DM) |
| Model | Default / fast |

## Prompt (paste)

```text
Run the High Dashboard Canvas/Composio health check for Brandon (canvas.du.edu).

1) Use Composio MCP: list Canvas connections (action=list). Do NOT create a new connection unless the active one is dead.
2) Execute CANVAS_GET_CURRENT_USER against the ACTIVE account (expected: Brandon Niehaus / canvas_since-ergal).
3) If ACTIVE and GET_CURRENT_USER succeeds: write Memory "Canvas Composio OK <ISO date>" and stop with a one-line summary.
4) If inactive/expired/failing:
   - Initiate a Canvas reconnect via COMPOSIO_MANAGE_CONNECTIONS
   - Slack DM Brandon Niehaus with the markdown auth link
   - Tell him High Dashboard will show sample Canvas data until he reconnects
5) Never invent tokens. Never open PRs. Never commit assignment/course data.
```

## Also enabled in this agent chat

A matching `cursor-subscriptions` timer named `canvas-composio-health` is subscribed on the same cron so this Cloud Agent conversation will wake and run the check even before the dashboard Automation exists.

## GitHub Action backup

`.github/workflows/canvas-composio-health.yml` — add repo secrets:

- `COMPOSIO_API_KEY`
- `COMPOSIO_CANVAS_ACCOUNT_ID` = `canvas_since-ergal` (optional)
