import { NextResponse } from "next/server";
import { fetchCanvasAssignmentDetail } from "@/lib/providers/canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const detail = await fetchCanvasAssignmentDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(detail, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "canvas_detail_failed", detail: String(error) },
      { status: 500 },
    );
  }
}
