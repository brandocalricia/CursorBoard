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

  return NextResponse.json(
    {
      ok: dbOk,
      db: dbOk,
      composioConfigured: isComposioConfigured(),
      githubConfigured: Boolean(process.env.GITHUB_TOKEN?.trim()),
      canvasManualConfigured: Boolean(
        process.env.CANVAS_API_TOKEN?.trim() && process.env.CANVAS_BASE_URL?.trim(),
      ),
      uptimeSec: Math.round(process.uptime()),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
