"use client";

import { useCallback, useEffect, useState } from "react";
import { Wifi } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { Button } from "@/components/ui/button";
import type { NetworkProbe } from "@/lib/types";

export function NetworkWidget() {
  const [data, setData] = useState<NetworkProbe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const probe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const conn = (navigator as Navigator & {
        connection?: { downlink?: number; effectiveType?: string; rtt?: number };
      }).connection;

      const start = performance.now();
      const res = await fetch(`/api/settings?_=${Date.now()}`, { cache: "no-store" });
      const rttMs = performance.now() - start;
      if (!res.ok) throw new Error("Probe failed");

      const payload: NetworkProbe = {
        downlinkMbps: conn?.downlink ?? null,
        rttMs: Math.round(rttMs),
        effectiveType: conn?.effectiveType ?? null,
        online: navigator.onLine,
        probedAt: new Date().toISOString(),
        sample: conn?.downlink == null,
      };
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Probe failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void probe();
  }, [probe]);

  return (
    <WidgetShell
      title="Network"
      description="WAN latency probe"
      loading={loading && !data}
      error={error}
      sample={data?.sample}
      actions={
        <Button size="sm" variant="ghost" onClick={() => void probe()}>
          Retest
        </Button>
      }
    >
      {data ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Wifi className="h-5 w-5" />
            <span className="text-sm font-medium text-foreground">
              {data.online ? "Online" : "Offline"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">RTT</p>
              <p className="font-mono text-lg text-foreground">
                {data.rttMs != null ? `${data.rttMs} ms` : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Downlink</p>
              <p className="font-mono text-lg text-foreground">
                {data.downlinkMbps != null ? `${data.downlinkMbps} Mb/s` : "n/a"}
              </p>
            </div>
          </div>
          {data.effectiveType ? (
            <p className="text-xs text-muted-foreground">Type · {data.effectiveType}</p>
          ) : null}
        </div>
      ) : null}
    </WidgetShell>
  );
}
