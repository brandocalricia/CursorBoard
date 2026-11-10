import { NextResponse } from "next/server";
import { collectHostMetrics, sampleHostMetrics } from "@/lib/host/collect";
import { cacheSnapshot } from "@/lib/snapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = collectHostMetrics();
    cacheSnapshot("system", "host_metrics", metrics, 80);
    return NextResponse.json(metrics, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    const sample = sampleHostMetrics();
    return NextResponse.json(
      { ...sample, error: String(error) },
      { headers: { "cache-control": "private, no-store" } },
    );
  }
}
