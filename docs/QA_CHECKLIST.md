# Live QA checklist

Prefer automated coverage:

```bash
npm run build && npm run test:e2e
```

Playwright covers brand load, Briefs **Run once**, Canvas/GitHub/Email detail sheets, internet speed Start, host metrics, customize persistence, and API health (`/api/health`, digests, automations).

## Manual spot checks

1. Dashboard loads with greeting + High Dashboard brand
2. GitHub widget shows activity (sample or live) — click opens detail
3. Canvas widget shows assignments — click shows instructions + **Open in Canvas**
4. Email sample rows open readable bodies
5. Host widget shows CPU/memory (and disk/GPU when available)
6. Internet speed → **Start** runs latency → download → upload (Sample badge if CDN blocked)
7. Customize → toggle each widget off/on; grid reflows
8. Theme dark/light/system; accent; density; layout presets
9. Settings persist after refresh
10. Offline banner appears when network is disabled (DevTools)
11. `/api/ingest` accepts POST and returns `{ ok: true }`
