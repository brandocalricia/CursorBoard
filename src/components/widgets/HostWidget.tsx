"use client";

import { useEffect, useState } from "react";
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Thermometer,
  Battery,
  CircuitBoard,
} from "lucide-react";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import type { HostMetrics } from "@/lib/types";
import { formatBytes, formatPercent } from "@/lib/utils";

function Meter({ value, label }: { value: number | null | undefined; label: string }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{formatPercent(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, v))}%` }}
        />
      </div>
    </div>
  );
}

export function HostWidget() {
  const [data, setData] = useState<HostMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/host", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load host metrics");
        const json = (await res.json()) as HostMetrics;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const id = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const memPct =
    data && data.memory.memTotalMb > 0
      ? (data.memory.memUsedMb / data.memory.memTotalMb) * 100
      : null;

  return (
    <WidgetShell
      title="Host"
      description={
        data
          ? `${data.hostname} · ${data.os} ${data.arch}${data.partial ? " · partial" : ""}`
          : "Full machine telemetry"
      }
      loading={loading}
      error={error}
      sample={data?.source === "sample"}
    >
      {data ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Cpu className="h-3.5 w-3.5" /> CPU
              </div>
              <p className="text-sm text-foreground">{data.cpu.model}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {data.cpu.coresLogical} threads
                {data.cpu.loadAvg
                  ? ` · load ${data.cpu.loadAvg.map((n) => n.toFixed(2)).join(" / ")}`
                  : ""}
              </p>
              <Meter value={data.cpu.usagePercent} label="Utilization" />
            </div>
            <div className="space-y-3 rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <MemoryStick className="h-3.5 w-3.5" /> Memory
              </div>
              <p className="font-mono text-sm text-foreground">
                {formatBytes(data.memory.memUsedMb)} / {formatBytes(data.memory.memTotalMb)}
              </p>
              <Meter value={memPct} label="Used" />
              <p className="text-xs text-muted-foreground">
                Swap {formatBytes(data.memory.swapUsedMb)} / {formatBytes(data.memory.swapTotalMb)}
              </p>
            </div>
          </div>

          {data.disks.length ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <HardDrive className="h-3.5 w-3.5" /> Disk
              </div>
              {data.disks.slice(0, 4).map((d) => {
                const pct = d.totalGb > 0 ? (d.usedGb / d.totalGb) * 100 : 0;
                return (
                  <div key={d.mount} className="rounded-lg bg-muted/40 px-3 py-2">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-mono text-foreground">{d.mount}</span>
                      <span className="text-muted-foreground">
                        {d.usedGb.toFixed(0)} / {d.totalGb.toFixed(0)} GB
                      </span>
                    </div>
                    <Meter value={pct} label={d.fs} />
                  </div>
                );
              })}
            </div>
          ) : null}

          {data.gpus.length ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <CircuitBoard className="h-3.5 w-3.5" /> GPU
              </div>
              {data.gpus.map((g, i) => (
                <div key={`${g.name}-${i}`} className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-sm text-foreground">{g.name}</p>
                  <div className="mt-2 grid gap-2">
                    <Meter value={g.usagePercent ?? null} label="Usage" />
                    {g.vramTotalMb ? (
                      <p className="font-mono text-xs text-muted-foreground">
                        VRAM {formatBytes(g.vramUsedMb)} / {formatBytes(g.vramTotalMb)}
                        {g.tempC != null ? ` · ${g.tempC}°C` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Thermometer className="h-3.5 w-3.5" /> Thermal
              </div>
              <p className="font-mono text-sm">
                CPU {data.thermal.cpuTempC != null ? `${data.thermal.cpuTempC.toFixed(0)}°C` : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Battery className="h-3.5 w-3.5" /> Power
              </div>
              <p className="font-mono text-sm">
                {data.power.batteryPercent != null
                  ? `${data.power.batteryPercent}%${data.power.charging ? " charging" : ""}`
                  : data.power.onBattery === false
                    ? "AC power"
                    : "—"}
              </p>
            </div>
          </div>

          {data.network.length ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Interfaces
              </p>
              <ul className="space-y-1">
                {data.network.map((n) => (
                  <li key={n.iface} className="font-mono text-xs text-muted-foreground">
                    {n.iface}
                    {n.ipv4 ? ` · ${n.ipv4}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </WidgetShell>
  );
}
