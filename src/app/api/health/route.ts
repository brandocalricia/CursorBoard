import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isComposioConfigured } from "@/lib/composio";
import { fetchCanvas } from "@/lib/providers/canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    getDb().prepare("SELECT 1").get();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const canvasManualConfigured = Boolean(
    process.env.CANVAS_API_TOKEN?.trim() && process.env.CANVAS_BASE_URL?.trim(),
  );

  let canvasLive = false;
  let canvasAuthStatus: string | undefined;
  try {
    const canvas = await fetchCanvas();
    canvasAuthStatus = canvas.authStatus;
    canvasLive = canvas.authStatus === "ok" && !canvas.sample;
  } catch {
    canvasLive = false;
  }

  return NextResponse.json(
    {
      ok: dbOk,
      db: dbOk,
      composioConfigured: isComposioConfigured(),
      githubConfigured: Boolean(process.env.GITHUB_TOKEN?.trim()),
      canvasManualConfigured,
      canvasLive,
      canvasAuthStatus,
      emailConfigured: isComposioConfigured(),
      calendarConfigured: isComposioConfigured(),
      weatherReady: true,
      uptimeSec: Math.round(process.uptime()),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
