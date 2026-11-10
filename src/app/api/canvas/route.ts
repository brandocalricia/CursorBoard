import { NextResponse } from "next/server";
import { fetchCanvas } from "@/lib/providers/canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchCanvas();
    return NextResponse.json(data, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "canvas_fetch_failed", detail: String(error) },
      { status: 500 },
    );
  }
}
