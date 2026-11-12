import { NextResponse } from "next/server";
import { sqlRun } from "@/lib/db";
import { writeFeedCache } from "@/lib/feed-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIGEST_KINDS = new Set([
  "daily_digest",
  "morning_brief",
  "canvas_sync",
  "auth_check",
  "digest",
]);

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function isLoopback(request: Request): boolean {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  // App binds to 127.0.0.1 — Host is the reliable signal (Next may add x-forwarded-*).
  if (
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost") ||
    host.startsWith("[::1]")
  ) {
    return true;
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded === "127.0.0.1" ||
    forwarded === "::1" ||
    forwarded === ":ffff:127.0.0.1"
  );
}

export async function POST(request: Request) {
  const expected = process.env.INGEST_SECRET?.trim();
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (expected) {
    if (token !== expected) return unauthorized();
  } else if (!isLoopback(request)) {
    return unauthorized();
  }

  let body: {
    source?: string;
    kind?: string;
    payload?: unknown;
    title?: string;
    body_md?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const source = body.source?.trim();
  if (!source) {
    return NextResponse.json({ error: "source_required" }, { status: 400 });
  }

  const kind = body.kind ?? "event";
  if (DIGEST_KINDS.has(kind) || source === "digest") {
    sqlRun(`INSERT INTO digests (kind, title, body_md) VALUES (?, ?, ?)`, [
      kind,
      body.title ?? `${source} update`,
      typeof body.body_md === "string"
        ? body.body_md
        : JSON.stringify(body.payload ?? body),
    ]);
  }

  const payload = body.payload ?? body;

  // Email / calendar feeds can be pushed from agents or Cursor Composio syncs
  if (kind === "email_feed" && payload && typeof payload === "object") {
    writeFeedCache("email", payload);
  }
  if (kind === "calendar_feed" && payload && typeof payload === "object") {
    writeFeedCache("calendar", payload);
  }

  sqlRun(`INSERT INTO metric_snapshots (source, kind, payload) VALUES (?, ?, ?)`, [
    source,
    kind,
    JSON.stringify(payload),
  ]);

  return NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}
