"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BatteryCharging,
  Cpu,
  HardDrives,
  Memory,
  Thermometer,
  Timer,
  GraphicsCard,
} from "@phosphor-icons/react";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { Donut, SparkArea } from "@/components/ui/MiniCharts";
import { EmptyState } from "@/components/ui/EmptyState";
import type { HostMetrics } from "@/lib/types";
import { formatBytes, formatPercent } from "@/lib/utils";

type HistPoint = { t: string; cpu: number; mem: number };

function formatUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function HostWidget() {
  const [data, setData] = useState<HostMetrics | null>(null);
  const [history, setHistory] = useState<HistPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [hostRes, histRes] = await Promise.all([
        fetch("/api/host", { cache: "no-store" }),
        fetch("/api/host/history", { cache: "no-store" }),
      ]);
      if (!hostRes.ok) throw new Error("Failed to load host metrics");
      const json = (await hostRes.json()) as HostMetrics;
      setData(json);
      setError(null);
      setTick((t) => t + 1);
      if (histRes.ok) {
        const h = (await histRes.json()) as { points: HistPoint[] };
        setHistory(h.points ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    // Realtime: poll every 2s
    const id = window.setInterval(() => void load(true), 2000);
    return () => window.clearInterval(id);
  }, [load]);

  const memPct = useMemo(() => {
    if (!data || data.memory.memTotalMb <= 0) return 0;
    return (data.memory.memUsedMb / data.memory.memTotalMb) * 100;
  }, [data]);

  const memSeries = useMemo(
    () => history.map((p) => ({ t: p.t, v: p.mem })),
    [history],
  );
  const cpuSeries = useMemo(
    () => history.map((p) => ({ t: p.t, v: p.cpu })),
    [history],
  );

  return (
    <WidgetShell
      title="This machine"
      description={
        data
          ? `${data.hostname} · ${data.os} ${data.arch} · live ${tick > 0 ? "· 2s" : ""}`
          : "CPU, memory, disk — live"
      }
      loading={loading && !data}
      error={error}
      onRetry={() => void load(false)}
      sample={data?.source === "sample"}
      empty={!loading && !error && !data}
        emptyNode={
          <EmptyState
            illustration="server"
            title="No host telemetry yet"
            body="Metrics appear once the collector runs on this machine."
          />
        }
    >
      {data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="flex justify-center rounded-lg border border-border bg-muted/40 py-2">
              <Donut value={data.cpu.usagePercent ?? 0} label="CPU" />
            </div>
            <div className="flex justify-center rounded-lg border border-border bg-muted/40 py-2">
              <Donut value={memPct} label="RAM" />
            </div>
            <div className="col-span-2 space-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                CPU · recent
              </p>
              {cpuSeries.length > 1 ? (
                <SparkArea data={cpuSeries} height={72} />
              ) : (
                <p className="py-5 text-center text-xs text-muted-foreground">
                  Building history…
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-lg bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Cpu className="h-3.5 w-3.5" /> CPU
              </div>
              <p className="text-sm leading-snug text-foreground">{data.cpu.model}</p>
              <p className="stat-value text-xs text-muted-foreground">
                {data.cpu.coresPhysical
                  ? `${data.cpu.coresPhysical}c / ${data.cpu.coresLogical}t`
                  : `${data.cpu.coresLogical} threads`}
                {data.cpu.loadAvg
                  ? ` · load ${data.cpu.loadAvg.map((n) => n.toFixed(2)).join(" / ")}`
                  : ""}
              </p>
              <p className="stat-value text-lg text-foreground">
                {formatPercent(data.cpu.usagePercent)}
              </p>
            </div>
            <div className="space-y-2 rounded-lg bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Memory className="h-3.5 w-3.5" /> Memory
              </div>
              <p className="stat-value text-sm text-foreground">
                {formatBytes(data.memory.memUsedMb)} used
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(data.memory.memAvailableMb)} available of{" "}
                {formatBytes(data.memory.memTotalMb)}
              </p>
              <div className="meter">
                <span style={{ width: `${Math.min(100, memPct)}%` }} />
              </div>
              {data.memory.swapTotalMb > 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Swap {formatBytes(data.memory.swapUsedMb)} /{" "}
                  {formatBytes(data.memory.swapTotalMb)}
                </p>
              ) : null}
              {memSeries.length > 1 ? <SparkArea data={memSeries} height={56} /> : null}
            </div>
          </div>

          {data.disks.length ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <HardDrives className="h-3.5 w-3.5" weight="duotone" /> Disk
              </div>
              {data.disks.slice(0, 3).map((d) => {
                const pct = d.totalGb > 0 ? (d.usedGb / d.totalGb) * 100 : 0;
                return (
                  <div key={d.mount} className="rounded-xl bg-muted/35 px-3 py-2">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-mono text-foreground">{d.mount}</span>
                      <span className="text-muted-foreground">
                        {d.usedGb.toFixed(0)} / {d.totalGb.toFixed(0)} GB · {formatPercent(pct)}
                      </span>
                    </div>
                    <div className="meter">
                      <span style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {data.gpus.length ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <GraphicsCard className="h-3.5 w-3.5" /> GPU
              </div>
              {data.gpus.map((g, i) => (
                <div key={`${g.name}-${i}`} className="rounded-xl bg-muted/35 px-3 py-2">
                  <p className="text-sm text-foreground">{g.name}</p>
                  <div className="mt-2 meter">
                    <span style={{ width: `${Math.min(100, g.usagePercent ?? 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/35 px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <Thermometer className="h-3.5 w-3.5" /> Thermal
              </div>
              <p className="stat-value text-sm">
                CPU{" "}
                {data.thermal.cpuTempC != null
                  ? `${data.thermal.cpuTempC.toFixed(0)}°C`
                  : "n/a on this OS"}
              </p>
            </div>
            <div className="rounded-xl bg-muted/35 px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <BatteryCharging className="h-3.5 w-3.5" /> Power
              </div>
              <p className="stat-value text-sm">
                {data.power.batteryPercent != null
                  ? `${data.power.batteryPercent}%${data.power.charging ? " charging" : ""}`
                  : data.power.onBattery === false
                    ? "AC power"
                    : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-muted/35 px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <Timer className="h-3.5 w-3.5" /> Uptime
              </div>
              <p className="stat-value text-sm">{formatUptime(data.uptimeSec)}</p>
            </div>
          </div>

          {data.partial ? (
            <p className="text-[11px] text-muted-foreground">
              Some sensors unavailable on this OS — showing accurate reads where possible.
            </p>
          ) : null}
        </div>
      ) : null}
    </WidgetShell>
  );
}
