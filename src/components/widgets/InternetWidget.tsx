"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  GlobeHemisphereWest,
  Play,
  Pulse,
  WifiHigh,
  WifiSlash,
} from "@phosphor-icons/react";
import { WidgetShell } from "@/components/dashboard/WidgetShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { LineWobbleLoader } from "@/components/ui/Loader";
import { SparkArea, SparkBars } from "@/components/ui/MiniCharts";
import { Button } from "@/components/ui/button";
import {
  runFullSpeedTest,
  type SpeedPhase,
  type SpeedResult,
} from "@/lib/speedtest";
import {
  connectionHints,
  probeLatency,
  pushSample,
  type LatencySample,
} from "@/lib/netmonitor";
import type { HostMetrics } from "@/lib/types";
import { cn } from "@/lib/utils";

const PHASE_LABEL: Record<SpeedPhase, string> = {
  idle: "Live link · start a full speed test anytime",
  latency: "Checking latency…",
  download: "Measuring download…",
  upload: "Measuring upload…",
  done: "Speed test complete",
  error: "Speed test failed",
};

type SpeedHistory = Array<{ t: string; down: number; up: number; ping: number }>;

/** Hide flat zeros — idle links looked broken next to speed rings. */
function LiveMbps({ mbps, sampled }: { mbps: number; sampled: boolean }) {
  const active = sampled && mbps >= 0.05;
  return (
    <>
      <p className="stat-value text-base text-foreground">
        {active ? `${mbps.toFixed(1)} Mbps` : "—"}
      </p>
      {!active ? (
        <p className="text-[11px] text-muted-foreground">waiting for traffic</p>
      ) : null}
    </>
  );
}

function ifaceRate(mbps: number | undefined): string {
  if (mbps == null || mbps < 0.05) return "—";
  return mbps.toFixed(1);
}

