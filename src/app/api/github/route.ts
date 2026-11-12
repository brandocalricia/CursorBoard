import { NextResponse } from "next/server";
import { fetchGitHub } from "@/lib/providers/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchGitHub();
    return NextResponse.json(data, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "github_fetch_failed", detail: String(error) },
      { status: 500 },
    );
  }
}
