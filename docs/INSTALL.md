# Install High Dashboard

High Dashboard is a **local** app. Nothing is hosted in the cloud.

## Quick start (dev)

```bash
npm install
cp .env.example .env.local   # add GITHUB_TOKEN / Canvas secrets when ready
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Data is stored in `~/.high-dashboard/high-dashboard.db`.

## Production local run

```bash
npm run build
npm start
```

## Desktop packaging (Tauri)

```bash
npm run desktop:dev     # Tauri + Next in development
npm run desktop:build   # produces AppImage / DMG / MSI via src-tauri
```

Requires [Rust](https://rustup.rs/) and platform WebView deps. On Fedora:

```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file
```

GitHub Releases should attach:

| Platform | Artifact |
|----------|----------|
| Linux / Fedora / Hyprland | `.AppImage` |
| macOS | `.dmg` |
| Windows | `.msi` |

## Secrets

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | Live GitHub activity/PRs |
| `COMPOSIO_API_KEY` (+ optional `COMPOSIO_CANVAS_ACCOUNT_ID`) | **Preferred** live Canvas via OAuth |
| `CANVAS_API_TOKEN` + `CANVAS_BASE_URL` | Last-resort manual Canvas (DU ≤30 days) |
| `INGEST_SECRET` | Optional bearer for `/api/ingest` (loopback allowed without it) |

Without secrets, widgets show labeled **Sample** data.

## Automations

```bash
./agents/run-all-once.sh      # smoke test while app is running
./agents/install-timers.sh    # Fedora/Linux systemd --user timers
```

See [`docs/AUTOMATIONS.md`](AUTOMATIONS.md). Digests show in the **Briefs & automations** widget.
