import { NextResponse } from "next/server";
import { fetchCalendar } from "@/lib/providers/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchCalendar();
    return NextResponse.json(data, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "calendar_fetch_failed",
        detail: String(error),
        events: [],
        sample: false,
        configured: false,
      },
      { status: 500 },
    );
  }
}
