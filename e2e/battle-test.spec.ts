import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * Exhaustive UI / API battle suite — clicks every reachable control,
 * exercises CRUD, settings, layouts, and asserts no page errors.
 */

const DEFAULT_SETTINGS = {
  theme: "dark" as const,
  accent: "#5CEE15",
  density: "comfortable" as const,
  layoutPreset: "balanced" as const,
  themePack: "cryptozen" as const,
  enabledWidgets: [
    "github",
    "canvas",
    "email",
    "calendar",
    "weather",
    "links",
    "notes",
    "focus",
    "briefs",
    "host",
    "speed",
  ],
  widgetOrder: [
    "github",
    "canvas",
    "email",
    "calendar",
    "weather",
    "links",
    "notes",
    "focus",
    "briefs",
    "host",
    "speed",
  ],
  widgetSpans: {},
  weatherLocations: [],
  weatherActiveId: null,
  weatherUnit: "f" as const,
  weatherCoords: { lat: 39.7392, lon: -104.9903, label: "Denver" },
  settingsVersion: 6,
};

const PAGE_ERRORS: string[] = [];
const CONSOLE_ERRORS: string[] = [];

function trackErrors(page: Page) {
  page.on("pageerror", (err) => {
    PAGE_ERRORS.push(err.message);
  });
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore benign Next.js / hydration noise and failed favicon
      if (/favicon|Download the React DevTools|hydration/i.test(text)) return;
      CONSOLE_ERRORS.push(text);
    }
  });
}

async function resetSettings(request: import("@playwright/test").APIRequestContext) {
  const res = await request.put("/api/settings", { data: DEFAULT_SETTINGS });
  expect(res.ok()).toBeTruthy();
}

async function waitForDashboard(page: Page) {
  await page.goto("/");
  await expect(page.getByText("High Dashboard", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "GitHub" })).toBeVisible({
    timeout: 25_000,
  });
}

function section(page: Page, heading: string) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: heading }),
  });
}

