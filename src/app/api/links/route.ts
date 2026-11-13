import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sqlAll, sqlGet, sqlRun } from "@/lib/db";
import { guardLocalWrite } from "@/lib/local-write-guard";
import type { QuickLink } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = sqlAll<{
    id: string;
    title: string;
    url: string;
    created_at: string;
  }>(`SELECT id, title, url, created_at FROM quick_links ORDER BY created_at DESC`);
  const links: QuickLink[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    createdAt: r.created_at,
  }));
  return NextResponse.json({ links }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const decision = guardLocalWrite(request);
  if (!decision.ok) {
    return NextResponse.json(
      { error: decision.error },
      { status: decision.status, headers: { "cache-control": "private, no-store" } },
    );
  }

  const body = (await request.json()) as { title?: string; url?: string };
  const title = body.title?.trim();
  let url = body.url?.trim();
  if (!title || !url) {
    return NextResponse.json({ error: "title_and_url_required" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    void new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }
  const id = randomUUID();
  sqlRun(`INSERT INTO quick_links (id, title, url) VALUES (?, ?, ?)`, [id, title, url]);
  const row = sqlGet<{ id: string; title: string; url: string; created_at: string }>(
    `SELECT id, title, url, created_at FROM quick_links WHERE id = ?`,
    [id],
  )!;
  return NextResponse.json(
    { id: row.id, title: row.title, url: row.url, createdAt: row.created_at },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  sqlRun(`DELETE FROM quick_links WHERE id = ?`, [id]);
  return NextResponse.json({ ok: true });
}
