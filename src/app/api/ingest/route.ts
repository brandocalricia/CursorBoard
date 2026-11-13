import { NextResponse } from "next/server";
import { sqlRun } from "@/lib/db";
import { writeFeedCache } from "@/lib/feed-cache";
import { guardLocalWrite } from "@/lib/local-write-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIGEST_KINDS = new Set([
  "daily_digest",
  "morning_brief",
  "canvas_sync",
  "auth_check",
  "digest",
]);

export async function POST(request: Request) {
  // email_feed / calendar_feed are rendered in the desk. A visited page can
  // POST text/plain JSON to 127.0.0.1 without a preflight. Require a
  // same-origin JSON call from an exact loopback Host, or INGEST_SECRET.
  const decision = guardLocalWrite(request, process.env.INGEST_SECRET);
  if (!decision.ok) {
    return NextResponse.json(
      { error: decision.error },
      { status: decision.status, headers: { "cache-control": "private, no-store" } },
    );
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
