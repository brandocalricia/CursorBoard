import { expect, test } from "@playwright/test";
import path from "node:path";

const SHOTS = "/opt/cursor/artifacts";

test.describe("Visual authorization loop", () => {
  test.beforeEach(async ({ request }) => {
    await request.put("/api/settings", {
      data: {
        theme: "dark",
        accent: "#5CEE15",
        density: "comfortable",
        layoutPreset: "balanced",
        themePack: "cryptozen",
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
        settingsVersion: 6,
      },
    });
  });

  test("full dashboard screenshot pass", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "High Dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "This machine" })).toBeVisible({
      timeout: 20_000,
    });
    // Let host history + internet ping burst settle (4× ~400ms probes)
    await page.waitForTimeout(4500);
    await expect(
      page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Internet" }) })
        .locator(".recharts-responsive-container")
        .first(),
    ).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: path.join(SHOTS, "dash-full.png"),
      fullPage: true,
    });

    // Host should not claim 100% RAM absurdly on this VM forever — assert available label exists
    const host = page.locator("section").filter({
      has: page.getByRole("heading", { name: "This machine" }),
    });
    await expect(host.getByText(/available of/i)).toBeVisible();

    // Internet live strip
    const net = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Internet" }),
    });
    await expect(net.getByText(/Live ping/i)).toBeVisible();
    await net.screenshot({ path: path.join(SHOTS, "dash-internet.png") });
    await host.screenshot({ path: path.join(SHOTS, "dash-host.png") });

    // New widgets visible
    await expect(page.getByRole("heading", { name: "Focus timer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quick links" })).toBeVisible();
    await page.screenshot({
      path: path.join(SHOTS, "dash-new-widgets.png"),
      fullPage: true,
    });

    // Open a Canvas detail for sheet visual
    const canvas = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Canvas" }),
    });
    await canvas.locator("button.row-item").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "dash-detail.png") });

    // Customize studio
    await page.goto("/customize");
    await expect(page.getByRole("heading", { name: "Layout studio" })).toBeVisible();
    await page.screenshot({
      path: path.join(SHOTS, "dash-customize.png"),
      fullPage: true,
    });
  });
});
