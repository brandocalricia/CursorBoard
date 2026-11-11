import { expect, test, type Page } from "@playwright/test";

const DEFAULT_SETTINGS = {
  theme: "dark" as const,
    accent: "#5CEE15",
  density: "comfortable" as const,
  layoutPreset: "balanced" as const,
  enabledWidgets: ["github", "canvas", "email", "briefs", "host", "speed"],
  settingsVersion: 3,
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
    await expect(canvas.getByRole("button").first()).toBeVisible({ timeout: 20_000 });
    await canvas.getByRole("button").first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/canvas/i).first()).toBeVisible();
    await expect(dialog.locator(".prose-hd, p").first()).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Open in Canvas/i })).toBeVisible();

    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("Email row opens readable detail sheet", async ({ page }) => {
    await waitForDashboard(page);

    const email = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Email" }),
    });
    await email.getByRole("button").first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/email/i).first()).toBeVisible();
    await expect(dialog.getByText(/Office hours|pull request|workshop/i).first()).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
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
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
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
          /Checking latency|Measuring download|Measuring upload|Testing|Speed test complete|Speed test failed/i,
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

    await page.getByRole("button", { name: "Open customization" }).click();
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
    expect((await health.json()).ok).toBeTruthy();

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
    }

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
    expect(autoJson.pulses.length).toBeGreaterThanOrEqual(3);
  });
});