function Ring({
  value,
  max,
  label,
  unit,
  active,
}: {
  value: number | null;
  max: number;
  label: string;
  unit: string;
  active?: boolean;
}) {
  const pct = value == null ? 0 : Math.min(1, value / max);
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-[108px] w-[108px]">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="color-mix(in oklab, var(--muted-foreground) 22%, transparent)"
            strokeWidth="7"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            className="speed-ring"
            strokeDasharray={c}
            animate={{ strokeDashoffset: offset }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat-value text-lg font-semibold text-foreground">
            {value == null ? "—" : value}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{unit}</span>
        </div>
        {active ? (
          <motion.div
            className="absolute inset-2 rounded-full border border-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
            animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.96, 1.02, 0.96] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        ) : null}
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export function InternetWidget() {
  const [phase, setPhase] = useState<SpeedPhase>("idle");
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hostNet, setHostNet] = useState<HostMetrics["network"]>([]);
  const [latencySamples, setLatencySamples] = useState<LatencySample[]>([]);
  const [liveMs, setLiveMs] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const [hints, setHints] = useState(connectionHints());
  const [history, setHistory] = useState<SpeedHistory>([]);
  const running = phase === "latency" || phase === "download" || phase === "upload";

  const refreshHostNet = useCallback(async () => {
    try {
      const res = await fetch("/api/host", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as HostMetrics;
      setHostNet(json.network ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const pingOnce = useCallback(async () => {
    setOnline(navigator.onLine);
    setHints(connectionHints());
    const ms = await probeLatency();
    setLiveMs(ms);
    setLatencySamples((prev) => pushSample(prev, ms));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hd.speed.last");
      if (raw) {
        setResult(JSON.parse(raw) as SpeedResult);
        setPhase("done");
      }
      const hist = localStorage.getItem("hd.speed.history");
      if (hist) setHistory(JSON.parse(hist) as SpeedHistory);
    } catch {
      /* ignore */
    }
    void refreshHostNet();
    // Burst a few pings so the latency sparkline appears quickly
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 4 && !cancelled; i++) {
        await pingOnce();
        if (i < 3) await new Promise((r) => setTimeout(r, 400));
      }
    })();
    const a = window.setInterval(() => void refreshHostNet(), 2000);
    const b = window.setInterval(() => void pingOnce(), 5000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      cancelled = true;
      window.clearInterval(a);
      window.clearInterval(b);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [pingOnce, refreshHostNet]);

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
      return;
    }
    setPhase("done");
    try {
      localStorage.setItem("hd.speed.last", JSON.stringify(final));
      const entry = {
        t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        down: final.downloadMbps ?? 0,
        up: final.uploadMbps ?? 0,
        ping: final.latencyMs ?? 0,
      };
      setHistory((prev) => {
        const next = [...prev, entry].slice(-12);
        localStorage.setItem("hd.speed.history", JSON.stringify(next));
        return next;
      });
    } catch {
      /* ignore */
    }
  }, []);

  const topIfaces = useMemo(
    () =>
      [...hostNet]
        .filter((n) => n.ipv4 || (n.rxMbps ?? 0) > 0 || (n.txMbps ?? 0) > 0)
        .slice(0, 4),
    [hostNet],
  );

  const ratesSampled = topIfaces.some((n) => n.rxMbps != null || n.txMbps != null);
  const totalRx = topIfaces.reduce((s, n) => s + (n.rxMbps ?? 0), 0);
  const totalTx = topIfaces.reduce((s, n) => s + (n.txMbps ?? 0), 0);

  const latencyChart = latencySamples.map((s) => ({ t: s.t, v: s.ms }));
  const downHist = history.map((h) => ({ t: h.t, v: h.down }));
  const upHist = history.map((h) => ({ t: h.t, v: h.up }));

  return (
    <WidgetShell
      title="Internet"
      description={PHASE_LABEL[phase]}
      error={error}
      onRetry={() => void run()}
      sample={result ? !result.internetPath : undefined}
      actions={
        <Button
          size="sm"
          variant={running ? "outline" : "accent"}
          disabled={running}
          onClick={() => void run()}
          aria-label={result ? "Run speed test again" : "Start speed test"}
        >
          {running ? <Pulse className="h-3.5 w-3.5 animate-pulse" /> : <Play className="h-3.5 w-3.5" weight="fill" />}
          {running ? "Testing" : result ? "Retest" : "Speed test"}
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Live status strip */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-muted/55 px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              {online ? <WifiHigh className="h-3.5 w-3.5 text-[var(--success)]" /> : <WifiSlash className="h-3.5 w-3.5 text-[var(--danger)]" />}
              Link
            </div>
            <p className="stat-value text-base text-foreground">{online ? "Online" : "Offline"}</p>
            {hints.effectiveType ? (
              <p className="text-[11px] text-muted-foreground">{hints.effectiveType}</p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-muted/55 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Live ping</p>
            <p className="stat-value mt-1 text-base text-foreground">
              {liveMs != null ? `${liveMs} ms` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">every 5s</p>
          </div>
          <div className="rounded-2xl bg-muted/55 px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              <ArrowDown className="h-3.5 w-3.5 text-[var(--accent)]" /> Live ↓
            </div>
            <LiveMbps mbps={totalRx} sampled={ratesSampled} />
          </div>
          <div className="rounded-2xl bg-muted/55 px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              <ArrowUp className="h-3.5 w-3.5 text-[var(--accent-2)]" /> Live ↑
            </div>
            <LiveMbps mbps={totalTx} sampled={ratesSampled} />
          </div>
        </div>

        {/* Latency sparkline */}
        <div className="rounded-2xl bg-muted/40 px-3 py-2.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Latency timeline
          </p>
          {latencyChart.length > 1 ? (
            <SparkArea data={latencyChart} height={70} />
          ) : (
            <div className="flex flex-col items-center gap-1 py-1" aria-live="polite">
              <LineWobbleLoader compact />
              <p className="pb-2 text-center text-xs text-muted-foreground">
                Collecting ping samples…
              </p>
            </div>
          )}
        </div>

        {/* Interfaces */}
        {topIfaces.length ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <GlobeHemisphereWest className="h-3.5 w-3.5" /> Interfaces · live
            </div>
            <ul className="space-y-2">
              {topIfaces.map((n) => (
                <li
                  key={n.iface}
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted/35 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-foreground">{n.iface}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {n.ipv4 ?? n.ipv6 ?? "no address"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="stat-value text-xs text-[var(--accent)]">
                      ↓ {ifaceRate(n.rxMbps)}
                    </p>
                    <p className="stat-value text-xs text-[var(--accent-2)]">
                      ↑ {ifaceRate(n.txMbps)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Speed test gauges */}
        {!result && phase === "idle" ? (
          <EmptyState
            illustration="speed"
            title="Run a full speed test"
            body="Measures latency, download, and upload against a public edge — separate from live interface rates above."
            action={
              <Button size="sm" variant="accent" onClick={() => void run()}>
                <Play className="h-3.5 w-3.5" weight="fill" /> Start speed test
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-around gap-3">
              <Ring
                value={result?.downloadMbps ?? null}
                max={300}
                label="Download"
                unit="Mbps"
                active={phase === "download"}
              />
              <Ring
                value={result?.uploadMbps ?? null}
                max={150}
                label="Upload"
                unit="Mbps"
                active={phase === "upload"}
              />
              <Ring
                value={result?.latencyMs ?? null}
                max={200}
                label="Ping"
                unit="ms"
                active={phase === "latency"}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-muted/55 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Jitter</p>
                <p className="stat-value mt-1 text-lg">
                  {result?.jitterMs != null ? `${result.jitterMs} ms` : "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/55 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Path</p>
                <p className="stat-value mt-1 text-lg">
                  {result?.internetPath ? "Internet" : "Local"}
                </p>
                <p className={cn("text-[11px] text-muted-foreground")}>
                  {result?.internetPath ? "Public CDN" : "App loopback fallback"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Require ≥2 runs before chart chrome — avoid empty bar shells */}
        {history.length >= 2 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-muted/40 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Download history
              </p>
              <SparkBars data={downHist} height={72} />
            </div>
            <div className="rounded-2xl bg-muted/40 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Upload history
              </p>
              <SparkBars data={upHist} height={72} />
            </div>
          </div>
        ) : result && (phase === "done" || phase === "idle") ? (
          <p className="text-center text-xs text-muted-foreground" aria-live="polite">
            Speed history builds after 2+ tests — keep collecting…
          </p>
        ) : null}
      </div>
    </WidgetShell>
  );
}
