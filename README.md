# High Dashboard

Local personal command center — modular ZenWallet-style widgets for GitHub, Canvas, full host metrics, and network probes. Runs on your machine (Fedora/Hyprland, macOS, Windows). **Not hosted anywhere.**

## Features

- Toggle widgets on/off with animated grid reflow
- Dark / light / system themes, accent colors, density, layout presets (persisted in SQLite under `~/.high-dashboard`)
- GitHub activity + open PRs
- Canvas upcoming assignments
- Host telemetry: CPU, memory, disk, GPU, thermal, power, interfaces
- Local ingest API for systemd/cron digests
- Tauri desktop packaging (AppImage / DMG / MSI)

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

See [docs/INSTALL.md](docs/INSTALL.md), [docs/HOST_METRICS.md](docs/HOST_METRICS.md), [docs/AUTOMATIONS.md](docs/AUTOMATIONS.md), [docs/CANVAS_TOKENS.md](docs/CANVAS_TOKENS.md) (DU 30-day token limit → use Composio OAuth).

## Next prompts

1. Add Gmail priority inbox + local sync timer  
2. Grok/Cursor usage widgets + Ollama morning brief  
3. Harden Tauri release builds (Fedora/NVIDIA, macOS, Windows) + motion/a11y polish  
