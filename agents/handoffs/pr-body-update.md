<!-- CURSOR_AGENT_PR_BODY_BEGIN -->
## Summary
High Dashboard — local-first personal command center (ZenWallet / CryptoZen teal polish).

### Automations (wired end-to-end)
- **Local scripts** in `agents/`: GitHub digest, Canvas sync, Canvas auth check, host snapshot, `run-all-once.sh`, `install-timers.sh`
- **systemd user timers**: daily digest, 6h Canvas sync, ~25-day auth check
- **Briefs & automations** widget: last pulses, digests, **Run once**
- APIs: `/api/digests`, `/api/automations`, `/api/health`
- **Cloud**: Canvas Composio health timer + weekly pulse + PR CI watch; GH Action `canvas-composio-health.yml` + Playwright workflow
- Docs: `docs/AUTOMATIONS.md`, INSTALL updated

### Product
- **Accurate host metrics**: macOS `vm_stat` + Linux `/proc/meminfo` (no false ~100% RAM); CPU idle deltas; live iface rx/tx; 2s poll; memory “used + available of total”
- **Internet widget** (registry id `speed`): live ping, latency timeline (Recharts), iface rates, full speed test + history — edge path + honest Local badge
- **Visual system**: unDraw SVGs in `public/illustrations/`, ldrs loaders, Phosphor icons; empty/loading states; header analytics illustration
- Canvas/GitHub/Email detail sheets + Canvas due urgency
- Settings migration for `briefs` / `speed`

### Verify
```bash
npm run build && npm run test:e2e   # 10/10
# Host smoke: curl /api/host twice — mem% sane, CPU set, rx/tx on 2nd poll
npm start && ./agents/run-all-once.sh
./agents/install-timers.sh          # Fedora/Linux
```

Set `COMPOSIO_API_KEY` / GitHub tokens in `.env.local` for live sources (samples otherwise).

<!-- CURSOR_AGENT_PR_BODY_END -->

---

## Apply via ManagePullRequest (parent)

`update_pr` with `branch_name: cursor/high-dashboard-82fa` and body = content between the CURSOR markers above.

Merge notes (do not wipe human footer):
- Preserved prior Automations bullets + verify install-timers / run-all-once
- Preserved detail-sheet + Local badge product notes
- Merged lead polish: host metrics accuracy, rich Internet, visual system, e2e 10/10
- Keep existing PR footer (Open in Web / Open in Cursor) outside markers

**Status:** ManagePullRequest unavailable in follow-up subagent session — parent must call `update_pr`.
