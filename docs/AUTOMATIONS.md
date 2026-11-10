# Automations & local sync

High Dashboard is **not hosted**. Cloud Automations cannot POST to `127.0.0.1` without a tunnel — so **local timers are the primary sync path**.

## Local timers (use these)

See [`agents/systemd/`](../agents/systemd/) for Fedora user units:

- `high-dashboard-github-digest.timer` — daily digest → `POST /api/ingest`
- `high-dashboard-canvas-sync.timer` — every 6h refresh signal
- `high-dashboard-host` — optional; host metrics already refresh in-app every 15s

Example ingest:

```bash
curl -sS -X POST http://127.0.0.1:3000/api/ingest \
  -H "Authorization: Bearer $INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"source":"github","kind":"daily_digest","title":"GitHub digest","body_md":"## Ships\n- ..."}'
```

## Cursor Marketplace templates (enable on this repo)

Cloud agents **cannot create** Automations via API — create these once at [cursor.com/automations/new](https://cursor.com/automations/new) (or “Open with Cursor” from the marketplace). Point them at `brandocalricia/CursorBoard`.

| Template | URL | Trigger | Purpose |
|----------|-----|---------|---------|
| Find critical bugs | https://cursor.com/marketplace/automations/find-bugs | Daily | High-severity correctness → fix PRs |
| Find vulnerabilities | https://cursor.com/marketplace/automations/find-vulnerabilities | PR opened/pushed | Security review comments |
| Autofix PR review comments | https://cursor.com/marketplace/automations/autofix-pr-review-comments | Review comment | Apply nits on this PR branch |
| Summarize changes daily | https://cursor.com/marketplace/automations/daily-digest | Daily | Slack/repo digest (also inspires `agents/github-digest.sh`) |
| Triage GitHub Actions failures | https://cursor.com/marketplace/automations/triage-github-workflow-failures | Workflow failed | CI triage |

Also enable Cursor-managed **Bugbot** + **Security Agents** on the repo (Automations → From Cursor).

Live UI QA in this build used **Playwright click-through** against `http://127.0.0.1:3000` (theme, widget toggles, network retest, ingest API) — see `docs/QA_CHECKLIST.md`.

## Live QA automation (manual / agent session)

During development, run Playwright (or a cloud agent with computer use) against `http://127.0.0.1:3000` to click Customize, toggle widgets, switch themes, and retest Network — same checklist as `docs/QA_CHECKLIST.md`.

## Canvas 30-day token limit (DU)

Manual Canvas tokens expire in ≤30 days. **Do not rely on them.** Use the Composio Canvas OAuth connection + `COMPOSIO_API_KEY` instead.

Full write-up + copy-paste **25-day connection health Automation**: [`docs/CANVAS_TOKENS.md`](CANVAS_TOKENS.md).
