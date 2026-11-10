import { NextResponse } from "next/server";
import { sqlAll } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type DigestRow = {
  id: number;
  kind: string;
  title: string;
  body_md: string;
  created_at: string;
};

export async function GET() {
  const rows = sqlAll<DigestRow>(
    `SELECT id, kind, title, body_md, created_at
     FROM digests
     ORDER BY id DESC
     LIMIT 24`,
  );
  return NextResponse.json(
    { digests: rows },
    { headers: { "cache-control": "private, no-store" } },
  );
}
