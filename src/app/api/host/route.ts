import { NextResponse } from "next/server";
import { collectHostMetrics, sampleHostMetrics } from "@/lib/host/collect";
import { sqlRun } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = collectHostMetrics();
    sqlRun(
      `INSERT INTO metric_snapshots (source, kind, payload) VALUES (?, ?, ?)`,
      ["system", "host_metrics", JSON.stringify(metrics)],
    );
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
