"use client";

import { useCallback, useEffect, useState } from "react";
import { Gauge, Play, RefreshCw } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { Button } from "@/components/ui/button";
import {
  runFullSpeedTest,
  type SpeedPhase,
  type SpeedResult,
} from "@/lib/speedtest";
import { cn } from "@/lib/utils";

const PHASE_LABEL: Record<SpeedPhase, string> = {
  idle: "Ready when you are",
  latency: "Checking latency…",
  download: "Measuring download…",
  upload: "Measuring upload…",
  done: "Test complete",
  error: "Something went wrong",
};

function Ring({ value, max, label, unit }: { value: number | null; max: number; label: string; unit: string }) {
  const pct = value == null ? 0 : Math.min(1, value / max);
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[112px] w-[112px]">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="color-mix(in oklab, var(--muted-foreground) 22%, transparent)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className="speed-ring"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat-value text-xl font-semibold text-foreground">
            {value == null ? "—" : value}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{unit}</span>
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="stat-value mt-1 text-lg text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SpeedTestWidget() {
  const [phase, setPhase] = useState<SpeedPhase>("idle");
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = phase === "latency" || phase === "download" || phase === "upload";

  const run = useCallback(async () => {
    setError(null);
    setPhase("latency");
    const final = await runFullSpeedTest((p, partial) => {
      setPhase(p);
      setResult((prev) => ({
        latencyMs: partial.latencyMs ?? prev?.latencyMs ?? null,
        jitterMs: partial.jitterMs ?? prev?.jitterMs ?? null,
        downloadMbps: partial.downloadMbps ?? prev?.downloadMbps ?? null,
        uploadMbps: partial.uploadMbps ?? prev?.uploadMbps ?? null,
        internetPath: partial.internetPath ?? prev?.internetPath ?? false,
        probedAt: partial.probedAt ?? prev?.probedAt ?? new Date().toISOString(),
        error: partial.error,
      }));
    });
    setResult(final);
    if (final.error) {
      setError(final.error);
      setPhase("error");
    } else {
      setPhase("done");
      try {
        localStorage.setItem("hd.speed.last", JSON.stringify(final));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hd.speed.last");
      if (raw) {
        setResult(JSON.parse(raw) as SpeedResult);
        setPhase("done");
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <WidgetShell
      title="Internet speed"
      description={PHASE_LABEL[phase]}
      error={error}
      sample={result ? !result.internetPath : undefined}
      actions={
        <Button
          size="sm"
          variant={running ? "outline" : "accent"}
          disabled={running}
          onClick={() => void run()}
          aria-label={result ? "Run speed test again" : "Start speed test"}
        >
          {running ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : result ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {running ? "Testing" : result ? "Retest" : "Start"}
        </Button>
      }
    >
      {!result && phase === "idle" ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
          <Gauge className="h-8 w-8 text-[var(--accent)]" />
          <div>
            <p className="text-sm font-medium text-foreground">Measure your connection</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Runs latency, download, and upload against a public edge — not just this machine.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-around gap-4 pt-1">
            <Ring value={result?.downloadMbps ?? null} max={200} label="Download" unit="Mbps" />
            <Ring value={result?.uploadMbps ?? null} max={100} label="Upload" unit="Mbps" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Latency"
              value={result?.latencyMs != null ? `${result.latencyMs} ms` : "—"}
              hint={result?.jitterMs != null ? `Jitter ${result.jitterMs} ms` : undefined}
            />
            <Stat
              label="Path"
              value={result?.internetPath ? "Internet" : "Local"}
              hint={
                result?.internetPath
                  ? "Probed via public CDN"
                  : "Fallback to this app — not your ISP speed"
              }
            />
          </div>

          {result?.probedAt ? (
            <p
              className={cn(
                "text-[11px] text-muted-foreground",
                running && "animate-pulse",
              )}
            >
              {running
                ? PHASE_LABEL[phase]
                : `Last run · ${new Date(result.probedAt).toLocaleString()}`}
            </p>
          ) : null}
        </div>
      )}
    </WidgetShell>
  );
}
