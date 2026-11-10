import { NextResponse } from "next/server";
import { sqlAll } from "@/lib/db";
import type { HostMetrics } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = sqlAll<{ payload: string; captured_at: string }>(
    `SELECT payload, captured_at FROM metric_snapshots
     WHERE source = 'system' AND kind = 'host_metrics'
     ORDER BY id DESC LIMIT 36`,
  );

  const points = rows
    .reverse()
    .map((r) => {
      try {
        const m = JSON.parse(r.payload) as HostMetrics;
        const memPct =
          m.memory.memTotalMb > 0
            ? (m.memory.memUsedMb / m.memory.memTotalMb) * 100
            : 0;
        return {
          t: r.captured_at.slice(11, 16),
          cpu: m.cpu.usagePercent ?? 0,
          mem: Math.round(memPct * 10) / 10,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return NextResponse.json(
    { points },
    { headers: { "cache-control": "private, no-store" } },
  );
}