test.describe("Battle · full desk smash", () => {
  test.setTimeout(90_000);
  test.beforeEach(async ({ request, page }) => {
    PAGE_ERRORS.length = 0;
    CONSOLE_ERRORS.length = 0;
    trackErrors(page);
    await resetSettings(request);
  });

  test.afterEach(async () => {
    expect(PAGE_ERRORS, `pageerrors: ${PAGE_ERRORS.join(" | ")}`).toEqual([]);
    // Soft: filter known third-party noise but fail on React/app crashes
    const bad = CONSOLE_ERRORS.filter(
      (t) =>
        /TypeError|ReferenceError|Cannot read|is not a function|Minified React/i.test(
          t,
        ),
    );
    expect(bad, `console errors: ${bad.join(" | ")}`).toEqual([]);
  });

  test("API surface returns sane JSON for every route", async ({ request }) => {
    const routes = [
      "/api/health",
      "/api/settings",
      "/api/github",
      "/api/canvas",
      "/api/email",
      "/api/calendar",
      "/api/host",
      "/api/links",
      "/api/notes",
      "/api/automations",
      "/api/digests",
      "/api/weather?lat=39.74&lon=-104.99&label=Denver",
      "/api/weather/search?q=Denver",
    ];
    for (const path of routes) {
      const res = await request.get(path);
      expect(res.ok(), path).toBeTruthy();
      const json = await res.json();
      expect(json).toBeTruthy();
    }

    // Weather rejects missing coords
    const badWx = await request.get("/api/weather");
    expect(badWx.status()).toBe(400);

    // Ingest loopback
    const ingest = await request.post("/api/ingest", {
      data: {
        source: "battle-test",
        kind: "digest",
        title: "Battle ingest",
        body_md: "Battle suite wired ingest.",
      },
    });
    expect(ingest.ok()).toBeTruthy();

    // Seed email feed cache so Email widget can show live-shaped data without ak_
    const emailSeed = await request.post("/api/ingest", {
      data: {
        source: "battle-test",
        kind: "email_feed",
        payload: {
          sample: false,
          configured: true,
          messages: [
            {
              id: "battle-1",
              from: "Battle Bot <battle@example.com>",
              subject: "Battle seeded inbox",
              preview: "Seeded via ingest email_feed",
              bodyText: "Seeded via ingest email_feed",
              receivedAt: new Date().toISOString(),
              unread: true,
              priority: "normal",
              htmlUrl: "https://mail.google.com/mail/u/0/#inbox/battle-1",
            },
          ],
        },
      },
    });
    expect(emailSeed.ok()).toBeTruthy();
    const email = await request.get("/api/email");
    const emailJson = await email.json();
    expect(emailJson.messages?.length).toBeGreaterThan(0);
  });

  test("settings drawer opens from header + rail and every toggle works", async ({
    page,
  }) => {
    await waitForDashboard(page);

    // Header Customize (always visible after fix)
    await page.getByRole("button", { name: "Open customization" }).first().click();
    const drawer = page.getByRole("dialog", { name: "Customize" });
    await expect(drawer).toBeVisible();

    // Theme cycle
    for (const theme of ["Light", "System", "Dark"]) {
      await drawer.getByRole("button", { name: theme, exact: true }).click();
    }

    // Accents
    for (const accent of ["#5CEE15", "#14B8A6", "#22D3EE", "#E34D08", "#D9D9DA"]) {
      await drawer.getByRole("button", { name: `Accent ${accent}` }).click();
    }

    // Density + layout
    for (const d of ["Compact", "Spacious", "Comfortable"]) {
      await drawer.getByRole("button", { name: d, exact: true }).click();
    }
    for (const l of ["Focus", "Dense", "Balanced"]) {
      await drawer.getByRole("button", { name: l, exact: true }).click();
    }

    // Toggle a widget off/on
    const emailToggle = drawer.locator("li").filter({ hasText: "Email" }).getByRole(
      "button",
      { name: /On|Off/ },
    );
    await emailToggle.click();
    await emailToggle.click();

    // Escape closes
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();

    // Re-open via rail gear (desktop)
    await page.getByRole("button", { name: "Open customization" }).last().click();
    await expect(page.getByRole("dialog", { name: "Customize" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Customize" })).toBeHidden();
  });

  test("Canvas sample has no token banner; detail sheet + dismiss path", async ({
    page,
    request,
  }) => {
    await waitForDashboard(page);

    const canvasApi = await request.get("/api/canvas");
    const canvasJson = await canvasApi.json();
    // Sample / missing should NOT show renewal banner
    if (
      canvasJson.authStatus === "token_missing" ||
      canvasJson.authStatus === "sample" ||
      canvasJson.sample
    ) {
      await expect(page.getByText("Canvas token not configured")).toHaveCount(0);
      await expect(page.getByText("Canvas token expired")).toHaveCount(0);
    }

    const canvas = section(page, "Canvas");
    const row = canvas.locator("button.row-item").first();
    if (await row.count()) {
      await row.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("a[href^='http']").first()).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
  });

  test("click every widget row / primary control", async ({ page, request }) => {
    // Ensure email cache seeded
    await request.post("/api/ingest", {
      data: {
        source: "battle-test",
        kind: "email_feed",
        payload: {
          sample: false,
          configured: true,
          messages: [
            {
              id: "battle-row",
              from: "Bot <bot@example.com>",
              subject: "Battle row mail",
              preview: "hi",
              bodyText: "hi",
              receivedAt: new Date().toISOString(),
              unread: true,
              priority: "high",
              htmlUrl: "https://mail.google.com/mail/u/0/#inbox/battle-row",
            },
          ],
        },
      },
    });

    await waitForDashboard(page);

    // GitHub rows
    const github = section(page, "GitHub");
    for (const row of await github.locator("button.row-item").all()) {
      await row.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
    }

    // Email rows (seeded)
    const email = section(page, "Email");
    await expect(email.getByText(/Battle row mail|Battle seeded/i).first()).toBeVisible({
      timeout: 15_000,
    });
    const emailRow = email.locator("button.row-item").first();
    await emailRow.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("dialog").getByRole("link", { name: /Open thread in Gmail/i }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    // Focus timer presets + start/pause/reset
    const focus = section(page, "Focus timer");
    await focus.getByRole("button", { name: "50m", exact: true }).click();
    await focus.getByRole("button", { name: "5m", exact: true }).click();
    await focus.getByRole("button", { name: "25m", exact: true }).click();
    await focus.getByRole("button", { name: "Start", exact: true }).click();
    await expect(focus.getByRole("button", { name: "Pause", exact: true })).toBeVisible({
      timeout: 5_000,
    });
    await focus.getByRole("button", { name: "Pause", exact: true }).click();
    await focus.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(focus.getByText("25:00", { exact: true })).toBeVisible();

    // Notes CRUD
    const notes = section(page, "Scratch notes");
    await notes.getByRole("button", { name: "+ New note" }).click();
    await notes.getByPlaceholder("Title").fill("Battle note");
    await notes.getByPlaceholder(/Scratch ideas/i).fill("Battle body");
    await notes.getByRole("button", { name: "Save" }).click();
    await expect(notes.getByRole("button", { name: "Battle note" })).toBeVisible();
    await notes.getByRole("button", { name: "Delete" }).click();

    // Quick links CRUD
    const links = section(page, "Quick links");
    await links.getByPlaceholder("Title").fill("Battle Link");
    await links.getByPlaceholder("https://…").fill("https://example.com/battle");
    await links.getByRole("button", { name: /^Add$/ }).click();
    await expect(links.getByText("Battle Link")).toBeVisible({ timeout: 10_000 });
    await links.getByRole("button", { name: "Delete Battle Link" }).click();
    await expect(links.getByText("Battle Link")).toHaveCount(0);

    // Briefs refresh + open digest
    const briefs = section(page, "Briefs & automations");
    await briefs.getByRole("button", { name: "Refresh briefs" }).click();
    const digestBtn = briefs.locator("button").filter({ hasText: /digest|sync|auth/i }).first();
    if (await digestBtn.count()) {
      await digestBtn.click();
      const dlg = page.getByRole("dialog");
      if (await dlg.isVisible().catch(() => false)) {
        await page.keyboard.press("Escape");
      }
    }

    // Internet speed-test control present (don't wait full 22s here)
    const net = section(page, "Internet");
    await net.scrollIntoViewIfNeeded();
    await expect(
      net.getByRole("button", { name: /Start speed test|Run speed test again|Retest|Speed test|Testing/i }).first(),
    ).toBeVisible();
  });

  test("weather city search, unit toggle, save + remove location", async ({ page }) => {
    // CI runners often cannot reach Open-Meteo — stub both weather APIs.
    await page.route("**/api/weather/search?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            {
              id: "geo-5419384",
              name: "Denver",
              admin1: "Colorado",
              country: "United States",
              lat: 39.7392,
              lon: -104.9903,
              label: "Denver, Colorado, United States",
            },
          ],
        }),
      });
    });
    await page.route("**/api/weather?**", async (route) => {
      const now = new Date();
      const hourly = Array.from({ length: 12 }, (_, i) => {
        const t = new Date(now.getTime() + i * 3600_000).toISOString();
        return {
          time: t,
          tempC: 10 + i,
          feelsLikeC: 9 + i,
          weatherCode: 1,
          precipProb: 10,
          precipMm: 0,
          windKmh: 12,
          uvIndex: 3,
        };
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          lat: 39.7392,
          lon: -104.9903,
          timezone: "America/Denver",
          label: "Denver",
          tempC: 12.5,
          feelsLikeC: 11,
          weatherCode: 1,
          humidity: 40,
          windKmh: 14,
          windDirDeg: 180,
          gustKmh: 20,
          precipMm: 0,
          cloudCover: 20,
          pressureHpa: 1015,
          visibilityKm: null,
          uvIndex: 3,
          dewPointC: 0,
          sunrise: now.toISOString(),
          sunset: now.toISOString(),
          highC: 18,
          lowC: 4,
          hourly,
          daily: [
            {
              date: now.toISOString().slice(0, 10),
              weatherCode: 1,
              highC: 18,
              lowC: 4,
              precipSumMm: 0,
              precipProbMax: 10,
              uvIndexMax: 4,
              sunrise: now.toISOString(),
              sunset: now.toISOString(),
            },
          ],
          updatedAt: now.toISOString(),
        }),
      });
    });

    await waitForDashboard(page);
    const weather = section(page, "Weather");

    await weather.getByLabel("Search weather city").fill("Denver");
    const hit = weather.locator("button.row-item").filter({ hasText: /Denver, Colorado/i }).first();
    await expect(hit).toBeVisible({ timeout: 10_000 });
    await hit.click();
    await expect(weather.locator(".stat-value")).toBeVisible({ timeout: 10_000 });

    await weather.getByRole("button", { name: "Use Celsius" }).click();
    await weather.getByRole("button", { name: "Use Fahrenheit" }).click();

    await expect(weather.getByRole("button", { name: "Denver", exact: true }).first()).toBeVisible();
    await weather.getByRole("button", { name: "Remove Denver" }).first().click();
  });

  test("Layout studio: theme packs, spans, drag reorder, toggles", async ({ page }) => {
    await page.goto("/customize");
    await expect(page.getByText(/Layout/i).first()).toBeVisible({ timeout: 20_000 });

    // Theme packs
    for (const pack of [
      "CryptoZen Lime",
      "Amber Desk",
      "Monokai Emerald",
      "Horizon Steel",
      "Obsidian Silver",
      "Daylight",
      "CryptoZen Lime",
    ]) {
      const btn = page.getByRole("button", { name: pack, exact: true });
      if (await btn.count()) await btn.click();
    }

    // Theme / density / layout buttons if present
    for (const label of ["Dark", "Light", "Compact", "Comfortable", "Focus", "Balanced", "Dense"]) {
      const btn = page.getByRole("button", { name: label, exact: true });
      if (await btn.count()) await btn.first().click();
    }

    // Span controls on first sortable row
    const span1 = page.getByRole("button", { name: /^1$/, exact: true }).first();
    const span2 = page.getByRole("button", { name: /^2$/, exact: true }).first();
    const span3 = page.getByRole("button", { name: /^3$/, exact: true }).first();
    if (await span2.count()) await span2.click();
    if (await span3.count()) await span3.click();
    if (await span1.count()) await span1.click();

    // Toggle widget via On/Off
    const toggle = page.getByRole("button", { name: /^(On|Off)$/ }).first();
    if (await toggle.count()) {
      await toggle.click();
      await toggle.click();
    }

    // Drag first handle slightly if present
    const handle = page.locator("[aria-roledescription='sortable'], button").filter({
      has: page.locator("svg"),
    }).first();
    // Prefer grab handle by cursor-grab class
    const grab = page.locator("button.cursor-grab, button[class*='cursor-grab']").first();
    if (await grab.count()) {
      const box = await grab.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 80, {
          steps: 8,
        });
        await page.mouse.up();
      }
    } else if (await handle.count()) {
      // no-op — handle optional
    }

    // Back home
    const back = page.getByRole("link", { name: /Back|Dashboard|Home/i }).first();
    if (await back.count()) {
      await back.click();
    } else {
      await page.goto("/");
    }
    await expect(page.getByText("High Dashboard", { exact: true })).toBeVisible();
  });

  test("mobile viewport: customize + core interactions", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForDashboard(page);

    const customizeBtn = page.getByRole("button", { name: "Open customization" }).first();
    await customizeBtn.click({ force: true });
    const drawer = page.getByRole("dialog", { name: "Customize" });
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(drawer).toBeHidden({ timeout: 10_000 });

    await page.getByRole("link", { name: "Layout" }).click();
    await expect(page).toHaveURL(/customize/);
    await page.goto("/");
    await expect(page.getByText("High Dashboard", { exact: true })).toBeVisible();
  });

  test("rail tooltips and Layout link", async ({ page }) => {
    await waitForDashboard(page);
    await page.getByRole("button", { name: "GitHub" }).hover();
    await page.getByRole("link", { name: "Open full layout customize page" }).click();
    await expect(page).toHaveURL(/customize/);
  });
});
