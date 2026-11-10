# Agent Handoff Protocol — High Dashboard

Durable, low-noise coordination for the multi-agent team. Handoffs are the memory layer between turns and agents. Keep them short, factual, and current.

## Rules

1. **Read your own handoff first.** At the start of every turn or resume, each agent reads only its own handoff file (`01-team-lead.md`, `02-visual-critic.md`, etc.) before acting.
2. **Write status at end of turn.** Before finishing, update your handoff with:
   - `status` — `idle` | `active` | `blocked` | `done`
   - `done` — what landed this turn
   - `next` — next 1–3 concrete actions
   - `blockers` — anything stopping progress (or none)
   - `files_touched` — paths changed
   - `quality_gates` — build / e2e / screenshots / other gate results
3. **No transcript dumps.** Max ~80 lines. Bullet facts only. No chat paste, no stack-trace walls, no full logs.
4. **Shared board is truth.** `00-team-board.md` is the single source of truth for cross-agent coordination. Update it when ownership, blockers, or gates change.
5. **No secrets.** Never put `.env` values, tokens, API keys, cookies, or credentials in any handoff.

## Files

| File | Owner / purpose |
|------|-----------------|
| `00-team-board.md` | Shared living board (goal, ownership, status, blockers, gates, decisions) |
| `01-team-lead.md` | Team lead personal handoff |
| `02-visual-critic.md` | Visual critic personal handoff |
| `TEMPLATE.md` | Blank template for new agent handoffs |

## How to update

- Prefer overwrite of the structured sections; do not append endless history.
- Decision log on the team board: one line per decision (`YYYY-MM-DD — decision — why`).
- If blocked on another agent, name them and the ask under Blockers and mirror a one-liner on the team board.
- Artifacts: link paths under `/opt/cursor/artifacts` or repo-relative paths; do not inline binary content.

## Quality bar for handoffs

- Another agent can resume in under a minute from your handoff alone.
- Status and Next are never stale relative to the last meaningful step.
- Team board Current status matches reality after every meaningful step.
