import { NextResponse } from "next/server";
import {
  collectHostMetrics,
  primeCpuSample,
  sampleHostMetrics,
} from "@/lib/host/collect";
import { cacheSnapshot } from "@/lib/snapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prime CPU counters so the first client poll gets a real delta.
primeCpuSample();
setInterval(() => {
  try {
    primeCpuSample();
  } catch {
    /* ignore */
  }
}, 2000).unref?.();

export async function GET() {
  try {
    const metrics = collectHostMetrics();
    cacheSnapshot("system", "host_metrics", metrics, 120);
    return NextResponse.json(metrics, {
      headers: {
        "cache-control": "private, no-store",
        "x-hd-agent": metrics.agentVersion,
      },
    });
  } catch (error) {
    const sample = sampleHostMetrics();
    return NextResponse.json(
      { ...sample, error: String(error) },
      { headers: { "cache-control": "private, no-store" } },
    );
  }
}
