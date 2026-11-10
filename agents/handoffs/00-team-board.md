# Team board — High Dashboard

## Goal
Ship polished High Dashboard: accurate host metrics, rich Internet panel, open-source visuals, Playwright green, PR updated.

## Ownership
| Area | Owner | Status |
|------|-------|--------|
| Build / ldrs / typecheck | team-lead | done |
| Host metrics accuracy | team-lead | done |
| Internet widget | team-lead | done |
| Visual QA loop | team-lead | done |
| E2E | team-lead | done |
| Commit / push / PR | team-lead | in progress |

## Quality gates
- [x] `npm run build`
- [x] `npm run test:e2e` (10 passed)
- [x] Host mem% sane (not ~100%); CPU delta; net rx/tx on 2nd poll
- [x] Screenshots: dash-full, dash-host, dash-internet, dash-detail
- [ ] PR body refreshed via ManagePullRequest

## Decisions
- CryptoZen teal `#14b8a6`; no purple/cream AI-slop
- Registry id `speed` title **Internet**
- unDraw under `public/illustrations/`; ldrs Orbit + LineWobble
