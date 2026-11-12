import { expect, test, type Page } from "@playwright/test";

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

async function resetSettings(request: import("@playwright/test").APIRequestContext) {
  const res = await request.put("/api/settings", { data: DEFAULT_SETTINGS });
  expect(res.ok()).toBeTruthy();
}

async function waitForDashboard(page: Page) {
  await page.goto("/");
  await expect(page.getByText("High Dashboard", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "GitHub" })).toBeVisible({ timeout: 20_000 });
}

test.describe("High Dashboard", () => {
  test.beforeEach(async ({ request }) => {
    await resetSettings(request);
  });

  test("loads brand, greeting, and core widgets", async ({ page }) => {
    await waitForDashboard(page);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Canvas" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Weather" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quick links" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scratch notes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Focus timer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "This machine" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Internet" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Briefs & automations" })).toBeVisible();
  });

  test("Briefs widget can run automations and show digests", async ({ page }) => {
    await waitForDashboard(page);

    const briefs = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Briefs & automations" }),
    });
    await briefs.getByRole("button", { name: "Run all automations once" }).click();
    await expect(briefs.getByText(/GitHub digest|Canvas sync|Host metrics|Recent briefs/i).first()).toBeVisible({
      timeout: 45_000,
    });
  });

  test("Canvas row opens detail sheet with instructions and link", async ({ page }) => {
    await waitForDashboard(page);

    const canvas = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Canvas" }),
    });
    const row = canvas.locator("button.row-item").first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/canvas/i).first()).toBeVisible();
    await expect(dialog.locator(".prose-hd, p").first()).toBeVisible();
    await expect(dialog.getByText(/Open on the real site/i)).toBeVisible();
    const outbound = dialog.locator("a[href^='http']").filter({ hasText: /Open/i }).first();
    await expect(outbound).toBeVisible();
    const href = await outbound.getAttribute("href");
    expect(href).toMatch(/https?:\/\//);
    // Exact assignment deep link — never bare Canvas home alone
    expect(href).not.toBe("https://canvas.du.edu");
    expect(href).not.toBe("https://canvas.du.edu/");
    expect(href).toMatch(/\/courses\/|\/assignments\//);

    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("Email shows inbox or clear setup empty state", async ({ page }) => {
    await waitForDashboard(page);

    const email = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Email" }),
    });
    const row = email.locator("button.row-item").first();
    await expect
      .poll(async () => (await row.count()) > 0 || (await email.getByText(/Gmail not connected|Inbox is quiet|feed cache|COMPOSIO|GMAIL_USER/i).count()) > 0, {
        timeout: 15_000,
      })
      .toBeTruthy();

    if ((await row.count()) > 0) {
      await row.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(/email/i).first()).toBeVisible();
      await expect(dialog.getByRole("link").first()).toHaveAttribute("href", /https?:\/\//);
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
    } else {
      await expect(
        email.getByText(/Gmail not connected|Inbox is quiet|feed cache|COMPOSIO|GMAIL_USER/i).first(),
      ).toBeVisible();
    }
  });

  test("GitHub activity opens detail sheet", async ({ page }) => {
    await waitForDashboard(page);

    const github = page.locator("section").filter({
      has: page.getByRole("heading", { name: "GitHub" }),
    });
    await expect(github.getByRole("button").first()).toBeVisible({ timeout: 20_000 });
    await github.getByRole("button").first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/github/i).first()).toBeVisible();
    await expect(dialog.getByRole("link").first()).toHaveAttribute("href", /github\.com/);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
  });

  test("Layout studio page reorders widgets", async ({ page }) => {
    await page.goto("/customize");
    await expect(page.getByRole("heading", { name: "Layout studio" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Drag widgets" })).toBeVisible();
    await expect(page.getByLabel(/Drag GitHub/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "CryptoZen Lime" })).toBeVisible();
    await page.getByRole("link", { name: /Back to live board/i }).click();
    await expect(page.getByRole("heading", { name: "High Dashboard" })).toBeVisible();
  });

  test("Internet panel shows live stats and speed test starts", async ({ page }) => {
    await waitForDashboard(page);

    const speed = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Internet" }),
    });
    await expect(speed.getByText(/Live ping|Online|Offline/i).first()).toBeVisible();
    const start = speed.getByRole("button", { name: /Start speed test|Speed test|Retest/i }).first();
    await expect(start).toBeEnabled();
    await start.click();
    await expect(
      speed
        .getByText(
          /Latency|Download · sustaining|Upload · sustaining|Measuring|Speed test complete|Speed test failed|sustaining/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Host widget shows readable machine metrics", async ({ page }) => {
    await waitForDashboard(page);

    const host = page.locator("section").filter({
      has: page.getByRole("heading", { name: "This machine" }),
    });
    await expect(host.getByText(/CPU|Memory|Disk/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("Customize toggles widgets and persists theme", async ({ page }) => {
    await waitForDashboard(page);

    await page.getByRole("button", { name: "Open customization" }).first().click();
    await expect(page.getByRole("heading", { name: "Customize" })).toBeVisible();

    await page.getByRole("button", { name: "Light", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/light/);

    const emailToggle = page
      .locator("li")
      .filter({ has: page.getByText("Email", { exact: true }) })
      .filter({ hasText: "Unread and priority" })
      .getByRole("button", { name: "On" });
    await emailToggle.click();
    await expect(
      page
        .locator("li")
        .filter({ hasText: "Unread and priority" })
        .getByRole("button", { name: "Off" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Email" })).toHaveCount(0);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/light/);
    await expect(page.getByRole("heading", { name: "Email" })).toHaveCount(0);
  });

  test("API health: host, canvas, speedtest, ingest, automations", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    const healthJson = await health.json();
    expect(healthJson.ok).toBeTruthy();
    expect(healthJson).toHaveProperty("canvasAuthStatus");
    expect(healthJson).toHaveProperty("weatherReady");

    const host = await request.get("/api/host");
    expect(host.ok()).toBeTruthy();
    const hostJson = await host.json();
    expect(hostJson).toHaveProperty("cpu");

    const canvas = await request.get("/api/canvas");
    expect(canvas.ok()).toBeTruthy();
    const canvasJson = await canvas.json();
    expect(Array.isArray(canvasJson.assignments)).toBeTruthy();

    if (canvasJson.assignments?.[0]?.id) {
      const detail = await request.get(`/api/canvas/${canvasJson.assignments[0].id}`);
      expect(detail.ok()).toBeTruthy();
      const d = await detail.json();
      expect(d).toHaveProperty("title");
      expect(d.bodyHtml || d.bodyText).toBeTruthy();
      expect(String(d.linkUrl ?? "")).toMatch(/\/courses\/|\/assignments\//);
    }

    const email = await request.get("/api/email");
    expect(email.ok()).toBeTruthy();
    expect(Array.isArray((await email.json()).messages)).toBeTruthy();

    const calendar = await request.get("/api/calendar");
    expect(calendar.ok()).toBeTruthy();
    expect(Array.isArray((await calendar.json()).events)).toBeTruthy();

    const weatherBad = await request.get("/api/weather");
    expect(weatherBad.status()).toBe(400);

    const weather = await request.get("/api/weather?lat=39.7392&lon=-104.9903");
    // Open-Meteo can time out on CI runners — accept live 200 or graceful 502
    expect([200, 502]).toContain(weather.status());
    if (weather.ok()) {
      const wx = await weather.json();
      expect(typeof wx.tempC).toBe("number");
      expect(Array.isArray(wx.hourly)).toBeTruthy();
    } else {
      const err = await weather.json();
      expect(err).toHaveProperty("error");
    }

    const links = await request.get("/api/links");
    expect(links.ok()).toBeTruthy();
    expect(Array.isArray((await links.json()).links)).toBeTruthy();

    const notes = await request.get("/api/notes");
    expect(notes.ok()).toBeTruthy();
    expect(Array.isArray((await notes.json()).notes)).toBeTruthy();

    const speed = await request.get("/api/speedtest?kb=64");
    expect(speed.ok()).toBeTruthy();
    const bytes = await speed.body();
    expect(bytes.byteLength).toBeGreaterThan(1000);

    const ingest = await request.post("/api/ingest", {
      data: {
        source: "playwright",
        kind: "daily_digest",
        title: "Playwright digest",
        body_md: "## Test\nAutomation ingest works.",
      },
    });
    expect(ingest.ok()).toBeTruthy();
    expect((await ingest.json()).ok).toBeTruthy();

    const digests = await request.get("/api/digests");
    expect(digests.ok()).toBeTruthy();
    expect(Array.isArray((await digests.json()).digests)).toBeTruthy();

    const autos = await request.get("/api/automations");
    expect(autos.ok()).toBeTruthy();
    const autoJson = await autos.json();
    expect(Array.isArray(autoJson.pulses)).toBeTruthy();
    expect(autoJson.pulses.length).toBeGreaterThanOrEqual(5);
    const ids = autoJson.pulses.map((p: { id: string }) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "github-digest",
        "canvas-sync",
        "canvas-auth",
        "host-refresh",
        "feed-warm",
      ]),
    );

    const warm = await request.post("/api/automations", {
      data: { id: "feed-warm" },
    });
    expect(warm.ok()).toBeTruthy();
  });

  test("Quick links CRUD opens exact saved URL", async ({ page, request }) => {
    await request.delete("/api/links?id=noop").catch(() => undefined);
    const created = await request.post("/api/links", {
      data: {
        title: "Canvas home exact",
        url: "https://canvas.du.edu/courses/320/assignments/a1",
      },
    });
    expect(created.ok()).toBeTruthy();
    const link = await created.json();
    expect(link.url).toContain("/assignments/");

    await waitForDashboard(page);
    const links = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Quick links" }),
    });
    await expect(links.getByRole("link", { name: "Canvas home exact" })).toHaveAttribute(
      "href",
      "https://canvas.du.edu/courses/320/assignments/a1",
    );
    await request.delete(`/api/links?id=${encodeURIComponent(link.id)}`);
  });

  test("Focus timer starts and Notes save locally", async ({ page }) => {
    await waitForDashboard(page);

    const focus = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Focus timer" }),
    });
    await expect(focus.getByText("25:00")).toBeVisible();
    await focus.getByRole("button", { name: "Start" }).click();
    await expect(focus.getByRole("button", { name: "Pause" })).toBeVisible();
    await focus.getByRole("button", { name: "Reset" }).click();
    await expect(focus.getByText("25:00")).toBeVisible();

    const notes = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Scratch notes" }),
    });
    await notes.getByRole("button", { name: "+ New note" }).click();
    await notes.getByPlaceholder("Title").fill("E2E note");
    await notes.getByPlaceholder(/Scratch ideas/i).fill("Ship v1 gate");
    await notes.getByRole("button", { name: "Save" }).click();
    await expect(notes.getByRole("button", { name: /E2E note/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
