# Live QA checklist

Run against local `npm run dev` / `npm start`:

1. Dashboard loads with greeting + High Dashboard brand
2. GitHub widget shows activity (sample or live)
3. Canvas widget shows assignments
4. Host widget shows CPU/memory (and disk/GPU when available)
5. Network Retest updates RTT
6. Customize → toggle each widget off/on; grid reflows
7. Theme dark/light/system
8. Accent color changes CSS `--accent`
9. Density compact/comfortable/spacious
10. Layout presets focus/balanced/dense
11. Settings persist after refresh
12. `/api/ingest` accepts POST and returns `{ ok: true }`
