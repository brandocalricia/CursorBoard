# Team board — High Dashboard

## Goal
Ship polished High Dashboard: accurate host metrics, rich Internet panel, open-source visuals, Playwright green, PR updated.

## Ownership
| Area | Owner | Status |
|------|-------|--------|
| Build / ldrs / typecheck | team-lead | done (`f034140`) |
| Host metrics accuracy | team-lead | done (`f034140`) |
| Internet widget | team-lead | done (`f034140`) |
| Visual QA loop | critic | done — was 86/100 |
| Residual closer | `03-residual-closer.md` | **done** (`8da74f3`) — confidence **92/100** |
| E2E | residual | done — 10/10 after residual fixes |
| Commit / push / PR | residual → parent | commit landed; push in flight; PR body OK as-is |

## Quality gates
- [x] `npm run build`
- [x] `npm run test:e2e` (10 passed)
- [x] Host mem% sane (not ~100%); CPU delta; net rx/tx on 2nd poll
- [x] Screenshots: dash-full, dash-host, dash-internet, dash-detail under `/opt/cursor/artifacts/`
- [x] Re-shot after residual fixes + report append (confidence **92**)
- [x] Residual closer build + e2e green
- [ ] PR body — optional; existing body preserved (no ManagePullRequest change needed)
- [x] Critic + residual `VISUAL_QA_REPORT.md`

## Decisions
- CryptoZen teal `#14b8a6`; no purple/cream AI-slop
- Registry id `speed` title **Internet**
- unDraw under `public/illustrations/`; ldrs Orbit + LineWobble
- Idle live rates: em-dash + “waiting for traffic” (not `0.0`)
- Thermal null: “n/a on this OS”
