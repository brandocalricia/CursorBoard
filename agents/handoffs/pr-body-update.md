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

### Product (this push)
- **Accurate host metrics**: macOS `vm_stat` + Linux `/proc/meminfo` (no false ~100% RAM); CPU idle deltas; live iface rx/tx; 2s poll; memory “used + available of total”
- **Internet widget** (registry id `speed`): live ping, latency timeline (Recharts), iface rates, full speed test + history — not bare RTT
- **Visual system**: unDraw SVGs in `public/illustrations/`, ldrs loaders, Phosphor icons; empty/loading states; header analytics illustration
- Detail sheets, settings migration for `briefs` / `speed`

### Verify
```bash
npm run build && npm run test:e2e   # 10/10
# Host smoke: curl /api/host twice — mem% sane, CPU set, rx/tx on 2nd poll
```

Set `COMPOSIO_API_KEY` / GitHub tokens in `.env.local` for live sources (samples otherwise).

<!-- CURSOR_AGENT_PR_BODY_END -->
