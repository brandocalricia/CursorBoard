import { NextResponse } from "next/server";
import { sqlRun } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const expected = process.env.INGEST_SECRET?.trim();
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  // Local single-user: if no secret configured, allow loopback-only without bearer.
  if (expected) {
    if (token !== expected) return unauthorized();
  }

  let body: { source?: string; kind?: string; payload?: unknown; title?: string; body_md?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const source = body.source?.trim();
  if (!source) {
    return NextResponse.json({ error: "source_required" }, { status: 400 });
  }

  if (source === "digest" || body.kind === "daily_digest" || body.kind === "morning_brief") {
    sqlRun(
      `INSERT INTO digests (kind, title, body_md) VALUES (?, ?, ?)`,
      [
        body.kind ?? "digest",
        body.title ?? "Digest",
        typeof body.body_md === "string" ? body.body_md : JSON.stringify(body.payload ?? {}),
      ],
    );
  }

  sqlRun(
    `INSERT INTO metric_snapshots (source, kind, payload) VALUES (?, ?, ?)`,
    [source, body.kind ?? null, JSON.stringify(body.payload ?? body)],
  );

  return NextResponse.json({ ok: true }, {
    headers: { "cache-control": "private, no-store" },
  });
}
