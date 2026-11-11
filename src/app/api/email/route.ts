import { NextResponse } from "next/server";
import { fetchEmail } from "@/lib/providers/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchEmail();
    return NextResponse.json(data, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "email_fetch_failed", detail: String(error), messages: [], sample: false },
      { status: 500 },
    );
  }
}
