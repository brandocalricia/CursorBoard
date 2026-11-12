# Desktop auto-update (post-v1)

When High Dashboard ships as a downloadable app (Tauri), add a **corner update control** like VS Code:

1. Check a release feed (GitHub Releases) on a timer + on launch.
2. Show a small badge/button (bottom-right or title bar) when a newer version exists.
3. One click: download → install → **quit and relaunch** into the new build.
4. Never force-update mid-session without confirming (or use a quiet background download + “Restart to update”).

Track this for the desktop packaging milestone — not required for local `npm start` v1.
