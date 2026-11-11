# Team board — High Dashboard

## Goal
Ship polished High Dashboard: accurate host metrics, rich Internet panel, open-source visuals, Playwright green, PR updated.

## Ownership
| Area | Owner | Status |
|------|-------|--------|
| Build / ldrs / typecheck | team-lead | done (`f034140`) |
| Host metrics accuracy | team-lead | done (`f034140`) |
| Internet widget | team-lead | done (`f034140`) |
| Visual QA loop | critic | done — report 86/100; residual closer active |
| E2E | team-lead | done (`f034140`, 10/10) |
| Commit / push / PR | team-lead → residual | residual closer landing punch-list fixes |
| Residual closer | `03-residual-closer.md` | **ACTIVE** — idle rates, briefs density, history empty, thermal n/a |

## Quality gates
- [x] `npm run build`
- [x] `npm run test:e2e` (10 passed)
- [x] Host mem% sane (not ~100%); CPU delta; net rx/tx on 2nd poll
- [x] Screenshots: dash-full, dash-host, dash-internet, dash-detail under `/opt/cursor/artifacts/`
- [ ] Re-shot after residual fixes + report append
- [ ] Residual closer build + e2e green
- [ ] PR body refreshed via ManagePullRequest (merged body ready in `pr-body-update.md`)
- [x] Critic `VISUAL_QA_REPORT.md` + confidence **86/100** (residuals in flight)

## Decisions
- CryptoZen teal `#14b8a6`; no purple/cream AI-slop
- Registry id `speed` title **Internet**
- unDraw under `public/illustrations/`; ldrs Orbit + LineWobble

## Critic punch list → residual closer
1. Live ↓/↑ idle 0.0 → em-dash / waiting for traffic
2. Briefs density tighten
3. Speed history < 2 → no empty chart chrome; clear collecting state
4. Thermal CPU null → “n/a on this OS”
