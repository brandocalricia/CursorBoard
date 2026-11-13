import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sqlAll, sqlGet, sqlRun } from "@/lib/db";
import { guardLocalWrite } from "@/lib/local-write-guard";
import type { NoteItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = sqlAll<{
    id: string;
    title: string;
    body: string;
    updated_at: string;
  }>(`SELECT id, title, body, updated_at FROM notes ORDER BY updated_at DESC`);
  const notes: NoteItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    updatedAt: r.updated_at,
  }));
  return NextResponse.json({ notes }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const decision = guardLocalWrite(request);
  if (!decision.ok) {
    return NextResponse.json(
      { error: decision.error },
      { status: decision.status, headers: { "cache-control": "private, no-store" } },
    );
  }

  const body = (await request.json()) as {
    id?: string;
    title?: string;
    body?: string;
  };
  const title = (body.title ?? "Untitled").trim() || "Untitled";
  const text = body.body ?? "";
  if (body.id) {
    sqlRun(
      `UPDATE notes SET title = ?, body = ?, updated_at = datetime('now') WHERE id = ?`,
      [title, text, body.id],
    );
    const row = sqlGet<{ id: string; title: string; body: string; updated_at: string }>(
      `SELECT id, title, body, updated_at FROM notes WHERE id = ?`,
      [body.id],
    );
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({
      id: row.id,
      title: row.title,
      body: row.body,
      updatedAt: row.updated_at,
    });
  }
  const id = randomUUID();
  sqlRun(`INSERT INTO notes (id, title, body) VALUES (?, ?, ?)`, [id, title, text]);
  return NextResponse.json(
    { id, title, body: text, updatedAt: new Date().toISOString() },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  sqlRun(`DELETE FROM notes WHERE id = ?`, [id]);
  return NextResponse.json({ ok: true });
}
