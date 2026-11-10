import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serves a payload for client-side download throughput measurement. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const kb = Math.min(8192, Math.max(64, Number(url.searchParams.get("kb") ?? "1024")));
  const bytes = kb * 1024;
  const chunk = Buffer.alloc(bytes, 1);

  return new NextResponse(chunk, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(bytes),
      "cache-control": "no-store, no-cache, must-revalidate",
      "x-speedtest-bytes": String(bytes),
    },
  });
}

/** Echoes body for client-side upload throughput measurement. */
export async function POST(request: Request) {
  const buf = Buffer.from(await request.arrayBuffer());
  return NextResponse.json(
    { ok: true, bytes: buf.byteLength },
    { headers: { "cache-control": "private, no-store" } },
  );
}
