import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isComposioConfigured } from "@/lib/composio";

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

  // Latency fallback hits this route every few seconds when Cloudflare is
  // unreachable. A live Canvas fetch here burns the API quota, and a 403
  // rate limit was shown as an expired token with an empty assignment list.
  // Live Canvas status belongs on GET /api/canvas.
  return NextResponse.json(
    {
      ok: dbOk,
      db: dbOk,
      composioConfigured: isComposioConfigured(),
      githubConfigured: Boolean(process.env.GITHUB_TOKEN?.trim()),
      canvasManualConfigured,
      canvasLive: false,
      canvasAuthStatus: null,
      emailConfigured:
        isComposioConfigured() ||
        Boolean(process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim()),
      calendarConfigured: isComposioConfigured(),
      weatherReady: true,
      uptimeSec: Math.round(process.uptime()),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
