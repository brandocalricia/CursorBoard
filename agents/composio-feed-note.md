# Gmail / Calendar feed sync

High Dashboard prefers live Composio Platform keys (`ak_…`) with:

- `COMPOSIO_GMAIL_ACCOUNT_ID` (e.g. `gmail_stut-paren`)
- `COMPOSIO_CALENDAR_ACCOUNT_ID` (e.g. `googlecalendar_plush-aggry`)

Connect keys (`ck_…`) cannot call `tools/execute`.

Fallbacks:

1. **Gmail IMAP** — `GMAIL_USER` + `GMAIL_APP_PASSWORD`
2. **Local feed cache** — POST `/api/ingest` with `kind: "email_feed"` or `"calendar_feed"` and a payload matching `EmailPayload` / `CalendarPayload`

Cursor agents with Composio MCP can refresh the cache without an `ak_` key by fetching via MCP and posting to ingest on loopback.
